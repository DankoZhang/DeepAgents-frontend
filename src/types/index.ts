/** 与后端 deepagents_app.api.schemas 对齐 */

export interface ToolBrief {
  id: string
  name: string
  tool_type?: string
}

export interface MiddlewareBrief {
  id: string
  name: string
}

export interface SkillBrief {
  id: string
  name: string
  description?: string
  status?: string
}

export interface ModelBrief {
  id: string
  name: string
  provider: string
  model_name: string
  temperature?: number | null
  top_p?: number | null
  max_tokens?: number | null
  status?: string
  is_default?: boolean
}

export type ModelProvider = 'openai' | 'anthropic' | 'openai_compatible'

export interface LlmModel {
  id: string
  name: string
  provider: ModelProvider | string
  model_name: string
  base_url: string | null
  temperature: number | null
  top_p: number | null
  max_tokens: number | null
  timeout: number | null
  config: Record<string, unknown>
  status: string
  is_default: boolean
  has_api_key: boolean
  created_time: string
  updated_time: string
}

export interface LlmModelCreate {
  name: string
  provider?: ModelProvider
  model_name: string
  api_key?: string | null
  base_url?: string | null
  temperature?: number | null
  top_p?: number | null
  max_tokens?: number | null
  timeout?: number | null
  config?: Record<string, unknown>
  status?: string
  is_default?: boolean
  id?: string
}

export interface LlmModelUpdate {
  name?: string
  provider?: ModelProvider
  model_name?: string
  api_key?: string | null
  base_url?: string | null
  temperature?: number | null
  top_p?: number | null
  max_tokens?: number | null
  timeout?: number | null
  config?: Record<string, unknown>
  status?: string
  is_default?: boolean
}

export interface ModelTestRequest {
  model_id?: string | null
  provider?: ModelProvider | null
  model_name?: string | null
  api_key?: string | null
  base_url?: string | null
  temperature?: number | null
  top_p?: number | null
  max_tokens?: number | null
  timeout?: number | null
  config?: Record<string, unknown> | null
}

export interface ModelTestResult {
  ok: boolean
  message: string
  reply_preview?: string | null
}

export interface Skill {
  id: string
  name: string
  description: string
  content: string
  config: Record<string, unknown>
  status: string
  created_time: string
  updated_time: string
}

export interface SkillCreate {
  name: string
  description?: string
  content: string
  config?: Record<string, unknown>
  status?: string
  id?: string
}

export interface SkillUpdate {
  name?: string
  description?: string
  content?: string
  config?: Record<string, unknown>
  status?: string
}

export interface McpServerConfig {
  transport: 'stdio' | 'sse' | 'streamable_http'
  command?: string | null
  args?: string[]
  url?: string | null
  env?: Record<string, string>
  headers?: Record<string, string>
  include_tools?: string[] | null
}

export interface Tool {
  id: string
  name: string
  description: string
  tool_type: 'builtin' | 'mcp' | string
  class_path?: string | null
  requires_hitl?: boolean
  config: Record<string, unknown>
  status: string
}

export interface Middleware {
  id: string
  name: string
  class_path: string
  config: Record<string, unknown>
}

export interface Agent {
  id: string
  name: string
  system_prompt: string
  model_id: string | null
  config: Record<string, unknown>
  llm_model?: ModelBrief | null
  tools: ToolBrief[]
  middlewares: MiddlewareBrief[]
  skills: SkillBrief[]
}

export interface Methodology {
  id: string
  name: string
  description: string
  version: number
  status: string
  created_time: string
  updated_time: string
}

export interface MethodologyDetail extends Methodology {
  agents: Agent[]
}

export interface Conversation {
  id: string
  thread_id: string
  user_id: string | null
  methodology_id: string
  methodology_version: number
  created_time: string
}

export interface ChatMessage {
  role: string
  content: string
  name?: string | null
  tool_calls?: Array<{ id?: string; name?: string; args?: unknown }> | null
  tool_call_id?: string | null
}

export interface HitlAction {
  name?: string | null
  args?: Record<string, unknown>
  description?: string | null
}

export interface HitlInterrupt {
  id?: string | null
  actions: HitlAction[]
  raw?: unknown
}

export interface ConversationMessages {
  thread_id: string
  methodology_id: string
  methodology_version: number
  messages: ChatMessage[]
  interrupted: boolean
  interrupt?: HitlInterrupt[] | null
}

export interface ChatResponse {
  thread_id: string
  reply: string
  interrupted: boolean
  interrupt?: HitlInterrupt[] | null
  methodology_id: string
  methodology_version: number
}

export interface ChatSseHandlers {
  onMeta?: (meta: Record<string, unknown>) => void
  onToken?: (text: string) => void
  onToolStart?: (tool: { id?: string; name?: string; args?: unknown }) => void
  onToolEnd?: (tool: { id?: string; name?: string; content?: string }) => void
  onTodo?: (payload: { todos?: unknown }) => void
  onSubagent?: (name: string) => void
  onPing?: () => void
}

export interface MethodologyCreate {
  name: string
  description?: string
  id?: string
  agent_ids?: string[]
}

export interface MethodologyUpdate {
  name?: string
  description?: string
}

export interface AgentCreate {
  name: string
  system_prompt?: string
  model_id?: string | null
  config?: Record<string, unknown>
  tool_ids?: string[]
  middleware_ids?: string[]
  skill_ids?: string[]
  id?: string
}

export interface AgentUpdate {
  name?: string
  system_prompt?: string
  model_id?: string | null
  config?: Record<string, unknown>
  tool_ids?: string[]
  middleware_ids?: string[]
  skill_ids?: string[]
}

export interface ToolCreate {
  name: string
  description?: string
  mcp: McpServerConfig
  requires_hitl?: boolean
  status?: string
  id?: string
}
