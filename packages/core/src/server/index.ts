import http from "node:http";
import {
  type Database,
  getPonderCheckpointTable,
  getPonderMetaTable,
} from "@/database/index.js";
import type { Common } from "@/internal/common.js";
import type { ApiBuild, Status } from "@/internal/types.js";
import { decodeCheckpoint } from "@/utils/checkpoint.js";
import { startClock } from "@/utils/timer.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";
import { streamSSE } from "hono/streaming";
import { createHttpTerminator } from "http-terminator";
import { onError } from "./error.js";

export type Server = {
  hono: Hono;
};

export async function createServer({
  common,
  database,
  apiBuild,
}: {
  common: Common;
  database: Database;
  apiBuild: ApiBuild;
}): Promise<Server> {
  const metricsMiddleware = createMiddleware(async (c, next) => {
    const matchedPathLabels = c.req.matchedRoutes
      // Filter out global middlewares
      .filter((r) => r.path !== "/*")
      .map((r) => ({ method: c.req.method, path: r.path }));

    for (const labels of matchedPathLabels) {
      common.metrics.ponder_http_server_active_requests.inc(labels);
    }
    const endClock = startClock();

    try {
      await next();
    } finally {
      const requestSize = Number(c.req.header("Content-Length") ?? 0);
      const responseSize = Number(c.res.headers.get("Content-Length") ?? 0);
      const responseDuration = endClock();
      const status =
        c.res.status >= 200 && c.res.status < 300
          ? "2XX"
          : c.res.status >= 300 && c.res.status < 400
            ? "3XX"
            : c.res.status >= 400 && c.res.status < 500
              ? "4XX"
              : "5XX";

      for (const labels of matchedPathLabels) {
        common.metrics.ponder_http_server_active_requests.dec(labels);
        common.metrics.ponder_http_server_request_size_bytes.observe(
          { ...labels, status },
          requestSize,
        );
        common.metrics.ponder_http_server_response_size_bytes.observe(
          { ...labels, status },
          responseSize,
        );
        common.metrics.ponder_http_server_request_duration_ms.observe(
          { ...labels, status },
          responseDuration,
        );
      }
    }
  });

  const stateHeadersMiddleware = createMiddleware(async (c, next) => {
    await next();

    const globalState = common.stateManager.getState();
    c.header("X-Ponder-State", globalState.phase);

    const chains = Object.values(globalState.chains);
    if (chains.length > 0) {
      const maxBlock = Math.max(...chains.map((ch) => ch.currentBlock));
      c.header("X-Ponder-Block", String(maxBlock));
    }

    c.header("X-Ponder-Timestamp", String(Math.floor(Date.now() / 1000)));
  });

  const hono = new Hono()
    .use(metricsMiddleware)
    .use(stateHeadersMiddleware)
    .use(cors({ origin: "*", maxAge: 86400 }))
    .get("/metrics", async (c) => {
      try {
        const metrics = await common.metrics.getMetrics();
        return c.text(metrics);
      } catch (error) {
        return c.json(error as Error, 500);
      }
    })
    .get("/health", (c) => {
      return c.text("", 200);
    })
    .get("/ready", async (c) => {
      const chainParam = c.req.query("chain");

      if (chainParam) {
        const chainState = common.stateManager.getChainState(chainParam);
        if (!chainState) {
          return c.text(`Unknown chain: ${chainParam}`, 404);
        }
        if (chainState.phase !== "backfilling") {
          return c.text("", 200);
        }
        return c.text(
          `Historical indexing is not complete for chain "${chainParam}".`,
          503,
        );
      }

      const isReady = await database.readonlyQB.wrap(
        { label: "select_ready" },
        (db) =>
          db
            .select()
            .from(getPonderMetaTable())
            .then((result) => result[0]!.value.is_ready === 1),
      );
      if (isReady) {
        return c.text("", 200);
      }

      return c.text("Historical indexing is not complete.", 503);
    })
    .get("/status", async (c) => {
      const globalState = common.stateManager.getState();

      const checkpoints = await database.readonlyQB.wrap(
        { label: "select_checkpoints" },
        (db) => db.select().from(getPonderCheckpointTable()),
      );

      const status: Status = {};
      const indexing: Record<
        string,
        { state: string; progress: number; eta: number | undefined }
      > = {};

      for (const { chainName, chainId, latestCheckpoint } of checkpoints.sort(
        (a, b) => (a.chainId > b.chainId ? 1 : -1),
      )) {
        const chainState = globalState.chains[chainName];
        status[chainName] = {
          id: chainId,
          block: {
            number: Number(decodeCheckpoint(latestCheckpoint).blockNumber),
            timestamp: Number(
              decodeCheckpoint(latestCheckpoint).blockTimestamp,
            ),
          },
        };
        indexing[chainName] = {
          state: chainState?.phase ?? "backfilling",
          progress: chainState?.progress ?? 0,
          eta: chainState?.eta,
        };
      }

      return c.json({
        state: globalState.phase,
        chains: status,
        indexing,
        memory: common.memoryMonitor.getSnapshot(),
      });
    })
    .get("/status/stream", (c) => {
      return streamSSE(c, async (stream) => {
        const globalState = common.stateManager.getState();
        await stream.writeSSE({
          data: JSON.stringify(globalState),
          event: "state",
        });

        const unsubscribe = common.stateManager.subscribe(async (state) => {
          try {
            await stream.writeSSE({
              data: JSON.stringify(state),
              event: "state",
            });
          } catch {
            unsubscribe();
          }
        });

        stream.onAbort(() => {
          unsubscribe();
        });

        await new Promise<void>((resolve) => {
          common.shutdown.add(resolve);
          common.apiShutdown.add(resolve);
        });
      });
    })
    .route("/", apiBuild.app)
    .onError((error, c) => onError(error, c, common));

  const endClock = startClock();

  // Create nodejs server

  const httpServer = await new Promise<http.Server>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("HTTP server failed to start within 5 seconds."));
    }, 5_000);

    const httpServer = serve(
      {
        fetch: hono.fetch,
        createServer: http.createServer,
        port: apiBuild.port,
        // Note that common.options.hostname can be undefined if the user did not specify one.
        // In this case, Node.js uses `::` if IPv6 is available and `0.0.0.0` otherwise.
        // https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
        hostname: apiBuild.hostname,
      },
      () => {
        clearTimeout(timeout);
        common.metrics.port = apiBuild.port;
        common.logger.info({
          msg: "Created HTTP server",
          port: apiBuild.port,
          hostname: apiBuild.hostname,
          duration: endClock(),
        });
        common.logger.info({
          msg: "Started returning 200 responses",
          endpoint: "/health",
        });
        resolve(httpServer as http.Server);
      },
    );
  });

  const terminator = createHttpTerminator({
    server: httpServer,
    gracefulTerminationTimeout: 1000,
  });

  common.apiShutdown.add(() => terminator.terminate());

  return { hono };
}
