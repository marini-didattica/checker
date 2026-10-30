"""Dijkstra's algorithm with a binary heap."""

import heapq
from math import inf


def dijkstra(graph: dict[str, list[tuple[str, int]]], start: str) -> dict[str, float]:
    distances = {node: inf for node in graph}
    distances[start] = 0
    queue = [(0, start)]

    while queue:
        distance, node = heapq.heappop(queue)

        if distance > distances[node]:
            continue

        for neighbor, weight in graph[node]:
            candidate = distance + weight
            if candidate < distances[neighbor]:
                distances[neighbor] = candidate
                heapq.heappush(queue, (candidate, neighbor))

    return distances
