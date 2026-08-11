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
import { useCursorPager } from '../hooks/useCursorPager'

const PROVIDER_OPTIONS: { value: ModelProvider; label: string }[] = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai_compatible', label: 'OpenAI Compatible' },
]

export default function ModelsPage() {
  const [testingId, setTestingId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<LlmModel | null>(null)
  const [form] = Form.useForm()
  const provider = Form.useWatch('provider', form)

  const { items: models, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listModels({ limit, cursor }),
  )

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
      base_url: row.base_url,
      temperature: row.temperature,
      top_p: row.top_p,
      max_tokens: row.max_tokens,
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
        base_url: values.base_url || null,
        temperature: values.temperature ?? null,
        top_p: values.top_p ?? null,
        max_tokens: values.max_tokens ?? null,
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
        timeout: values.timeout ?? null,
        status: values.status ?? 'active',
      })
      message.success('模型已创建')
    }
    setDrawerOpen(false)
    await reload()
  }

  const onTestSaved = async (row: LlmModel) => {
    setTestingId(row.id)
    try {
      const result = await testModelById(row.id)
      if (result.ok) {
        message.success('连通性测试成功')
      } else {
        message.error('连通性测试失败')
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
    // 后端若收到 model_id 会只用库内配置，忽略表单 api_key。
    // 编辑且 key 留空 → 按已存密钥试连；填了新 key / 新建 → 走内联配置。
    const useSavedKey = Boolean(editing?.id && !values.api_key)
    const result = await testModel({
      model_id: useSavedKey ? editing?.id : undefined,
      provider: useSavedKey ? undefined : values.provider,
      model_name: useSavedKey ? undefined : values.model_name,
      api_key: values.api_key || undefined,
      base_url: useSavedKey ? undefined : values.base_url || undefined,
      temperature: values.temperature ?? 0,
      top_p: values.top_p ?? undefined,
      max_tokens: values.max_tokens ?? 16,
      timeout: values.timeout ?? 30,
    })
    if (result.ok) {
      message.success('连通性测试成功')
    } else {
      message.error('连通性测试失败')
    }
  }

  const onDelete = async (row: LlmModel) => {
    await deleteModel(row.id)
    message.success('已删除')
    await reload()
  }

  const onToggleStatus = async (row: LlmModel) => {
    await updateModel(row.id, {
      status: row.status === 'active' ? 'disabled' : 'active',
    })
    message.success(row.status === 'active' ? '已停用' : '已启用')
    await reload()
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
        pagination={pagination}
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
          {(provider === 'openai_compatible' ||
            editing?.provider === 'openai_compatible' ||
            provider === 'openai') && (
            <Form.Item
              name="base_url"
              label="Base URL"
              extra="生产鉴权开启后，私网/localhost 地址会被拒绝（本地 AUTH_DISABLED 除外）"
            >
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
