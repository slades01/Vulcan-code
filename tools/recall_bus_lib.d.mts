export interface RecallItem {
  source: string
  score: number
  text: string
}

export function str(v: unknown, fallback?: string): string
export function words(v: string): Set<string>
export function scoreText(text: string, query: string): number
export function scopeTokens(scope?: string | string[] | null): string[]
export function memoryIndexTags(line: string): Set<string>
export function memoryLineMatchesScope(line: string, scope?: string | string[] | null): boolean
export function redact(text: string): string
export function excerpt(text: string, query: string, max?: number): string
export function normalizedScore(item: RecallItem): number
export function rankItems<T extends RecallItem>(items: T[], limit?: number): Array<T & { index: number; normalized: number }>
export function renderRecall(input: { query: string; budget?: number; limit?: number; items?: RecallItem[] }): string
