import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ApiOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { LlmModel, ModelProvider } from '../types'
import {
  createModel,
  deleteModel,
  listModels,
  testModel,
  testModelById,
  updateModel,
} from '../api'

const PROVIDER_OPTIONS: { value: ModelProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai_compatible', label: 'OpenAI Compatible' },
]

export default function ModelsPage() {
  const [loading, setLoading] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [models, setModels] = useState<LlmModel[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<LlmModel | null>(null)
  const [form] = Form.useForm()
  const provider = Form.useWatch('provider', form)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setModels(await listModels())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      provider: 'openai',
      temperature: 0.2,
      status: 'active',
    })
    setDrawerOpen(true)
  }

  const openEdit = (row: LlmModel) => {
    setEditing(row)
    form.setFieldsValue({
      name: row.name,
      provider: row.provider,
      model_name: row.model_name,
      api_key: '',
      clear_api_key: false,
      base_url: row.base_url,
      temperature: row.temperature,
      top_p: row.top_p,
      max_tokens: row.max_tokens,
      context_length: row.context_length,
      timeout: row.timeout,
      status: row.status,
    })
    setDrawerOpen(true)
  }

  const onSubmit = async () => {
    const values = await form.validateFields()
    if (editing) {
      await updateModel(editing.id, {
        name: values.name,
        provider: values.provider,
        model_name: values.model_name,
        api_key: values.api_key || undefined,
        clear_api_key: !!values.clear_api_key,
        base_url: values.base_url || null,
        temperature: values.temperature ?? null,
        top_p: values.top_p ?? null,
        max_tokens: values.max_tokens ?? null,
        context_length: values.context_length ?? null,
        timeout: values.timeout ?? null,
        status: values.status,
      })
      message.success('模型已更新')
    } else {
      await createModel({
        name: values.name,
        provider: values.provider,
        model_name: values.model_name,
        api_key: values.api_key || null,
        base_url: values.base_url || null,
        temperature: values.temperature ?? null,
        top_p: values.top_p ?? null,
        max_tokens: values.max_tokens ?? null,
        context_length: values.context_length ?? null,
        timeout: values.timeout ?? null,
        status: values.status ?? 'active',
      })
      message.success('模型已创建')
    }
    setDrawerOpen(false)
    await load()
  }

  const onTestSaved = async (row: LlmModel) => {
    setTestingId(row.id)
    try {
      const result = await testModelById(row.id)
      if (result.ok) {
        message.success(result.message || '连通性正常')
      } else {
        message.error(result.message || '连通性测试失败')
      }
    } finally {
      setTestingId(null)
    }
  }

  const onTestForm = async () => {
    const values = await form.validateFields([
      'provider',
      'model_name',
      'api_key',
      'base_url',
      'temperature',
      'top_p',
      'max_tokens',
      'timeout',
    ])
    const result = await testModel({
      model_id: editing?.id,
      provider: editing ? undefined : values.provider,
      model_name: editing ? undefined : values.model_name,
      api_key: values.api_key || undefined,
      base_url: values.base_url || undefined,
      temperature: values.temperature ?? 0,
      top_p: values.top_p ?? undefined,
      max_tokens: values.max_tokens ?? 16,
      timeout: values.timeout ?? 30,
    })
    if (result.ok) {
      message.success(
        result.reply_preview
          ? `${result.message}：${result.reply_preview}`
          : result.message || '连通性正常',
      )
    } else {
      message.error(result.message || '连通性测试失败')
    }
  }

  const onDelete = async (row: LlmModel) => {
    await deleteModel(row.id)
    message.success('已删除')
    await load()
  }

  const onToggleStatus = async (row: LlmModel) => {
    await updateModel(row.id, {
      status: row.status === 'active' ? 'disabled' : 'active',
    })
    message.success(row.status === 'active' ? '已停用' : '已启用')
    await load()
  }

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            大模型
          </Typography.Title>
          <Typography.Text type="secondary">
            配置 provider / 模型名 / 超参数；Agent 通过模型目录绑定使用。
          </Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新建模型
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={models}
        columns={[
          { title: '名称', dataIndex: 'name' },
          {
            title: 'Provider',
            dataIndex: 'provider',
            width: 160,
            render: (p: string) => <Tag>{p}</Tag>,
          },
          { title: '模型名', dataIndex: 'model_name' },
          {
            title: 'API Key',
            width: 100,
            render: (_, row) =>
              row.has_api_key ? (
                <Tag color="success">已配置</Tag>
              ) : (
                <Tag>未配置</Tag>
              ),
          },
          {
            title: '温度',
            dataIndex: 'temperature',
            width: 80,
            render: (v: number | null) => (v == null ? '—' : v),
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
            title: '操作',
            width: 280,
            render: (_, row) => (
              <Space wrap>
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(row)}
                >
                  编辑
                </Button>
                <Button
                  size="small"
                  icon={<ApiOutlined />}
                  loading={testingId === row.id}
                  onClick={() => void onTestSaved(row)}
                >
                  测试
                </Button>
                <Button size="small" onClick={() => void onToggleStatus(row)}>
                  {row.status === 'active' ? '停用' : '启用'}
                </Button>
                <Popconfirm
                  title="确认删除该模型？"
                  onConfirm={() => void onDelete(row)}
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
        title={editing ? `编辑模型：${editing.name}` : '新建模型'}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        extra={
          <Space>
            <Button onClick={() => void onTestForm()}>试连</Button>
            <Button type="primary" onClick={() => void onSubmit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="显示名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="默认 DeepSeek / GPT-4o" />
          </Form.Item>
          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Select options={PROVIDER_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="model_name"
            label="模型名"
            rules={[{ required: true, message: '请输入模型名' }]}
          >
            <Input placeholder="gpt-4o / deepseek-chat / claude-sonnet-4-6" />
          </Form.Item>
          <Form.Item
            name="api_key"
            label={editing?.has_api_key ? 'API Key（留空表示不修改）' : 'API Key'}
          >
            <Input.Password placeholder="sk-..." autoComplete="new-password" />
          </Form.Item>
          {editing?.has_api_key ? (
            <Form.Item name="clear_api_key" label="清空已存 API Key">
              <Select
                options={[
                  { value: false, label: '否' },
                  { value: true, label: '是，清空密钥' },
                ]}
              />
            </Form.Item>
          ) : null}
          {(provider === 'openai_compatible' ||
            editing?.provider === 'openai_compatible' ||
            provider === 'openai') && (
            <Form.Item name="base_url" label="Base URL">
              <Input placeholder="https://api.deepseek.com/v1" />
            </Form.Item>
          )}
          <Form.Item name="temperature" label="Temperature">
            <InputNumber min={0} max={2} step={0.1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="top_p" label="Top P">
            <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max_tokens" label="Max Tokens">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="context_length" label="上下文窗口">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="timeout" label="Timeout（秒）">
            <InputNumber min={1} step={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: 'active' },
                { value: 'disabled', label: 'disabled' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  )
}
