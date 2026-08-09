import { useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import type { Tool } from '../types'
import { createTool, deleteTool, listTools, updateTool } from '../api'
import { useCursorPager } from '../hooks/useCursorPager'

export default function ToolsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()
  const transport = Form.useWatch('transport', form)

  const { items: tools, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listTools({ limit, cursor }),
  )

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({
      // 与后端默认一致；stdio 需服务端 MCP_STDIO_ENABLED=true
      transport: 'streamable_http',
      args: '',
      requires_hitl: false,
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    const args =
      typeof values.args === 'string' && values.args.trim()
        ? values.args
            .split(/\s+/)
            .map((s: string) => s.trim())
            .filter(Boolean)
        : []
    const headers: Record<string, string> = {}
    if (values.transport !== 'stdio' && Array.isArray(values.headers)) {
      for (const row of values.headers as { key?: string; value?: string }[]) {
        const key = (row?.key || '').trim()
        if (!key) continue
        headers[key] = row?.value ?? ''
      }
    }
    await createTool({
      name: values.name,
      description: values.description ?? '',
      requires_hitl: !!values.requires_hitl,
      mcp: {
        transport: values.transport,
        command: values.transport === 'stdio' ? values.command : undefined,
        args: values.transport === 'stdio' ? args : [],
        url: values.transport !== 'stdio' ? values.url : undefined,
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      },
    })
    message.success('MCP 工具已创建')
    setDrawerOpen(false)
    await reload()
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

  const onDeleteMcp = async (tool: Tool) => {
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
            内置工具可停用并配置 HITL；新增只能配置 MCP Server（默认
            streamable_http；stdio 需后端开启且命令在白名单内）。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增 MCP 工具
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
            render: (t: string) => (
              <Tag color={t === 'mcp' ? 'purple' : 'default'}>{t}</Tag>
            ),
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
              if (row.tool_type === 'mcp') {
                const cfg = row.config || {}
                return (
                  <Typography.Text type="secondary" ellipsis style={{ maxWidth: 280 }}>
                    {String(cfg.transport)} ·{' '}
                    {String(cfg.command || cfg.url || '—')}
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
            width: 160,
            render: (_, row) =>
              row.tool_type === 'mcp' ? (
                <Popconfirm
                  title="确认删除该 MCP 工具？"
                  onConfirm={() => void onDeleteMcp(row)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              ) : (
                <Button size="small" onClick={() => void onDisableBuiltin(row)}>
                  {row.status === 'active' ? '停用' : '启用'}
                </Button>
              ),
          },
        ]}
      />

      <Drawer
        title="新增 MCP 工具"
        width={520}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Button type="primary" onClick={() => void onSubmit()}>
            保存
          </Button>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="my-mcp-server" />
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
              <Form.Item
                label="Headers（可选）"
                tooltip="远程鉴权等请求头，如 Authorization"
              >
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
            </>
          )}
        </Form>
      </Drawer>
    </>
  )
}
