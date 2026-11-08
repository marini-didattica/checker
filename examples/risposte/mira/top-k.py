"""Top-k frequent values."""

import heapq
from collections import Counter


def top_k(values: list[str], k: int) -> list[str]:
    frequencies = Counter(values)
    heap = [(-count, value) for value, count in frequencies.items()]
    heapq.heapify(heap)

    result = []
    for _ in range(min(k, len(heap))):
        _, value = heapq.heappop(heap)
        result.append(value)

    return result
