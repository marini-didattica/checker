type Interval = [number, number];

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const ordered = intervals
    .map((interval) => [...interval] as Interval)
    .sort((left, right) => left[0] - right[0]);

  const output: Interval[] = [];

  for (const current of ordered) {
    const previous = output[output.length - 1];

    if (previous && current[0] <= previous[1]) {
      previous[1] = Math.max(previous[1], current[1]);
      continue;
    }

    output.push(current);
  }

  return output;
}
