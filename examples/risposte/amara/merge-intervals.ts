type Interval = [number, number];

/**
 * Merge overlapping intervals.
 * Time: O(n log n) · Space: O(n)
 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length < 2) return intervals.map((interval) => [...interval]);

  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Interval[] = [sorted[0]];

  for (const [start, end] of sorted.slice(1)) {
    const last = merged[merged.length - 1];

    if (start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}
