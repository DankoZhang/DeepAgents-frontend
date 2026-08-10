import axios from 'axios'
import { message } from 'antd'

const baseURL = import.meta.env.VITE_API_BASE ?? ''

export const api = axios.create({
  baseURL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

/** 生产鉴权：优先 localStorage，其次环境变量 VITE_AUTH_TOKEN */
function resolveAuthToken(): string | null {
  try {
    const fromStorage = localStorage.getItem('auth_token')
    if (fromStorage?.trim()) return fromStorage.trim()
  } catch {
    // SSR / 隐私模式等
  }
  const fromEnv = import.meta.env.VITE_AUTH_TOKEN as string | undefined
  return fromEnv?.trim() || null
}

api.interceptors.request.use((config) => {
  const token = resolveAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status as number | undefined
    const url = String(err?.config?.url ?? '')
    // 会话详情/消息 404 由 ChatPage 自行回退列表，避免全局 toast 刷屏
    const isConversationMiss =
      status === 404 && /\/api\/conversation\/[^/]+/.test(url)
    if (!isConversationMiss) {
      const detail =
        err?.response?.data?.detail ??
        err?.message ??
        '请求失败'
      const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
      message.error(text)
    }
    return Promise.reject(err)
  },
)
