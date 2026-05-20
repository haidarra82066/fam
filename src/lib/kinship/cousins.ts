export function cousinLabel(degree: number, removed: number): string {
  if (degree <= 0) {
    if (removed === 1) return 'cousin once removed';
    return 'cousin';
  }

  const ord = (n: number) => {
    if (n === 1) return 'first';
    if (n === 2) return 'second';
    if (n === 3) return 'third';
    return `${n}th`;
  };

  if (removed === 0) return `${ord(degree)} cousin`;
  if (removed === 1) return `${ord(degree)} cousin once removed`;
  return `${ord(degree)} cousin ${removed} times removed`;
}
