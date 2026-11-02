export const DISPLAY_STATUSES = ['Active', 'Sold Out', 'Returned', 'Discontinued'] as const;
export type DisplayStatus = (typeof DISPLAY_STATUSES)[number];

const known: readonly string[] = DISPLAY_STATUSES;

export function unknownStatus(statuses: string[]): string | undefined {
  return statuses.find(status => !known.includes(status));
}

// No statuses means every frame.
export function framesWithStatus<F extends { displayStatus: string }>(frames: F[], statuses: string[]): F[] {
  return statuses.length === 0 ? frames : frames.filter(frame => statuses.includes(frame.displayStatus));
}
