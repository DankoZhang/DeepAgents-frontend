import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Alert,
  Button,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage, Conversation, HitlInterrupt } from '../types'
import {
  chatResumeStream,
  chatStream,
  getConversation,
  getConversationMessages,
} from '../api'

type ToolActivity = {
  id: string
  name: string
  status: 'running' | 'done'
  args?: unknown
  content?: string
}

function bubbleStyle(role: string): CSSProperties {
  const isUser = role === 'user'
  return {
    maxWidth: '80%',
    alignSelf: isUser ? 'flex-end' : 'flex-start',
    background: isUser ? '#1677ff' : '#f5f5f5',
    color: isUser ? '#fff' : 'rgba(0,0,0,0.88)',
    padding: '10px 14px',
    borderRadius: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    marginBottom: 12,
  }
}

function formatInterrupt(items: HitlInterrupt[] | null | undefined): string {
  if (!items?.length) return '危险工具等待人工确认'
  const lines: string[] = []
  for (const item of items) {
    if (item.actions?.length) {
      for (const action of item.actions) {
        const name = action.name || 'unknown'
        const desc = action.description ? ` — ${action.description}` : ''
        const args =
          action.args && Object.keys(action.args).length
            ? `\n  参数: ${JSON.stringify(action.args)}`
            : ''
        lines.push(`• ${name}${desc}${args}`)
      }
    } else if (item.raw != null) {
      lines.push(
        typeof item.raw === 'string' ? item.raw : JSON.stringify(item.raw),
      )
    }
  }
  return lines.join('\n') || '危险工具等待人工确认'
}

export default function ChatPage() {
  const { threadId = '' } = useParams()
  const navigate = useNavigate()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interrupted, setInterrupted] = useState(false)
  const [interrupt, setInterrupt] = useState<HitlInterrupt[] | null>(null)
  const [tools, setTools] = useState<ToolActivity[]>([])
  const [activeSubagent, setActiveSubagent] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const load = useCallback(async () => {
    if (!threadId) return
    setLoading(true)
    try {
      const [c, hist] = await Promise.all([
        getConversation(threadId),
        getConversationMessages(threadId),
      ])
      setConv(c)
      setMessages(
        hist.messages.filter((m) => m.role === 'user' || m.role === 'assistant'),
      )
      setInterrupted(hist.interrupted)
      setInterrupt(hist.interrupt ?? null)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      // 清库 / 删除后旧 URL 会 404，回到会话列表避免反复打无效 thread
      if (status === 404) {
        message.warning('会话不存在或已失效，已返回列表')
        navigate('/conversations', { replace: true })
        return
      }
      throw err
    } finally {
      setLoading(false)
    }
  }, [threadId, navigate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    scrollToBottom()
  }, [messages, interrupted, tools, activeSubagent])

  const appendToken = (piece: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant') {
        const copy = prev.slice()
        copy[copy.length - 1] = {
          ...last,
          content: last.content + piece,
        }
        return copy
      }
      return [...prev, { role: 'assistant', content: piece }]
    })
  }

  const applyChatResult = (
    reply: string,
    interruptedFlag: boolean,
    interruptItems?: HitlInterrupt[] | null,
  ) => {
    setInterrupted(interruptedFlag)
    setInterrupt(interruptItems ?? null)
    if (!reply) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === 'assistant') {
        const copy = prev.slice()
        copy[copy.length - 1] = { ...last, content: reply }
        return copy
      }
      return [...prev, { role: 'assistant', content: reply }]
    })
  }

  const streamHandlers = {
    onToken: appendToken,
    onToolStart: (tool: { id?: string; name?: string; args?: unknown }) => {
      const id = tool.id || `${tool.name || 'tool'}-${Date.now()}`
      setTools((prev) => [
        ...prev.filter((t) => t.id !== id),
        {
          id,
          name: tool.name || 'tool',
          status: 'running',
          args: tool.args,
        },
      ])
    },
    onToolEnd: (tool: { id?: string; name?: string; content?: string }) => {
      setTools((prev) => {
        const id = tool.id
        if (id) {
          return prev.map((t) =>
            t.id === id
              ? { ...t, status: 'done', content: tool.content }
              : t,
          )
        }
        const lastRunning = [...prev].reverse().find((t) => t.status === 'running')
        if (!lastRunning) return prev
        return prev.map((t) =>
          t.id === lastRunning.id
            ? { ...t, status: 'done', content: tool.content }
            : t,
        )
      })
    },
    onSubagent: (name: string) => setActiveSubagent(name),
    onPing: () => {
      // 保活，无需 UI
    },
  }

  const onSend = async () => {
    const text = input.trim()
    if (!text || !threadId || sending) return
    if (text.length > 32000) {
      message.error('消息过长：最多 32000 字符')
      return
    }
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setTools([])
    setActiveSubagent(null)
    setSending(true)
    try {
      const res = await chatStream(threadId, text, streamHandlers)
      applyChatResult(res.reply, res.interrupted, res.interrupt)
    } catch (err) {
      const detail =
        err instanceof Error && err.message ? err.message : '发送失败'
      message.error(detail)
    } finally {
      setSending(false)
    }
  }

  const onResume = async (approve: boolean) => {
    if (!threadId || sending) return
    setSending(true)
    setTools([])
    setActiveSubagent(null)
    try {
      const res = await chatResumeStream(threadId, approve, streamHandlers)
      applyChatResult(res.reply, res.interrupted, res.interrupt)
      message.success(approve ? '已批准' : '已拒绝')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/conversations')}>
          返回会话
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          聊天
        </Typography.Title>
        {conv && (
          <>
            <Tag>{conv.methodology_id}</Tag>
            <Tag color="blue">v{conv.methodology_version}</Tag>
            <Typography.Text type="secondary" copyable={{ text: threadId }}>
              {threadId}
            </Typography.Text>
          </>
        )}
      </Space>

      <Spin spinning={loading} style={{ flex: 1 }}>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 0',
            minHeight: 320,
            maxHeight: 'calc(100vh - 320px)',
          }}
        >
          {messages.length === 0 && !loading && (
            <Typography.Text type="secondary" style={{ textAlign: 'center', marginTop: 48 }}>
              开始与 Agent 对话吧
            </Typography.Text>
          )}
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`} style={bubbleStyle(m.role)}>
              <Typography.Text
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  display: 'block',
                  marginBottom: 4,
                  color: 'inherit',
                }}
              >
                {m.role === 'user' ? '你' : 'Agent'}
              </Typography.Text>
              {m.content || '（空回复）'}
            </div>
          ))}
          {(sending || tools.length > 0 || activeSubagent) && (
            <div
              style={{
                alignSelf: 'flex-start',
                marginBottom: 12,
                maxWidth: '80%',
              }}
            >
              {sending && (
                <div style={{ marginBottom: 8 }}>
                  <Spin size="small" />{' '}
                  <Typography.Text type="secondary">
                    {activeSubagent
                      ? `子 Agent「${activeSubagent}」处理中…`
                      : 'Agent 思考中…'}
                  </Typography.Text>
                </div>
              )}
              {tools.map((t) => (
                <Tag
                  key={t.id}
                  color={t.status === 'running' ? 'processing' : 'default'}
                  style={{ marginBottom: 4, whiteSpace: 'normal', height: 'auto' }}
                >
                  {t.status === 'running' ? '调用中' : '已完成'} · {t.name}
                </Tag>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </Spin>

      {interrupted && (
        <Alert
          style={{ marginBottom: 12 }}
          type="warning"
          showIcon
          message="Human-in-the-loop：工具调用等待批准"
          description={
            <Typography.Paragraph
              style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}
            >
              {formatInterrupt(interrupt)}
            </Typography.Paragraph>
          }
          action={
            <Space>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                loading={sending}
                onClick={() => void onResume(true)}
              >
                批准
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                loading={sending}
                onClick={() => void onResume(false)}
              >
                拒绝
              </Button>
            </Space>
          }
        />
      )}

      <Space.Compact style={{ width: '100%' }}>
        <Input.TextArea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 32000))}
          maxLength={32000}
          showCount
          placeholder={interrupted ? '请先处理 HITL 中断' : '输入消息，Enter 发送，Shift+Enter 换行'}
          autoSize={{ minRows: 2, maxRows: 6 }}
          disabled={sending || interrupted}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault()
              void onSend()
            }
          }}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          disabled={!input.trim() || interrupted}
          onClick={() => void onSend()}
          style={{ height: 'auto' }}
        >
          发送
        </Button>
      </Space.Compact>
    </div>
  )
}
