"""Two Sum — one-pass hash map."""

from typing import List


def two_sum(nums: List[int], target: int) -> List[int]:
    seen: dict[int, int] = {}

    for index, value in enumerate(nums):
        complement = target - value
        if complement in seen:
            return [seen[complement], index]
        seen[value] = index

    raise ValueError("no solution")
