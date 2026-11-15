/** ?q= can appear more than once in a hand-typed URL; use the first. */
export function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  if (value === undefined) {
    return "";
  }
  return value;
}
