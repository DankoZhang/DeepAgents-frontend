import type { AxiosResponse } from 'axios'

/** 与后端 X-Total-Count / X-Next-Cursor 对齐的一页结果。 */
export type PageResult<T> = {
  items: T[]
  total: number
  nextCursor: string | null
}

export const TABLE_PAGE_SIZE = 10

export function parsePage<T>(res: AxiosResponse<T[]>): PageResult<T> {
  const totalRaw = res.headers['x-total-count']
  const nextRaw = res.headers['x-next-cursor']
  const total = Number(totalRaw)
  return {
    items: res.data,
    total: Number.isFinite(total) ? total : res.data.length,
    nextCursor: typeof nextRaw === 'string' && nextRaw ? nextRaw : null,
  }
}

/** 用 cursor 循环拉完全部页（下拉选项等需要全量时用）。 */
export async function listAllByCursor<T>(
  fetchPage: (cursor?: string) => Promise<PageResult<T>>,
  maxPages = 100,
): Promise<T[]> {
  const out: T[] = []
  let cursor: string | undefined
  for (let i = 0; i < maxPages; i++) {
    const page = await fetchPage(cursor)
    out.push(...page.items)
    if (!page.nextCursor) break
    cursor = page.nextCursor
  }
  return out
}
