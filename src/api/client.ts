import axios from 'axios'
import { message } from 'antd'

const baseURL = import.meta.env.VITE_API_BASE ?? ''

export const api = axios.create({
  baseURL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail =
      err?.response?.data?.detail ??
      err?.message ??
      '请求失败'
    const text = typeof detail === 'string' ? detail : JSON.stringify(detail)
    message.error(text)
    return Promise.reject(err)
  },
)
