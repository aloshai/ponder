import type { IndexingCache } from '../indexing-store/cache.js';
import type { IndexingStore } from '../indexing-store/index.js';
import type { CachedViemClient } from './client.js';
import type { Common } from '../internal/common.js';
import type { Chain, Event, IndexingBuild, IndexingErrorHandler, Schema, SetupEvent } from '../internal/types.js';
import type { Db } from '../types/db.js';
import type { Block, Trace, Transaction, TransactionReceipt } from '../types/eth.js';
import type { DeepPartial } from '../types/utils.js';
import type { Abi, Address } from "viem";
import type { ReadonlyClient } from "./client.js";
declare global {
    var DISABLE_EVENT_PROXY: boolean;
}
export type IndexingState = {
    phase: "backfilling" | "realtime" | "complete";
    progress: Record<string, {
        phase: "backfilling" | "realtime" | "complete";
        progress: number;
        currentBlock: number;
        targetBlock: number;
        eta: number | undefined;
    }>;
};
export type Context = {
    chain: {
        id: number;
        name: string;
    };
    client: ReadonlyClient;
    db: Db<Schema>;
    contracts: Record<string, {
        abi: Abi;
        address?: Address | readonly Address[];
        startBlock?: number;
        endBlock?: number;
    }>;
    state: IndexingState;
};
export type Indexing = {
    processSetupEvents: () => Promise<void>;
    processHistoricalEvents: (params: {
        events: Event[];
        updateIndexingSeconds: (event: Event, chain: Chain) => void;
    }) => Promise<void>;
    processRealtimeEvents: (params: {
        events: Event[];
    }) => Promise<void>;
};
export declare const getEventCount: (indexingFunctions: IndexingBuild["indexingFunctions"]) => {
    [eventName: string]: number;
};
export type ColumnAccessProfile = {
    block: Set<keyof Block>;
    trace: Set<keyof Trace>;
    transaction: Set<keyof Transaction>;
    transactionReceipt: Set<keyof TransactionReceipt>;
    resolved: boolean;
    count: number;
};
export type ColumnAccessPattern = Map<string, ColumnAccessProfile>;
export declare const createColumnAccessPattern: ({ indexingBuild, }: {
    indexingBuild: Pick<IndexingBuild, "indexingFunctions">;
}) => ColumnAccessPattern;
export declare const createIndexing: ({ common, indexingBuild: { eventCallbacks, setupCallbacks, chains, contracts, indexingFunctions, }, indexingStore, indexingCache, client, indexingErrorHandler, columnAccessPattern, eventCount, }: {
    common: Common;
    indexingBuild: Pick<IndexingBuild, "eventCallbacks" | "setupCallbacks" | "chains" | "contracts" | "indexingFunctions">;
    indexingStore: IndexingStore;
    indexingCache: IndexingCache;
    client: CachedViemClient;
    indexingErrorHandler: IndexingErrorHandler;
    columnAccessPattern: ColumnAccessPattern;
    eventCount: {
        [eventName: string]: number;
    };
}) => Indexing;
export declare const createEventProxy: <T extends Block | Transaction | TransactionReceipt | Trace>(columnAccessPattern: ColumnAccessPattern, type: "block" | "trace" | "transaction" | "transactionReceipt", indexingErrorHandler: IndexingErrorHandler, resetFilterInclude: (eventName: string) => void) => {
    proxy: T;
    underlying: T;
    eventName: string;
};
export declare const toErrorMeta: (event: DeepPartial<Event> | DeepPartial<SetupEvent>) => string | undefined;
export declare const addErrorMeta: (error: unknown, meta: string | undefined) => void;
//# sourceMappingURL=index.d.ts.map