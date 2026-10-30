"""Two Sum — Jonas' version."""

from typing import List


def two_sum(nums: List[int], target: int) -> List[int]:
    lookup = {}

    for i in range(len(nums)):
        needed = target - nums[i]

        if needed in lookup:
            return [lookup[needed], i]

        lookup[nums[i]] = i

    return []
