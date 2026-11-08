// LRU cache — doubly linked list plus a lookup map.
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
    this.head = new Node(null, null);
    this.tail = new Node(null, null);
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  #remove(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  #prepend(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  get(key) {
    const node = this.map.get(key);
    if (!node) return undefined;

    this.#remove(node);
    this.#prepend(node);
    return node.value;
  }

  put(key, value) {
    let node = this.map.get(key);

    if (node) {
      node.value = value;
      this.#remove(node);
      this.#prepend(node);
      return;
    }

    node = new Node(key, value);
    this.map.set(key, node);
    this.#prepend(node);

    if (this.map.size > this.capacity) {
      const oldest = this.tail.prev;
      this.#remove(oldest);
      this.map.delete(oldest.key);
    }
  }
}
