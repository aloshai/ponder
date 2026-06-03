import type { PGlite } from "@electric-sql/pglite";
import { type Table } from "drizzle-orm";
import type pg from "pg";
type Row = Record<string, unknown>;
export declare const getCopyText: (table: Table, rows: Row[]) => string;
export declare const executeCopy: (dialect: "pglite" | "postgres", client: PGlite | pg.Pool | pg.PoolClient, target: string, text: string) => Promise<void>;
export declare const getQuotedColumnList: (table: Table) => string;
export declare const getQualifiedTableName: (table: Table) => string;
export {};
//# sourceMappingURL=copy.d.ts.map