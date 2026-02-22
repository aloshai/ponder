export declare class Deque<T> {
    private buffer;
    private head;
    private tail;
    private count;
    constructor(initialCapacity?: number);
    get length(): number;
    push(item: T): void;
    shift(): T | undefined;
    peek(): T | undefined;
    clear(): void;
    [Symbol.iterator](): Iterator<T>;
    private grow;
}
//# sourceMappingURL=deque.d.ts.map