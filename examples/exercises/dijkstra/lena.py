"""Shortest paths — heapq implementation, same shape as Tomas' answer."""

import heapq


def dijkstra(adjacency, source):
    dist = {vertex: float("inf") for vertex in adjacency}
    dist[source] = 0
    heap = [(0, source)]

    while heap:
        current_dist, current = heapq.heappop(heap)

        if current_dist != dist[current]:
            continue

        for next_vertex, weight in adjacency[current]:
            next_dist = current_dist + weight

            if next_dist < dist[next_vertex]:
                dist[next_vertex] = next_dist
                heapq.heappush(heap, (next_dist, next_vertex))

    return dist
