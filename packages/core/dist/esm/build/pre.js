import path from "node:path";
import { BuildError } from '../internal/errors.js';
export function buildPre({ config, options, logger, }) {
    // Build database.
    let databaseConfig;
    // Determine PGlite directory, preferring config.database.directory if available
    const pgliteDir = config.database?.kind === "pglite" && config.database.directory
        ? config.database.directory === "memory://"
            ? "memory://"
            : path.resolve(config.database.directory)
        : path.join(options.ponderDir, "pglite");
    if (config.database?.kind) {
        if (config.database.kind === "postgres") {
            let connectionString = undefined;
            if (config.database.connectionString) {
                connectionString = config.database.connectionString;
            }
            else if (process.env.DATABASE_PRIVATE_URL) {
                connectionString = process.env.DATABASE_PRIVATE_URL;
            }
            else if (process.env.DATABASE_URL) {
                connectionString = process.env.DATABASE_URL;
            }
            if (connectionString === undefined) {
                if (config.database.poolConfig === undefined) {
                    throw new Error("Invalid database configuration: Either 'connectionString' or 'poolConfig' must be defined.");
                }
                logger.warn({
                    msg: "No database connection string set. Using 'poolConfig' for connection authentication.",
                });
            }
            const poolConfig = {
                // Note: Override `connectionString` with `poolConfig` if available.
                connectionString,
                ...(config.database.poolConfig ?? {}),
                max: config.database.poolConfig?.max ?? 30,
                ssl: config.database.poolConfig?.ssl ?? false,
            };
            databaseConfig = { kind: "postgres", poolConfig };
        }
        else {
            databaseConfig = { kind: "pglite", options: { dataDir: pgliteDir } };
        }
    }
    else {
        let connectionString = undefined;
        if (process.env.DATABASE_PRIVATE_URL) {
            connectionString = process.env.DATABASE_PRIVATE_URL;
        }
        else if (process.env.DATABASE_URL) {
            connectionString = process.env.DATABASE_URL;
        }
        // If either of the DATABASE_URL env vars are set, use Postgres.
        if (connectionString !== undefined) {
            const poolConfig = { connectionString, max: 30 };
            databaseConfig = { kind: "postgres", poolConfig };
        }
        else {
            // Fall back to PGlite.
            databaseConfig = { kind: "pglite", options: { dataDir: pgliteDir } };
        }
    }
    return {
        databaseConfig,
        ordering: config.ordering ?? "multichain",
    };
}
export function safeBuildPre({ config, options, logger, }) {
    try {
        const result = buildPre({ config, options, logger });
        return {
            status: "success",
            databaseConfig: result.databaseConfig,
            ordering: result.ordering,
        };
    }
    catch (_error) {
        const buildError = new BuildError(_error.message);
        buildError.stack = undefined;
        return { status: "error", error: buildError };
    }
}
//# sourceMappingURL=pre.js.map