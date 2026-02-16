import type { Chain } from "@/internal/types.js";
import { promiseWithResolvers } from "@/utils/promiseWithResolvers.js";

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
  setChainProgress: (
    chainName: string,
    update: {
      currentBlock?: number;
      targetBlock?: number;
      eta?: number;
    },
  ) => void;
  subscribe: (listener: StateManagerListener) => () => void;
  waitForPhase: (phase: IndexingPhase) => Promise<void>;
  initializeChains: (chains: Chain[]) => void;
};

export const createStateManager = (): StateManager => {
  const listeners = new Set<StateManagerListener>();
  const phaseWaiters = new Map<
    IndexingPhase,
    ReturnType<typeof promiseWithResolvers<void>>[]
  >();

  const state: GlobalState = {
    phase: "backfilling",
    chains: {},
  };

  const computeGlobalPhase = (): IndexingPhase => {
    const chainStates = Object.values(state.chains);
    if (chainStates.length === 0) return "backfilling";
    if (chainStates.every((c) => c.phase === "complete")) return "complete";
    if (chainStates.some((c) => c.phase === "backfilling")) return "backfilling";
    return "realtime";
  };

  const computeProgress = (chain: ChainState): number => {
    const total = chain.targetBlock - chain.startBlock;
    if (total <= 0) return 1;
    const done = chain.currentBlock - chain.startBlock;
    return Math.min(Math.max(done / total, 0), 1);
  };

  const notify = () => {
    const snapshot = getState();
    for (const listener of listeners) {
      listener(snapshot);
    }
  };

  const resolvePhaseWaiters = (phase: IndexingPhase) => {
    const waiters = phaseWaiters.get(phase);
    if (waiters) {
      for (const waiter of waiters) {
        waiter.resolve();
      }
      phaseWaiters.delete(phase);
    }
  };

  const getState = (): GlobalState => ({
    phase: state.phase,
    chains: { ...state.chains },
  });

  const getChainState = (chainName: string): ChainState | undefined => {
    return state.chains[chainName];
  };

  const setChainPhase = (chainName: string, phase: IndexingPhase) => {
    const chain = state.chains[chainName];
    if (!chain) return;

    chain.phase = phase;
    if (phase === "complete") {
      chain.progress = 1;
      chain.eta = undefined;
    }

    const prevGlobal = state.phase;
    state.phase = computeGlobalPhase();

    if (prevGlobal !== state.phase) {
      resolvePhaseWaiters(state.phase);
    }

    notify();
  };

  const setChainProgress = (
    chainName: string,
    update: {
      currentBlock?: number;
      targetBlock?: number;
      eta?: number;
    },
  ) => {
    const chain = state.chains[chainName];
    if (!chain) return;

    if (update.currentBlock !== undefined) chain.currentBlock = update.currentBlock;
    if (update.targetBlock !== undefined) chain.targetBlock = update.targetBlock;
    if (update.eta !== undefined) chain.eta = update.eta;

    chain.progress = computeProgress(chain);
    notify();
  };

  const subscribe = (listener: StateManagerListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const waitForPhase = (phase: IndexingPhase): Promise<void> => {
    if (state.phase === phase) return Promise.resolve();
    const pwr = promiseWithResolvers<void>();
    const existing = phaseWaiters.get(phase) ?? [];
    existing.push(pwr);
    phaseWaiters.set(phase, existing);
    return pwr.promise;
  };

  const initializeChains = (chains: Chain[]) => {
    for (const chain of chains) {
      state.chains[chain.name] = {
        id: chain.id,
        name: chain.name,
        phase: "backfilling",
        currentBlock: 0,
        targetBlock: 0,
        startBlock: 0,
        progress: 0,
        eta: undefined,
        startedAt: Date.now(),
      };
    }
    state.phase = computeGlobalPhase();
  };

  return {
    getState,
    getChainState,
    setChainPhase,
    setChainProgress,
    subscribe,
    waitForPhase,
    initializeChains,
  };
};
