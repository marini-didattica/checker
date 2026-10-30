/**
 * Binary search — a near-copy with one changed boundary.
 */
export function binarySearch(values, target) {
  let low = 0;
  let high = values.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (values[middle] === target) {
      return middle;
    }

    if (values[middle] < target) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return values[low] === target ? low : -1;
}
