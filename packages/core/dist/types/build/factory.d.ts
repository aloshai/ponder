import type { Factory as FactoryConfig } from '../config/address.js';
import type { LogFactory } from '../internal/types.js';
export declare function buildLogFactory({ chainId, sourceId, fromBlock, toBlock, ...factoryConfig }: {
    chainId: number;
    sourceId: string;
    fromBlock: number | undefined;
    toBlock: number | undefined;
} & Omit<FactoryConfig, "startBlock" | "endBlock">): LogFactory;
//# sourceMappingURL=factory.d.ts.map