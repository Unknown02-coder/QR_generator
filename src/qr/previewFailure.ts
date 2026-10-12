export type PreviewFailure = 'capacity' | 'generation';

export function classifyPreviewFailure(error: unknown): PreviewFailure {
  const message = error instanceof Error ? error.message : String(error);
  return /too big|too long|overflow|code length/i.test(message) ? 'capacity' : 'generation';
}
