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
  input_schema?: Record<string, unknown> | null
  output_schema?: Record<string, unknown> | null
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
  model: string | null
  temperature: number | null
  config: Record<string, unknown>
  tools: ToolBrief[]
  middlewares: MiddlewareBrief[]
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
}

export interface ConversationMessages {
  thread_id: string
  methodology_id: string
  methodology_version: number
  messages: ChatMessage[]
  interrupted: boolean
  interrupt?: string | null
}

export interface ChatResponse {
  thread_id: string
  reply: string
  interrupted: boolean
  interrupt?: string | null
  methodology_id: string
  methodology_version: number
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
  bump_version?: boolean
}

export interface AgentCreate {
  name: string
  system_prompt?: string
  model?: string | null
  temperature?: number | null
  config?: Record<string, unknown>
  tool_ids?: string[]
  middleware_ids?: string[]
  id?: string
}

export interface AgentUpdate {
  name?: string
  system_prompt?: string
  model?: string | null
  temperature?: number | null
  config?: Record<string, unknown>
  tool_ids?: string[]
  middleware_ids?: string[]
}

export interface ToolCreate {
  name: string
  description?: string
  mcp: McpServerConfig
  status?: string
  id?: string
}
