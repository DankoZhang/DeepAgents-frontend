import { api, resolveAuthToken } from './client'
import { listAllByCursor, parsePage, type PageResult } from './paging'
import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  ChatResponse,
  ChatSseHandlers,
  Conversation,
  ConversationMessages,
  LlmModel,
  LlmModelCreate,
  LlmModelUpdate,
  Middleware,
  ModelTestRequest,
  ModelTestResult,
  Skill,
  SkillCreate,
  SkillUpdate,
  Tool,
  ToolCreate,
  ToolTestRequest,
  ToolTestResult,
} from '../types'

export type { PageResult } from './paging'
export { TABLE_PAGE_SIZE } from './paging'

type ListQuery = {
  limit?: number
  cursor?: string
  status?: string
  tool_type?: string
  methodology_id?: string
}

// ── Agent（全局）─────────────────────────────────────────────────────────

export const listAgents = (params?: ListQuery) =>
  api.get<Agent[]>('/api/agent/list', { params }).then(parsePage)

export const listAllAgents = (params?: Omit<ListQuery, 'limit' | 'cursor'>) =>
  listAllByCursor((cursor) => listAgents({ ...params, limit: 100, cursor }))

export const getAgent = (id: string) =>
  api.get<Agent>(`/api/agent/${id}`).then((r) => r.data)

export const createAgent = (body: AgentCreate) =>
  api.post<Agent>('/api/agent', body).then((r) => r.data)

export const updateAgent = (id: string, body: AgentUpdate) =>
  api.patch<Agent>(`/api/agent/${id}`, body).then((r) => r.data)

export const deleteAgent = (id: string) =>
  api.delete(`/api/agent/${id}`).then((r) => r.data)

export const enableAgent = (id: string) =>
  api.post<Agent>(`/api/agent/${id}/enable`).then((r) => r.data)

export const disableAgent = (id: string) =>
  api.post<Agent>(`/api/agent/${id}/disable`).then((r) => r.data)

export const copyAgent = (id: string) =>
  api.post<Agent>(`/api/agent/${id}/copy`).then((r) => r.data)

// ── 大模型目录 ───────────────────────────────────────────────────────────

export const listModels = (params?: ListQuery) =>
  api.get<LlmModel[]>('/api/model/list', { params }).then(parsePage)

export const listAllModels = (params?: Omit<ListQuery, 'limit' | 'cursor'>) =>
  listAllByCursor((cursor) => listModels({ ...params, limit: 100, cursor }))

export const getModel = (id: string) =>
  api.get<LlmModel>(`/api/model/${id}`).then((r) => r.data)

export const createModel = (body: LlmModelCreate) =>
  api.post<LlmModel>('/api/model', body).then((r) => r.data)

export const updateModel = (id: string, body: LlmModelUpdate) =>
  api.patch<LlmModel>(`/api/model/${id}`, body).then((r) => r.data)

export const deleteModel = (id: string) =>
  api.delete(`/api/model/${id}`).then((r) => r.data)

export const testModel = (body: ModelTestRequest) =>
  api.post<ModelTestResult>('/api/model/test', body).then((r) => r.data)

export const testModelById = (id: string) =>
  api.post<ModelTestResult>(`/api/model/${id}/test`).then((r) => r.data)

// ── Skill ────────────────────────────────────────────────────────────────

export const listSkills = (params?: ListQuery) =>
  api.get<Skill[]>('/api/skill/list', { params }).then(parsePage)

export const listAllSkills = (params?: Omit<ListQuery, 'limit' | 'cursor'>) =>
  listAllByCursor((cursor) => listSkills({ ...params, limit: 100, cursor }))

export const getSkill = (id: string) =>
  api.get<Skill>(`/api/skill/${id}`).then((r) => r.data)

export const createSkill = (body: SkillCreate) =>
  api.post<Skill>('/api/skill', body).then((r) => r.data)

export const copySkill = (id: string) =>
  api.post<Skill>(`/api/skill/${id}/copy`).then((r) => r.data)

export const uploadSkillPackage = (file: File, skillId?: string) => {
  const data = new FormData()
  data.append('file', file)
  const url = skillId ? `/api/skill/${skillId}/upload` : '/api/skill/upload'
  return api.post<Skill>(url, data).then((r) => r.data)
}

export const updateSkill = (id: string, body: SkillUpdate) =>
  api.patch<Skill>(`/api/skill/${id}`, body).then((r) => r.data)

export const deleteSkill = (id: string) =>
  api.delete(`/api/skill/${id}`).then((r) => r.data)

// ── Tool / Middleware ────────────────────────────────────────────────────

export const listTools = (params?: ListQuery) =>
  api.get<Tool[]>('/api/tool/list', { params }).then(parsePage)

export const listAllTools = (params?: Omit<ListQuery, 'limit' | 'cursor'>) =>
  listAllByCursor((cursor) => listTools({ ...params, limit: 100, cursor }))

export const createTool = (body: ToolCreate) =>
  api.post<Tool>('/api/tool', body).then((r) => r.data)

export const copyTool = (id: string) =>
  api.post<Tool>(`/api/tool/${id}/copy`).then((r) => r.data)

export const testTool = (body: ToolTestRequest) =>
  api.post<ToolTestResult>('/api/tool/test', body).then((r) => r.data)

export const testToolById = (id: string) =>
  api.post<ToolTestResult>(`/api/tool/${id}/test`).then((r) => r.data)

export const updateTool = (
  id: string,
  body: {
    name?: string
    description?: string
    mcp?: ToolCreate['mcp']
    http?: ToolCreate['http']
    requires_hitl?: boolean
    status?: string
  },
) => api.patch<Tool>(`/api/tool/${id}`, body).then((r) => r.data)

export const deleteTool = (id: string) =>
  api.delete(`/api/tool/${id}`).then((r) => r.data)

export const listMiddlewares = (params?: ListQuery) =>
  api.get<Middleware[]>('/api/middleware/list', { params }).then(parsePage)

export const listAllMiddlewares = () =>
  listAllByCursor((cursor) => listMiddlewares({ limit: 100, cursor }))

// ── Bootstrap（鉴权后幂等引导默认配置）──────────────────────────────────

export interface BootstrapResult {
  ok: boolean
  user_id: string
  demo_methodology_id: string
}

/** 进程内去重：StrictMode 双调用 / 重试共用同一 Promise。 */
let bootstrapInflight: Promise<BootstrapResult> | null = null

/** 为当前用户准备默认模型 / 工具 / demo 方法论；可重复调用。 */
export const bootstrapUser = () => {
  if (!bootstrapInflight) {
    bootstrapInflight = api
      .post<BootstrapResult>('/api/bootstrap')
      .then((r) => r.data)
      .finally(() => {
        // 成功后保留 resolved promise，避免刷新路由重复打；失败允许重试
      })
      .catch((err) => {
        bootstrapInflight = null
        throw err
      })
  }
  return bootstrapInflight
}

/** 测试 / 强制重试时清空去重缓存。 */
export const resetBootstrapCache = () => {
  bootstrapInflight = null
}

// ── Conversation / Chat ──────────────────────────────────────────────────

export const listConversations = (params?: {
  methodology_id?: string
  limit?: number
  cursor?: string
}) =>
  api.get<Conversation[]>('/api/conversation/list', { params }).then(parsePage)


export const createConversation = (body: {
  methodology_id: string
  thread_id?: string
}) => api.post<Conversation>('/api/conversation', body).then((r) => r.data)

export const getConversation = (threadId: string) =>
  api.get<Conversation>(`/api/conversation/${threadId}`).then((r) => r.data)

export const deleteConversation = (threadId: string) =>
  api.delete(`/api/conversation/${threadId}`).then((r) => r.data)

export const getConversationMessages = (threadId: string) =>
  api
    .get<ConversationMessages>(`/api/conversation/${threadId}/messages`)
    .then((r) => r.data)

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  const token = resolveAuthToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function readChatSse(
  url: string,
  body: unknown,
  handlers?: ChatSseHandlers,
): Promise<ChatResponse> {
  const baseURL = import.meta.env.VITE_API_BASE ?? ''
  const res = await fetch(`${baseURL}${url}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (!res.body) {
    throw new Error('响应无 body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let donePayload: ChatResponse | null = null
  let eventName = 'message'

  const flushBlock = (block: string) => {
    const lines = block.split('\n')
    let dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (!dataLines.length) return
    const raw = dataLines.join('\n')
    let data: unknown = raw
    try {
      data = JSON.parse(raw)
    } catch {
      // keep string
    }

    switch (eventName) {
      case 'meta':
        if (data && typeof data === 'object') {
          handlers?.onMeta?.(data as Record<string, unknown>)
        }
        break
      case 'token':
        if (data && typeof data === 'object' && 'text' in data) {
          handlers?.onToken?.(String((data as { text: string }).text))
        }
        break
      case 'tool_start':
        if (data && typeof data === 'object') {
          handlers?.onToolStart?.(data as { id?: string; name?: string; args?: unknown })
        }
        break
      case 'tool_end':
        if (data && typeof data === 'object') {
          handlers?.onToolEnd?.(
            data as { id?: string; name?: string; content?: string },
          )
        }
        break
      case 'todo':
        if (data && typeof data === 'object') {
          handlers?.onTodo?.(data as { todos?: unknown })
        }
        break
      case 'subagent':
        if (data && typeof data === 'object' && 'name' in data) {
          handlers?.onSubagent?.(String((data as { name: string }).name))
        }
        break
      case 'ping':
        handlers?.onPing?.()
        break
      case 'done':
        if (data && typeof data === 'object') {
          donePayload = data as ChatResponse
        }
        break
      case 'error': {
        const msg =
          data && typeof data === 'object' && 'message' in data
            ? String((data as { message: string }).message)
            : String(data)
        throw new Error(msg)
      }
      default:
        break
    }
    eventName = 'message'
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      flushBlock(block)
    }
  }
  if (buffer.trim()) flushBlock(buffer)

  if (!donePayload) {
    throw new Error('流式响应未收到 done 事件')
  }
  return donePayload
}

/** 流式聊天：边收事件边回调，最终返回完整 ChatResponse。 */
export const chatStream = (
  threadId: string,
  message: string,
  handlers?: ChatSseHandlers,
) => {
  return readChatSse('/api/chat/stream', { thread_id: threadId, message }, handlers ?? {})
}

export const chatResumeStream = (
  threadId: string,
  approve: boolean,
  handlers?: ChatSseHandlers,
) => {
  return readChatSse(
    '/api/chat/resume/stream',
    { thread_id: threadId, approve },
    handlers ?? {},
  )
}
