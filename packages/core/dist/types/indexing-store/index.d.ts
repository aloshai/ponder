import type { QB } from '../database/queryBuilder.js';
import type { Common } from '../internal/common.js';
import type { Schema } from '../internal/types.js';
import type { IndexingErrorHandler, SchemaBuild } from '../internal/types.js';
import type { Db } from '../types/db.js';
import { type Column, type Table } from "drizzle-orm";
import type { IndexingCache, Row } from "./cache.js";
export type IndexingStore = {
    db: Db<Schema>;
    qb: QB;
    isProcessingEvents: boolean;
};
export declare const validateUpdateSet: (table: Table, set: Object, prev: Row, cache: Map<Table, [string, Column][]>) => void;
/** Throw an error if `table` is not an `onchainTable`. */
export declare const checkOnchainTable: (table: Table, method: "find" | "insert" | "update" | "delete") => void;
export declare const checkTableAccess: (table: Table, method: "find" | "insert" | "update" | "delete", key: object, chainId?: number) => void;
export declare const createIndexingStore: ({ common, schemaBuild: { schema }, indexingCache, indexingErrorHandler, chainId, }: {
    common: Common;
    schemaBuild: Pick<SchemaBuild, "schema">;
    indexingCache: IndexingCache;
    indexingErrorHandler: IndexingErrorHandler;
    chainId?: number | undefined;
}) => IndexingStore;
//# sourceMappingURL=index.d.ts.map