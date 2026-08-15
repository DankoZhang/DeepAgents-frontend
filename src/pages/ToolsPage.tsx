import { useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ApiOutlined, DeleteOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { HttpToolConfig, McpServerConfig, Tool, ToolTestResult } from '../types'
import { createTool, deleteTool, listTools, testTool, testToolById, updateTool } from '../api'
import { useCursorPager } from '../hooks/useCursorPager'

const DEFAULT_INPUT_SCHEMA = `{
  "type": "object",
  "properties": {
    "city": { "type": "string", "description": "城市名" }
  },
  "required": ["city"]
}`

function toolTypeColor(t: string) {
  if (t === 'mcp') return 'purple'
  if (t === 'http') return 'blue'
  return 'default'
}

function headersFromForm(rows: unknown): Record<string, string> {
  const headers: Record<string, string> = {}
  if (!Array.isArray(rows)) return headers
  for (const row of rows as { key?: string; value?: string }[]) {
    const key = (row?.key || '').trim()
    if (!key) continue
    headers[key] = row?.value ?? ''
  }
  return headers
}

function parseJsonObject(raw: string, label: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`${label} 须为合法 JSON`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} 须为 JSON 对象`)
  }
  return parsed as Record<string, unknown>
}

function collectMcpConfig(values: Record<string, unknown>): McpServerConfig {
  const headers = headersFromForm(values.headers)
  const argsRaw = values.args
  const args =
    typeof argsRaw === 'string' && argsRaw.trim()
      ? argsRaw
          .split(/\s+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  const transport = values.transport as McpServerConfig['transport']
  return {
    transport,
    command: transport === 'stdio' ? String(values.command || '') : undefined,
    args: transport === 'stdio' ? args : [],
    url: transport !== 'stdio' ? String(values.url || '') : undefined,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  }
}

function collectHttpConfig(values: Record<string, unknown>): HttpToolConfig | null {
  let inputSchema: Record<string, unknown>
  try {
    inputSchema = parseJsonObject(String(values.input_schema || ''), 'input_schema')
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'input_schema 无效')
    return null
  }
  if (inputSchema.type !== 'object') {
    message.error('input_schema.type 必须是 object')
    return null
  }
  let paramIn: HttpToolConfig['param_in']
  const rawParamIn = String(values.param_in || '').trim()
  if (rawParamIn) {
    try {
      paramIn = parseJsonObject(rawParamIn, 'param_in') as HttpToolConfig['param_in']
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'param_in 无效')
      return null
    }
  }
  const headers = headersFromForm(values.headers)
  return {
    method: values.method as HttpToolConfig['method'],
    url: String(values.url || '').trim(),
    input_schema: inputSchema,
    timeout: Number(values.timeout) || 15,
    ...(paramIn ? { param_in: paramIn } : {}),
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  }
}

function showTestResult(result: ToolTestResult) {
  if (result.ok) {
    message.success(result.detail || result.message)
  } else {
    message.error(result.detail || result.message)
  }
}

function HeaderFields() {
  return (
    <Form.Item label="Headers（可选）" tooltip="静态请求头，如 Authorization；不要放进 input_schema">
      <Form.List name="headers">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <Space
                key={field.key}
                style={{ display: 'flex', marginBottom: 8 }}
                align="baseline"
              >
                <Form.Item
                  {...field}
                  name={[field.name, 'key']}
                  rules={[{ required: true, message: 'Header 名' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Authorization" style={{ width: 160 }} />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, 'value']}
                  style={{ marginBottom: 0 }}
                >
                  <Input placeholder="Bearer sk-xxx" style={{ width: 220 }} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(field.name)} />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
              添加 Header
            </Button>
          </>
        )}
      </Form.List>
    </Form.Item>
  )
}

export default function ToolsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testingForm, setTestingForm] = useState(false)
  const [form] = Form.useForm()
  const kind = Form.useWatch('kind', form) as 'mcp' | 'http' | undefined
  const transport = Form.useWatch('transport', form)

  const { items: tools, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listTools({ limit, cursor }),
  )

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      kind: 'mcp',
      transport: 'streamable_http',
      args: '',
      method: 'GET',
      timeout: 15,
      input_schema: DEFAULT_INPUT_SCHEMA,
      requires_hitl: false,
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const common = {
      name: values.name as string,
      description: (values.description ?? '') as string,
      requires_hitl: !!values.requires_hitl,
    }

    if (values.kind === 'http') {
      const http = collectHttpConfig(values)
      if (!http) return
      await createTool({
        ...common,
        tool_type: 'http',
        http,
      })
      message.success('HTTP 工具已创建')
    } else {
      await createTool({
        ...common,
        tool_type: 'mcp',
        mcp: collectMcpConfig(values),
      })
      message.success('MCP 工具已创建')
    }
    setDrawerOpen(false)
    await reload()
  }

  const onTestForm = async () => {
    const values = await form.validateFields()
    setTestingForm(true)
    try {
      if (values.kind === 'http') {
        const http = collectHttpConfig(values)
        if (!http) return
        showTestResult(await testTool({ tool_type: 'http', http }))
      } else {
        showTestResult(
          await testTool({ tool_type: 'mcp', mcp: collectMcpConfig(values) }),
        )
      }
    } finally {
      setTestingForm(false)
    }
  }

  const onTestSaved = async (tool: Tool) => {
    setTestingId(tool.id)
    try {
      showTestResult(await testToolById(tool.id))
    } finally {
      setTestingId(null)
    }
  }

  const onToggleHitl = async (tool: Tool, checked: boolean) => {
    await updateTool(tool.id, { requires_hitl: checked })
    message.success(checked ? '已开启 HITL' : '已关闭 HITL')
    await reload()
  }

  const onDisableBuiltin = async (tool: Tool) => {
    await updateTool(tool.id, {
      status: tool.status === 'active' ? 'disabled' : 'active',
    })
    message.success(tool.status === 'active' ? '已停用' : '已启用')
    await reload()
  }

  const onDeleteRegistered = async (tool: Tool) => {
    await deleteTool(tool.id)
    message.success('已删除')
    await reload()
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            工具
          </Typography.Title>
          <Typography.Text type="secondary">
            内置工具可停用并配置 HITL；新增可选 MCP Server 或 HTTP 接口（一条 HTTP
            记录对应一个可调用工具）。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增工具
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={tools}
        pagination={pagination}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: '类型',
            dataIndex: 'tool_type',
            width: 100,
            render: (t: string) => <Tag color={toolTypeColor(t)}>{t}</Tag>,
          },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          {
            title: 'HITL',
            dataIndex: 'requires_hitl',
            width: 90,
            render: (v: boolean, row) => (
              <Switch
                size="small"
                checked={!!v}
                onChange={(checked) => void onToggleHitl(row, checked)}
              />
            ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 100,
            render: (s: string) => (
              <Tag color={s === 'active' ? 'success' : 'default'}>{s}</Tag>
            ),
          },
          {
            title: '连接',
            render: (_, row) => {
              const cfg = row.config || {}
              if (row.tool_type === 'mcp') {
                return (
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
                    {String(cfg.transport)} · {String(cfg.command || cfg.url || '—')}
                  </Typography.Text>
                )
              }
              if (row.tool_type === 'http') {
                return (
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
                    {String(cfg.method || 'GET')} · {String(cfg.url || '—')}
                  </Typography.Text>
                )
              }
              return (
                <Typography.Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
                  {row.class_path || '—'}
                </Typography.Text>
              )
            },
          },
          {
            title: '操作',
            width: 220,
            render: (_, row) =>
              row.tool_type === 'builtin' ? (
                <Button size="small" onClick={() => void onDisableBuiltin(row)}>
                  {row.status === 'active' ? '停用' : '启用'}
                </Button>
              ) : (
                <Space>
                  <Button
                    size="small"
                    icon={<ApiOutlined />}
                    loading={testingId === row.id}
                    onClick={() => void onTestSaved(row)}
                  >
                    测试
                  </Button>
                  <Popconfirm
                    title={`确认删除该 ${row.tool_type === 'http' ? 'HTTP' : 'MCP'} 工具？`}
                    onConfirm={() => void onDeleteRegistered(row)}
                  >
                    <Button size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              ),
          },
        ]}
      />

      <Drawer
        title="新增工具"
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button loading={testingForm} onClick={() => void onTestForm()}>
              试连
            </Button>
            <Button type="primary" onClick={() => void onSubmit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'mcp', label: 'MCP Server' },
                { value: 'http', label: 'HTTP 接口' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
            extra={kind === 'http' ? '将作为运行时工具名，如 get_weather' : undefined}
          >
            <Input placeholder={kind === 'http' ? 'get_weather' : 'my-mcp-server'} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            name="requires_hitl"
            label="需要 HITL（调用前人工审批）"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {kind === 'http' ? (
            <>
              <Form.Item name="method" label="Method" rules={[{ required: true }]}>
                <Select
                  options={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="url"
                label="URL"
                rules={[
                  { required: true, message: '请输入 URL' },
                  {
                    pattern: /^https?:\/\//i,
                    message: '须以 http:// 或 https:// 开头',
                  },
                ]}
                extra="路径参数写成 /users/{id}；query 不要写成 ?q={q}，用下方 schema + 默认 query/body"
              >
                <Input placeholder="https://api.example.com/weather/{city}" />
              </Form.Item>
              <Form.Item
                name="input_schema"
                label="input_schema（JSON）"
                rules={[{ required: true, message: '请填写 JSON Schema' }]}
                extra="必须是 type=object；字段名给模型填，执行时再映射到 path/query/body"
              >
                <Input.TextArea rows={10} style={{ fontFamily: 'monospace' }} />
              </Form.Item>
              <Form.Item
                name="param_in"
                label="param_in（可选 JSON）"
                extra='如 {"city":"path","units":"query"}。留空则：URL 占位符→path，GET/DELETE 其余→query，其它→body'
              >
                <Input.TextArea rows={3} placeholder='{"city":"path"}' />
              </Form.Item>
              <Form.Item
                name="timeout"
                label="超时（秒）"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={60} style={{ width: '100%' }} />
              </Form.Item>
              <HeaderFields />
            </>
          ) : (
            <>
              <Form.Item
                name="transport"
                label="传输方式"
                rules={[{ required: true }]}
                extra={
                  transport === 'stdio'
                    ? 'stdio 会在 API 进程拉起子进程：需 MCP_STDIO_ENABLED=true，且 command 在白名单内'
                    : '生产环境请使用公网 https 端点；鉴权开启后私网/localhost URL 会被拒绝'
                }
              >
                <Select
                  options={[
                    {
                      value: 'streamable_http',
                      label: 'streamable_http（推荐）',
                    },
                    { value: 'sse', label: 'sse' },
                    {
                      value: 'stdio',
                      label: 'stdio（需后端开启）',
                    },
                  ]}
                />
              </Form.Item>
              {transport === 'stdio' ? (
                <>
                  <Form.Item
                    name="command"
                    label="Command"
                    rules={[{ required: true, message: '请输入 command' }]}
                    extra="白名单 basename，如 npx / uvx / node / python / python3（以服务端 MCP_STDIO_COMMAND_ALLOWLIST 为准）"
                  >
                    <Input placeholder="npx" />
                  </Form.Item>
                  <Form.Item name="args" label="Args（空格分隔）">
                    <Input placeholder="-y @modelcontextprotocol/server-filesystem /tmp" />
                  </Form.Item>
                </>
              ) : (
                <>
                  <Form.Item
                    name="url"
                    label="URL"
                    rules={[
                      { required: true, message: '请输入 URL' },
                      {
                        pattern: /^https?:\/\//i,
                        message: '须以 http:// 或 https:// 开头',
                      },
                    ]}
                    extra="示例：https://mcp.example.com/mcp（勿填内网/元数据地址）"
                  >
                    <Input placeholder="https://mcp.example.com/mcp" />
                  </Form.Item>
                  <HeaderFields />
                </>
              )}
            </>
          )}
        </Form>
      </Drawer>
    </>
  )
}
