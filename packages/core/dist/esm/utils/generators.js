import { promiseWithResolvers } from './promiseWithResolvers.js';
import { Deque } from "./deque.js";
import { startClock } from "./timer.js";
/**
 * Merges multiple async generators into a single async generator.
 *
 * @param generators - The generators to merge.
 * @returns A single async generator that yields results from all input generators.
 */
export async function* mergeAsyncGenerators(generators) {
    let count = generators.length;
    const promises = generators.map((gen, index) => gen.next().then((result) => ({ index, result })));
    while (count > 0) {
        const activePromises = promises.filter((p) => p !== null);
        const { result, index } = await Promise.race(activePromises);
        if (result.done) {
            promises[index] = null;
            count--;
        }
        else {
            promises[index] = generators[index].next().then((result) => ({
                index,
                result,
            }));
            yield result.value;
        }
    }
}
/**
 * Buffers the results of an async generator.
 *
 * @param generator - The generator to buffer.
 * @param size - The size of the buffer.
 * @returns An async generator that yields results from the input generator.
 */
export async function* bufferAsyncGenerator(generator, size, bufferCallback) {
    const buffer = new Deque();
    let done = false;
    let pwr1 = promiseWithResolvers();
    let pwr2 = promiseWithResolvers();
    (async () => {
        for await (const result of generator) {
            buffer.push(result);
            bufferCallback?.(buffer.length);
            pwr1.resolve();
            if (buffer.length >= size)
                await pwr2.promise;
            pwr2 = promiseWithResolvers();
        }
        done = true;
        pwr1.resolve();
    })();
    while (done === false || buffer.length > 0) {
        if (buffer.length > 0) {
            pwr2.resolve();
            yield buffer.shift();
        }
        else {
            await pwr1.promise;
            pwr1 = promiseWithResolvers();
        }
    }
}
/**
 * Drains an async generator into an array.
 *
 * @param asyncGenerator - The async generator to drain.
 * @returns An array of results from the input generator.
 */
export async function drainAsyncGenerator(asyncGenerator) {
    const result = [];
    for await (const events of asyncGenerator) {
        result.push(events);
    }
    return result;
}
/**
 * Records the total time taken to yield results from an async generator.
 *
 * @param asyncGenerator - The async generator to record.
 * @param callback - A callback function that receives duration metrics.
 * @returns An async generator that yields results from the input generator.
 */
export async function* recordAsyncGenerator(asyncGenerator, callback) {
    let endClockTotal = startClock();
    for await (const result of asyncGenerator) {
        const endClockInner = startClock();
        yield result;
        callback({
            await: endClockTotal() - endClockInner(),
            yield: endClockInner(),
            total: endClockTotal(),
        });
        endClockTotal = startClock();
    }
}
/**
 * Creates an async generator that yields values from a callback.
 * Supports optional bounded buffering via `maxSize` — when the buffer
 * reaches `maxSize`, `callback` returns a promise that resolves once
 * the consumer drains an item (backpressure).
 */
export function createCallbackGenerator(bufferCallback, maxSize) {
    const buffer = new Deque();
    let pwr = promiseWithResolvers();
    let drainPwr;
    const callback = (value) => {
        buffer.push(value);
        bufferCallback?.(buffer.length);
        pwr.resolve();
        if (maxSize !== undefined && buffer.length >= maxSize) {
            drainPwr = promiseWithResolvers();
            return drainPwr.promise;
        }
    };
    async function* generator() {
        while (true) {
            if (buffer.length > 0) {
                yield buffer.shift();
                if (drainPwr && buffer.length < (maxSize ?? Number.POSITIVE_INFINITY)) {
                    drainPwr.resolve();
                    drainPwr = undefined;
                }
            }
            else {
                await pwr.promise;
                pwr = promiseWithResolvers();
            }
        }
    }
    return { callback, generator: generator() };
}
//# sourceMappingURL=generators.js.map