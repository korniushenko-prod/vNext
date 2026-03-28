export function sortedKeys<T>(record: Record<string, T>): string[] {
  return Object.keys(record).sort((left, right) => left.localeCompare(right));
}