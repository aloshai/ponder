import type { Chain } from './types.js';
export type IndexingPhase = "backfilling" | "realtime" | "complete";
export type ChainState = {
    id: number;
    name: string;
    phase: IndexingPhase;
    currentBlock: number;
    targetBlock: number;
    startBlock: number;
    progress: number;
    eta: number | undefined;
    startedAt: number;
};
export type GlobalState = {
    phase: IndexingPhase;
    chains: Record<string, ChainState>;
};
export type StateManagerListener = (state: GlobalState) => void;
export type StateManager = {
    getState: () => GlobalState;
    getChainState: (chainName: string) => ChainState | undefined;
    setChainPhase: (chainName: string, phase: IndexingPhase) => void;
    setChainProgress: (chainName: string, update: {
        currentBlock?: number;
        targetBlock?: number;
        eta?: number;
    }) => void;
    subscribe: (listener: StateManagerListener) => () => void;
    waitForPhase: (phase: IndexingPhase) => Promise<void>;
    initializeChains: (chains: Chain[]) => void;
};
export declare const createStateManager: () => StateManager;
//# sourceMappingURL=state.d.ts.map