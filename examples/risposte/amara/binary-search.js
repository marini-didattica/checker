/**
 * Binary search — recursive implementation.
 */
export function binarySearch(values, target, low = 0, high = values.length - 1) {
  if (low > high) return -1;

  const middle = Math.floor((low + high) / 2);

  if (values[middle] === target) {
    return middle;
  }

  if (values[middle] < target) {
    return binarySearch(values, target, middle + 1, high);
  }

  return binarySearch(values, target, low, middle - 1);
}
