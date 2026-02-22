const MIN_CAPACITY = 16;

export class Deque<T> {
  private buffer: (T | undefined)[];
  private head: number;
  private tail: number;
  private count: number;

  constructor(initialCapacity = MIN_CAPACITY) {
    const capacity = Math.max(nextPowerOfTwo(initialCapacity), MIN_CAPACITY);
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  get length(): number {
    return this.count;
  }

  push(item: T): void {
    if (this.count === this.buffer.length) {
      this.grow();
    }
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) & (this.buffer.length - 1);
    this.count++;
  }

  shift(): T | undefined {
    if (this.count === 0) return undefined;
    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) & (this.buffer.length - 1);
    this.count--;
    return item;
  }

  peek(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buffer[this.head];
  }

  clear(): void {
    this.buffer = new Array(MIN_CAPACITY);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  *[Symbol.iterator](): Iterator<T> {
    let idx = this.head;
    for (let i = 0; i < this.count; i++) {
      yield this.buffer[idx] as T;
      idx = (idx + 1) & (this.buffer.length - 1);
    }
  }

  private grow(): void {
    const newCapacity = this.buffer.length * 2;
    const newBuffer = new Array<T | undefined>(newCapacity);
    for (let i = 0; i < this.count; i++) {
      newBuffer[i] = this.buffer[(this.head + i) & (this.buffer.length - 1)];
    }
    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this.count;
  }
}

function nextPowerOfTwo(n: number): number {
  let v = n - 1;
  v |= v >> 1;
  v |= v >> 2;
  v |= v >> 4;
  v |= v >> 8;
  v |= v >> 16;
  return v + 1;
}
