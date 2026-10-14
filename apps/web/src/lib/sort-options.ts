const serbianCollator = new Intl.Collator('sr-Latn', {
  sensitivity: 'base',
  numeric: true,
});

/** Returns a sorted copy, using the same label that is visible in a picker. */
export const sortAlphabetically = <T>(items: readonly T[], label: (item: T) => string): T[] =>
  [...items].sort((left, right) =>
    serbianCollator.compare(label(left).trim(), label(right).trim()),
  );
