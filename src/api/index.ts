import { api } from './client'
import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  ChatResponse,
  Conversation,
  ConversationMessages,
  LlmModel,
  LlmModelCreate,
  LlmModelUpdate,
  Methodology,
  MethodologyCreate,
  MethodologyDetail,
  MethodologyUpdate,
  Middleware,
  ModelTestRequest,
  ModelTestResult,
  Skill,
  SkillCreate,
  SkillUpdate,
  Tool,
  ToolCreate,
} from '../types'

// ── Methodology ──────────────────────────────────────────────────────────

export const listMethodologies = () =>
  api.get<Methodology[]>('/api/methodology/list').then((r) => r.data)

export const getMethodology = (id: string) =>
  api.get<MethodologyDetail>(`/api/methodology/${id}`).then((r) => r.data)

export const createMethodology = (body: MethodologyCreate) =>
  api.post<MethodologyDetail>('/api/methodology', body).then((r) => r.data)

export const updateMethodology = (id: string, body: MethodologyUpdate) =>
  api.patch<Methodology>(`/api/methodology/${id}`, body).then((r) => r.data)

export const deleteMethodology = (id: string) =>
  api.delete(`/api/methodology/${id}`).then((r) => r.data)

export const publishMethodology = (id: string) =>
  api.post<Methodology>(`/api/methodology/${id}/publish`).then((r) => r.data)

export const bindMethodologyAgents = (
  id: string,
  agentIds: string[],
  replace = true,
) =>
  api
    .post<MethodologyDetail>(`/api/methodology/${id}/agents`, {
      agent_ids: agentIds,
      replace,
    })
    .then((r) => r.data)

export const listMethodologyVersions = (id: string) =>
  api.get(`/api/methodology/${id}/versions`).then((r) => r.data)

// ── Agent（全局）─────────────────────────────────────────────────────────

export const listAgents = (methodologyId?: string) =>
  api
    .get<Agent[]>('/api/agent/list', {
      params: methodologyId ? { methodology_id: methodologyId } : undefined,
    })
    .then((r) => r.data)

export const getAgent = (id: string) =>
  api.get<Agent>(`/api/agent/${id}`).then((r) => r.data)

export const createAgent = (body: AgentCreate) =>
  api.post<Agent>('/api/agent', body).then((r) => r.data)

export const updateAgent = (id: string, body: AgentUpdate) =>
  api.patch<Agent>(`/api/agent/${id}`, body).then((r) => r.data)

export const deleteAgent = (id: string) =>
  api.delete(`/api/agent/${id}`).then((r) => r.data)

export const bindAgentTools = (id: string, toolIds: string[], replace = true) =>
  api
    .post<Agent>(`/api/agent/${id}/tools`, { tool_ids: toolIds, replace })
    .then((r) => r.data)

export const bindAgentMiddlewares = (
  id: string,
  middlewareIds: string[],
  replace = true,
) =>
  api
    .post<Agent>(`/api/agent/${id}/middlewares`, {
      middleware_ids: middlewareIds,
      replace,
    })
    .then((r) => r.data)

export const bindAgentSkills = (
  id: string,
  skillIds: string[],
  replace = true,
) =>
  api
    .post<Agent>(`/api/agent/${id}/skills`, {
      skill_ids: skillIds,
      replace,
    })
    .then((r) => r.data)

// ── 大模型目录 ───────────────────────────────────────────────────────────

export const listModels = (params?: { status?: string }) =>
  api.get<LlmModel[]>('/api/model/list', { params }).then((r) => r.data)

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

export const listSkills = (params?: { status?: string }) =>
  api.get<Skill[]>('/api/skill/list', { params }).then((r) => r.data)

export const getSkill = (id: string) =>
  api.get<Skill>(`/api/skill/${id}`).then((r) => r.data)

export const createSkill = (body: SkillCreate) =>
  api.post<Skill>('/api/skill', body).then((r) => r.data)

export const updateSkill = (id: string, body: SkillUpdate) =>
  api.patch<Skill>(`/api/skill/${id}`, body).then((r) => r.data)

export const deleteSkill = (id: string) =>
  api.delete(`/api/skill/${id}`).then((r) => r.data)

// ── Tool / Middleware ────────────────────────────────────────────────────

export const listTools = (params?: { status?: string; tool_type?: string }) =>
  api.get<Tool[]>('/api/tool/list', { params }).then((r) => r.data)

export const createTool = (body: ToolCreate) =>
  api.post<Tool>('/api/tool', body).then((r) => r.data)

export const updateTool = (
  id: string,
  body: {
    name?: string
    description?: string
    mcp?: ToolCreate['mcp']
    requires_hitl?: boolean
    status?: string
  },
) => api.patch<Tool>(`/api/tool/${id}`, body).then((r) => r.data)

export const deleteTool = (id: string) =>
  api.delete(`/api/tool/${id}`).then((r) => r.data)

export const listMiddlewares = () =>
  api.get<Middleware[]>('/api/middleware/list').then((r) => r.data)

// ── Bootstrap（鉴权后幂等引导默认配置）──────────────────────────────────

export interface BootstrapResult {
  ok: boolean
  user_id: string
  demo_methodology_id: string
}

/** 为当前用户准备默认模型 / 工具 / demo 方法论；可重复调用。 */
export const bootstrapUser = () =>
  api.post<BootstrapResult>('/api/bootstrap').then((r) => r.data)

// ── Conversation / Chat ──────────────────────────────────────────────────

export const listConversations = (params?: {
  methodology_id?: string
  user_id?: string
  limit?: number
}) =>
  api.get<Conversation[]>('/api/conversation/list', { params }).then((r) => r.data)

export const createConversation = (body: {
  methodology_id: string
  user_id?: string
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

export const chat = (threadId: string, message: string) =>
  api
    .post<ChatResponse>('/api/chat', { thread_id: threadId, message })
    .then((r) => r.data)

export const chatResume = (threadId: string, approve: boolean) =>
  api
    .post<ChatResponse>('/api/chat/resume', { thread_id: threadId, approve })
    .then((r) => r.data)

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  try {
    const fromStorage = localStorage.getItem('auth_token')
    if (fromStorage?.trim()) {
      headers.Authorization = `Bearer ${fromStorage.trim()}`
      return headers
    }
  } catch {
    // ignore
  }
  const fromEnv = import.meta.env.VITE_AUTH_TOKEN as string | undefined
  if (fromEnv?.trim()) {
    headers.Authorization = `Bearer ${fromEnv.trim()}`
  }
  return headers
}

async function readChatSse(
  url: string,
  body: unknown,
  onToken?: (text: string) => void,
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
    if (eventName === 'token' && data && typeof data === 'object' && 'text' in data) {
      onToken?.(String((data as { text: string }).text))
    } else if (eventName === 'done' && data && typeof data === 'object') {
      donePayload = data as ChatResponse
    } else if (eventName === 'error') {
      const msg =
        data && typeof data === 'object' && 'message' in data
          ? String((data as { message: string }).message)
          : String(data)
      throw new Error(msg)
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

/** 流式聊天：边收 token 边回调，最终返回完整 ChatResponse。 */
export const chatStream = (
  threadId: string,
  message: string,
  onToken?: (text: string) => void,
) =>
  readChatSse('/api/chat/stream', { thread_id: threadId, message }, onToken)

export const chatResumeStream = (
  threadId: string,
  approve: boolean,
  onToken?: (text: string) => void,
) =>
  readChatSse(
    '/api/chat/resume/stream',
    { thread_id: threadId, approve },
    onToken,
  )
