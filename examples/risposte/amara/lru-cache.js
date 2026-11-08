/**
 * LRU cache backed by a Map (insertion order = recency order).
 */
export class LRUCache {
  #capacity;
  #entries = new Map();

  constructor(capacity) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("capacity must be a positive integer");
    }
    this.#capacity = capacity;
  }

  get(key) {
    if (!this.#entries.has(key)) return undefined;

    const value = this.#entries.get(key);
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.#entries.has(key)) this.#entries.delete(key);
    this.#entries.set(key, value);

    if (this.#entries.size > this.#capacity) {
      const oldest = this.#entries.keys().next().value;
      this.#entries.delete(oldest);
    }
  }
}
