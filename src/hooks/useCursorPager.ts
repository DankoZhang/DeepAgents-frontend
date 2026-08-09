import { useCallback, useEffect, useRef, useState } from 'react'
import type { TablePaginationConfig } from 'antd'
import {
  TABLE_PAGE_SIZE,
  type PageResult,
} from '../api/paging'

type FetchPage<T> = (args: {
  limit: number
  cursor?: string
}) => Promise<PageResult<T>>

/**
 * Ant Design Table + 后端 keyset cursor。
 *
 * - 用 X-Total-Count 显示总页数
 * - 翻页带 cursor；回退用已缓存的每页游标
 * - 跳到尚未访问过的页时，会先顺序探测中间页的 nextCursor（丢弃中间数据）
 */
export function useCursorPager<T>(fetchPage: FetchPage<T>, deps: unknown[] = []) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  /** page(1-based) → 请求该页时要用的 cursor；第 1 页为 undefined */
  const cursorForPage = useRef<Map<number, string | undefined>>(
    new Map([[1, undefined]]),
  )
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage

  const ensureCursor = async (targetPage: number): Promise<number> => {
    let reachable = targetPage
    while (!cursorForPage.current.has(reachable)) {
      // 找小于 reachable 的最大已知页
      let known = 1
      for (const k of cursorForPage.current.keys()) {
        if (k < reachable && k >= known) known = k
      }
      const probe = await fetchRef.current({
        limit: TABLE_PAGE_SIZE,
        cursor: cursorForPage.current.get(known),
      })
      if (!probe.nextCursor) {
        reachable = known
        break
      }
      cursorForPage.current.set(known + 1, probe.nextCursor)
      if (known + 1 >= reachable) break
      // 继续从 known+1 往前探
      if (!cursorForPage.current.has(known + 1)) break
    }
    return cursorForPage.current.has(targetPage) ? targetPage : reachable
  }

  const loadPage = useCallback(async (pageNum: number) => {
    setLoading(true)
    try {
      const target = await ensureCursor(Math.max(1, pageNum))
      const res = await fetchRef.current({
        limit: TABLE_PAGE_SIZE,
        cursor: cursorForPage.current.get(target),
      })
      setItems(res.items)
      setTotal(res.total)
      setPage(target)
      if (res.nextCursor) {
        cursorForPage.current.set(target + 1, res.nextCursor)
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const reload = useCallback(async () => {
    cursorForPage.current = new Map([[1, undefined]])
    await loadPage(1)
  }, [loadPage])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  const pagination: TablePaginationConfig = {
    current: page,
    pageSize: TABLE_PAGE_SIZE,
    total,
    showSizeChanger: false,
    showTotal: (t) => `共 ${t} 条`,
    onChange: (p) => {
      void loadPage(p)
    },
  }

  return { items, loading, pagination, reload, page, total }
}
