import type { Logger } from "./logger.js";
export type MemoryPressure = "normal" | "elevated" | "critical";
export type MemorySnapshot = {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
    pressure: MemoryPressure;
    utilizationPct: number;
};
export type MemoryMonitorOptions = {
    intervalMs?: number;
    elevatedThresholdPct?: number;
    criticalThresholdPct?: number;
    maxHeapMB?: number;
};
export type MemoryMonitor = {
    getSnapshot: () => MemorySnapshot;
    getPressure: () => MemoryPressure;
    onPressureChange: (listener: (pressure: MemoryPressure) => void) => () => void;
    start: () => void;
    stop: () => void;
};
export declare function createMemoryMonitor(logger: Logger, options?: MemoryMonitorOptions): MemoryMonitor;
//# sourceMappingURL=memory.d.ts.map