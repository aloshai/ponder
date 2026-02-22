import { SQLWrapper, QueryWithTypings } from 'drizzle-orm';
export { SQL, and, asc, avg, avgDistinct, between, count, countDistinct, desc, eq, exists, gt, gte, ilike, inArray, isNotNull, isNull, like, lt, lte, max, min, ne, not, notBetween, notExists, notIlike, notInArray, notLike, or, relations, sql, sum, sumDistinct } from 'drizzle-orm';
import { PgRemoteDatabase } from 'drizzle-orm/pg-proxy';
export { alias, except, exceptAll, intersect, intersectAll, union, unionAll } from 'drizzle-orm/pg-core';

type Schema = {
    [name: string]: unknown;
};
type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
type Status = {
    [chainName: string]: {
        id: number;
        block: {
            number: number;
            timestamp: number;
        };
    };
};
type ClientDb<schema extends Schema = Schema> = Prettify<Omit<PgRemoteDatabase<schema>, "insert" | "update" | "delete" | "transaction" | "refreshMaterializedView" | "_">>;
type Client<schema extends Schema = Schema> = {
    /** Query the database. */
    db: ClientDb<schema>;
    /**
     * Subscribe to live updates.
     *
     * @param queryFn - The query to subscribe to.
     * @param onData - The callback to call with each new query result
     * @param onError - The callback to call when an error occurs.
     *
     * @example
     * ```ts
     * import { createClient } from "@ponder/client";
     * import * as schema from "../ponder.schema";
     *
     * const client = createClient("https://.../sql", { schema });
     *
     * client.live(
     *   (db) => db.select().from(schema.account),
     *   (result) => console.log(result),
     *   (error) => console.error(error),
     * );
     * ```
     */
    live: <result>(queryFn: (db: ClientDb<schema>) => Promise<result>, onData: (result: result) => void, onError?: (error: Error) => void) => {
        unsubscribe: () => void;
    };
    /** Get the status of all chains. */
    getStatus: () => Promise<Status>;
};
declare const compileQuery: (query: SQLWrapper) => QueryWithTypings;
/**
 * Create a client for querying Ponder apps.
 *
 * @param baseUrl - The URL of the Ponder app.
 * @param schema - The schema of the Ponder app.
 *
 * @example
 * ```ts
 * import { createClient } from "@ponder/client";
 * import * as schema from "../ponder.schema";
 *
 * const client = createClient("https://.../sql", { schema });
 * ```
 */
declare const createClient: <schema extends Schema>(baseUrl: string, params?: {
    schema?: schema | undefined;
}) => Client<schema>;

declare const setDatabaseSchema: <T extends {
    [name: string]: unknown;
}>(schema: T, schemaName: string) => void;

export { type Client, type Status, compileQuery, createClient, setDatabaseSchema };
