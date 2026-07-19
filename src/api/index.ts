import { api } from './client'
import type {
  Agent,
  AgentCreate,
  AgentUpdate,
  ChatResponse,
  Conversation,
  ConversationMessages,
  Methodology,
  MethodologyCreate,
  MethodologyDetail,
  MethodologyUpdate,
  Middleware,
  Tool,
} from '../types'

// ── Methodology ──────────────────────────────────────────────────────────

export const listMethodologies = () =>
  api.get<Methodology[]>('/api/methodology/list').then((r) => r.data)

export const getMethodology = (id: string) =>
  api.get<MethodologyDetail>(`/api/methodology/${id}`).then((r) => r.data)

export const createMethodology = (body: MethodologyCreate) =>
  api.post<Methodology>('/api/methodology', body).then((r) => r.data)

export const updateMethodology = (id: string, body: MethodologyUpdate) =>
  api.patch<Methodology>(`/api/methodology/${id}`, body).then((r) => r.data)

export const deleteMethodology = (id: string) =>
  api.delete(`/api/methodology/${id}`).then((r) => r.data)

export const publishMethodology = (id: string) =>
  api.post<Methodology>(`/api/methodology/${id}/publish`).then((r) => r.data)

export const listMethodologyVersions = (id: string) =>
  api.get(`/api/methodology/${id}/versions`).then((r) => r.data)

// ── Agent ────────────────────────────────────────────────────────────────

export const listAgents = (methodologyId: string) =>
  api
    .get<Agent[]>('/api/agent/list', { params: { methodology_id: methodologyId } })
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

// ── Tool / Middleware ────────────────────────────────────────────────────

export const listTools = (status?: string) =>
  api
    .get<Tool[]>('/api/tool/list', { params: status ? { status } : undefined })
    .then((r) => r.data)

export const listMiddlewares = () =>
  api.get<Middleware[]>('/api/middleware/list').then((r) => r.data)

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
