"""Return the k most frequent values, using a heap."""

import heapq
from collections import Counter


def top_k(values: list[str], k: int) -> list[str]:
    if k <= 0:
        return []

    counts = Counter(values)
    most_common = heapq.nlargest(k, counts.items(), key=lambda item: item[1])
    return [value for value, _ in most_common]
