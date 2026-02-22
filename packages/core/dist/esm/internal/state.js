import { promiseWithResolvers } from '../utils/promiseWithResolvers.js';
export const createStateManager = () => {
    const listeners = new Set();
    const phaseWaiters = new Map();
    const state = {
        phase: "backfilling",
        chains: {},
    };
    const computeGlobalPhase = () => {
        const chainStates = Object.values(state.chains);
        if (chainStates.length === 0)
            return "backfilling";
        if (chainStates.every((c) => c.phase === "complete"))
            return "complete";
        if (chainStates.some((c) => c.phase === "backfilling"))
            return "backfilling";
        return "realtime";
    };
    const computeProgress = (chain) => {
        const total = chain.targetBlock - chain.startBlock;
        if (total <= 0)
            return 1;
        const done = chain.currentBlock - chain.startBlock;
        return Math.min(Math.max(done / total, 0), 1);
    };
    const notify = () => {
        const snapshot = getState();
        for (const listener of listeners) {
            listener(snapshot);
        }
    };
    const resolvePhaseWaiters = (phase) => {
        const waiters = phaseWaiters.get(phase);
        if (waiters) {
            for (const waiter of waiters) {
                waiter.resolve();
            }
            phaseWaiters.delete(phase);
        }
    };
    const getState = () => ({
        phase: state.phase,
        chains: { ...state.chains },
    });
    const getChainState = (chainName) => {
        return state.chains[chainName];
    };
    const setChainPhase = (chainName, phase) => {
        const chain = state.chains[chainName];
        if (!chain)
            return;
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
    const setChainProgress = (chainName, update) => {
        const chain = state.chains[chainName];
        if (!chain)
            return;
        if (update.currentBlock !== undefined)
            chain.currentBlock = update.currentBlock;
        if (update.targetBlock !== undefined)
            chain.targetBlock = update.targetBlock;
        if (update.eta !== undefined)
            chain.eta = update.eta;
        chain.progress = computeProgress(chain);
        notify();
    };
    const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };
    const waitForPhase = (phase) => {
        if (state.phase === phase)
            return Promise.resolve();
        const pwr = promiseWithResolvers();
        const existing = phaseWaiters.get(phase) ?? [];
        existing.push(pwr);
        phaseWaiters.set(phase, existing);
        return pwr.promise;
    };
    const initializeChains = (chains) => {
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
//# sourceMappingURL=state.js.map