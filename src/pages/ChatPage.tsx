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
import type { ChatMessage, Conversation } from '../types'
import {
  chat,
  chatResume,
  getConversation,
  getConversationMessages,
} from '../api'

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

export default function ChatPage() {
  const { threadId = '' } = useParams()
  const navigate = useNavigate()
  const [conv, setConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interrupted, setInterrupted] = useState(false)
  const [interrupt, setInterrupt] = useState<string | null>(null)
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
      setMessages(hist.messages.filter((m) => m.role === 'user' || m.role === 'assistant'))
      setInterrupted(hist.interrupted)
      setInterrupt(hist.interrupt ?? null)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    scrollToBottom()
  }, [messages, interrupted])

  const applyChatResult = (reply: string, interruptedFlag: boolean, interruptText?: string | null) => {
    if (reply) {
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    }
    setInterrupted(interruptedFlag)
    setInterrupt(interruptText ?? null)
  }

  const onSend = async () => {
    const text = input.trim()
    if (!text || !threadId || sending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const res = await chat(threadId, text)
      applyChatResult(res.reply, res.interrupted, res.interrupt)
    } catch {
      message.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  const onResume = async (approve: boolean) => {
    if (!threadId || sending) return
    setSending(true)
    try {
      const res = await chatResume(threadId, approve)
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
          {sending && (
            <div style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
              <Spin size="small" /> <Typography.Text type="secondary">Agent 思考中…</Typography.Text>
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
          description={interrupt || '危险工具等待人工确认'}
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
          onChange={(e) => setInput(e.target.value)}
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
