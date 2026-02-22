// src/index.ts
import {
  Column,
  SQL,
  Table,
  is,
  isTable,
  mapRelationalRow
} from "drizzle-orm";
import { isPgEnum } from "drizzle-orm/pg-core";
import { PgCountBuilder } from "drizzle-orm/pg-core/query-builders/count";
import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query";
import { PgRaw } from "drizzle-orm/pg-core/query-builders/raw";
import { drizzle } from "drizzle-orm/pg-proxy";
import { TypedQueryBuilder } from "drizzle-orm/query-builders/query-builder";
import { EventSource } from "eventsource";
import superjson from "superjson";
import {
  sql,
  eq,
  gt,
  gte,
  lt,
  lte,
  ne,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  exists,
  notExists,
  between,
  notBetween,
  like,
  notLike,
  ilike,
  notIlike,
  not,
  asc,
  desc,
  and,
  or,
  count,
  countDistinct,
  avg,
  avgDistinct,
  sum,
  sumDistinct,
  max,
  min,
  relations,
  SQL as SQL2
} from "drizzle-orm";
import {
  alias,
  union,
  unionAll,
  intersect,
  intersectAll,
  except,
  exceptAll
} from "drizzle-orm/pg-core";
var getUrl = (baseUrl, method, query) => {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname}/${method}`;
  if (query) {
    url.searchParams.set("sql", superjson.stringify(query));
  }
  return url;
};
var noopDatabase = drizzle(() => Promise.resolve({ rows: [] }), {
  casing: "snake_case"
});
var dialect = noopDatabase.dialect;
var compileQuery = (query) => {
  return dialect.sqlToQuery(query.getSQL());
};
var createClient = (baseUrl, params = {}) => {
  const client = {
    db: drizzle(
      async (sql2, params2, method, typings) => {
        const builtQuery = { sql: sql2, params: params2, typings };
        const response = await fetch(getUrl(baseUrl, "db", builtQuery), {
          method: "GET"
        });
        if (response.ok === false) {
          const error = new Error(await response.text());
          error.stack = void 0;
          throw error;
        }
        const result = await response.json();
        if (method === "all") {
          return {
            ...result,
            rows: result.rows.map((row) => Object.values(row))
          };
        }
        return result;
      },
      { schema: params.schema, casing: "snake_case" }
    ),
    live: (queryFn, onData, onError) => {
      const noopDatabase2 = drizzle(() => Promise.resolve({ rows: [] }), {
        schema: params.schema,
        casing: "snake_case"
      });
      const queryPromise = queryFn(noopDatabase2);
      if ("getSQL" in queryPromise === false) {
        throw new Error(
          '"queryFn" must return SQL. You may have to remove `.execute()` from your query.'
        );
      }
      const queryBuilder = queryPromise;
      const query = compileQuery(queryBuilder);
      const sse = new EventSource(getUrl(baseUrl, "live", query));
      const onDataListener = async (event) => {
        try {
          const result = JSON.parse(event.data);
          const drizzleShim = drizzle(
            (_, __, method) => {
              if (method === "all") {
                return Promise.resolve({
                  ...result,
                  rows: result.rows.map((row) => Object.values(row))
                });
              }
              return Promise.resolve(result);
            },
            { schema: params.schema }
          );
          let data;
          if (queryBuilder instanceof TypedQueryBuilder) {
            const fields = queryBuilder._.selectedFields;
            const orderedFields = orderSelectedFields(fields);
            data = await drizzleShim._.session.prepareQuery(
              query,
              // @ts-ignore
              orderedFields,
              void 0,
              false
            ).execute();
          } else if (queryBuilder instanceof PgRelationalQuery) {
            const selection = queryBuilder._toSQL().query.selection;
            data = await drizzleShim._.session.prepareQuery(
              query,
              void 0,
              void 0,
              true,
              (rawRows, mapColumnValue) => {
                const rows = rawRows.map(
                  (row) => mapRelationalRow(
                    // @ts-ignore
                    queryBuilder.schema,
                    // @ts-ignore
                    queryBuilder.tableConfig,
                    // @ts-ignore
                    row,
                    selection,
                    mapColumnValue
                  )
                );
                if (queryBuilder.mode === "first") {
                  return rows[0];
                }
                return rows;
              }
            ).execute();
          } else if (queryBuilder instanceof PgRaw) {
            data = await drizzleShim._.session.prepareQuery(query, void 0, void 0, false).execute();
          } else if (queryBuilder instanceof PgCountBuilder) {
            data = await drizzleShim._.session.count(queryBuilder.getSQL());
          } else {
            throw new Error("Unsupported query builder");
          }
          onData(data);
        } catch (error) {
          onError?.(error);
        }
      };
      const onErrorListener = (_event) => {
        onError?.(new Error("server disconnected"));
      };
      sse.addEventListener("message", onDataListener);
      sse.addEventListener("error", onErrorListener);
      return {
        unsubscribe: () => {
          sse.removeEventListener("message", onDataListener);
          sse.removeEventListener("error", onErrorListener);
          sse.close();
        }
      };
    },
    getStatus: async () => {
      const response = await fetch(`${new URL(baseUrl).origin}/status`);
      return response.json();
    }
  };
  return client;
};
var setDatabaseSchema = (schema, schemaName) => {
  for (const table of Object.values(schema)) {
    if (isTable(table)) {
      table[Table.Symbol.Schema] = schemaName;
    } else if (isPgEnum(table)) {
      table.schema = schemaName;
    }
  }
};
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce(
    (result, [name, field]) => {
      if (typeof name !== "string") {
        return result;
      }
      const newPath = pathPrefix ? [...pathPrefix, name] : [name];
      if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased)) {
        result.push({ path: newPath, field });
      } else if (is(field, Table)) {
        result.push(
          ...orderSelectedFields(field[Table.Symbol.Columns], newPath)
        );
      } else {
        result.push(
          ...orderSelectedFields(field, newPath)
        );
      }
      return result;
    },
    []
  );
}
export {
  SQL2 as SQL,
  alias,
  and,
  asc,
  avg,
  avgDistinct,
  between,
  compileQuery,
  count,
  countDistinct,
  createClient,
  desc,
  eq,
  except,
  exceptAll,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  intersect,
  intersectAll,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  max,
  min,
  ne,
  not,
  notBetween,
  notExists,
  notIlike,
  notInArray,
  notLike,
  or,
  relations,
  setDatabaseSchema,
  sql,
  sum,
  sumDistinct,
  union,
  unionAll
};
//# sourceMappingURL=index.js.map