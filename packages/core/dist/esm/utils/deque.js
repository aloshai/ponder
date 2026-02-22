const MIN_CAPACITY = 16;
export class Deque {
    constructor(initialCapacity = MIN_CAPACITY) {
        Object.defineProperty(this, "buffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "head", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "tail", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "count", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        const capacity = Math.max(nextPowerOfTwo(initialCapacity), MIN_CAPACITY);
        this.buffer = new Array(capacity);
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }
    get length() {
        return this.count;
    }
    push(item) {
        if (this.count === this.buffer.length) {
            this.grow();
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) & (this.buffer.length - 1);
        this.count++;
    }
    shift() {
        if (this.count === 0)
            return undefined;
        const item = this.buffer[this.head];
        this.buffer[this.head] = undefined;
        this.head = (this.head + 1) & (this.buffer.length - 1);
        this.count--;
        return item;
    }
    peek() {
        if (this.count === 0)
            return undefined;
        return this.buffer[this.head];
    }
    clear() {
        this.buffer = new Array(MIN_CAPACITY);
        this.head = 0;
        this.tail = 0;
        this.count = 0;
    }
    *[Symbol.iterator]() {
        let idx = this.head;
        for (let i = 0; i < this.count; i++) {
            yield this.buffer[idx];
            idx = (idx + 1) & (this.buffer.length - 1);
        }
    }
    grow() {
        const newCapacity = this.buffer.length * 2;
        const newBuffer = new Array(newCapacity);
        for (let i = 0; i < this.count; i++) {
            newBuffer[i] = this.buffer[(this.head + i) & (this.buffer.length - 1)];
        }
        this.buffer = newBuffer;
        this.head = 0;
        this.tail = this.count;
    }
}
function nextPowerOfTwo(n) {
    let v = n - 1;
    v |= v >> 1;
    v |= v >> 2;
    v |= v >> 4;
    v |= v >> 8;
    v |= v >> 16;
    return v + 1;
}
//# sourceMappingURL=deque.js.map