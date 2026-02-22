const toMB = (bytes) => Math.round((bytes / 1024 / 1024) * 100) / 100;
export function createMemoryMonitor(logger, options = {}) {
    const { intervalMs = 5000, elevatedThresholdPct = 70, criticalThresholdPct = 85, maxHeapMB = getMaxHeapMB(), } = options;
    let timer;
    let currentPressure = "normal";
    const listeners = new Set();
    const getSnapshot = () => {
        const mem = process.memoryUsage();
        const heapUsedMB = toMB(mem.heapUsed);
        const heapTotalMB = toMB(mem.heapTotal);
        const utilizationPct = maxHeapMB > 0
            ? Math.round((heapUsedMB / maxHeapMB) * 100)
            : Math.round((mem.heapUsed / mem.heapTotal) * 100);
        let pressure = "normal";
        if (utilizationPct >= criticalThresholdPct)
            pressure = "critical";
        else if (utilizationPct >= elevatedThresholdPct)
            pressure = "elevated";
        return {
            heapUsedMB,
            heapTotalMB,
            rssMB: toMB(mem.rss),
            externalMB: toMB(mem.external),
            pressure,
            utilizationPct,
        };
    };
    const tick = () => {
        const snapshot = getSnapshot();
        const prev = currentPressure;
        if (snapshot.pressure !== prev) {
            currentPressure = snapshot.pressure;
            if (snapshot.pressure === "critical") {
                logger.warn({
                    msg: `Memory pressure: critical (${snapshot.utilizationPct}% of ${maxHeapMB}MB max heap, ${snapshot.heapUsedMB}MB used)`,
                });
            }
            else if (snapshot.pressure === "elevated") {
                logger.warn({
                    msg: `Memory pressure: elevated (${snapshot.utilizationPct}% of ${maxHeapMB}MB max heap, ${snapshot.heapUsedMB}MB used)`,
                });
            }
            else if (prev !== "normal") {
                logger.info({
                    msg: `Memory pressure: normal (${snapshot.utilizationPct}%, ${snapshot.heapUsedMB}MB used)`,
                });
            }
            for (const listener of listeners) {
                listener(snapshot.pressure);
            }
        }
    };
    return {
        getSnapshot,
        getPressure: () => currentPressure,
        onPressureChange: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start: () => {
            if (timer)
                return;
            timer = setInterval(tick, intervalMs);
            timer.unref();
        },
        stop: () => {
            if (timer) {
                clearInterval(timer);
                timer = undefined;
            }
            listeners.clear();
        },
    };
}
function getMaxHeapMB() {
    try {
        const v8 = require("node:v8");
        const stats = v8.getHeapStatistics();
        return toMB(stats.heap_size_limit);
    }
    catch {
        return 4096;
    }
}
//# sourceMappingURL=memory.js.map