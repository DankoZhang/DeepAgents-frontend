import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import { CommentOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Conversation, Methodology } from '../types'
import {
  createConversation,
  deleteConversation,
  listAllMethodologies,
  listConversations,
} from '../api'
import { useCursorPager } from '../hooks/useCursorPager'

export default function ConversationsPage() {
  const navigate = useNavigate()
  const [methodologies, setMethodologies] = useState<Methodology[]>([])
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  const { items, loading, pagination, reload } = useCursorPager(
    ({ limit, cursor }) => listConversations({ limit, cursor }),
  )

  const loadOptions = useCallback(async () => {
    setMethodologies(await listAllMethodologies())
  }, [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const nameOf = (id: string) =>
    methodologies.find((m) => m.id === id)?.name ?? id

  const onCreate = async () => {
    const values = await form.validateFields()
    const conv = await createConversation({
      methodology_id: values.methodology_id,
    })
    message.success('会话已创建')
    setOpen(false)
    navigate(`/chat/${conv.thread_id}`)
  }

  const onDelete = async (row: Conversation) => {
    await deleteConversation(row.thread_id)
    message.success('已删除')
    await reload()
  }

  const published = methodologies.filter((m) => m.status === 'published')

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            会话
          </Typography.Title>
          <Typography.Text type="secondary">
            选择已发布方法论创建会话，与 Agent 对话
          </Typography.Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields()
            setOpen(true)
          }}
        >
          新建会话
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={pagination}
        columns={[
          {
            title: 'Thread ID',
            dataIndex: 'thread_id',
            ellipsis: true,
            render: (tid: string) => (
              <Button type="link" onClick={() => navigate(`/chat/${tid}`)}>
                {tid}
              </Button>
            ),
          },
          {
            title: '方法论',
            dataIndex: 'methodology_id',
            render: (mid: string) => nameOf(mid),
          },
          {
            title: '版本',
            dataIndex: 'methodology_version',
            width: 80,
            render: (v: number) => `v${v}`,
          },
          {
            title: '创建时间',
            dataIndex: 'created_time',
            width: 180,
            render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm'),
          },
          {
            title: '操作',
            width: 200,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  type="primary"
                  icon={<CommentOutlined />}
                  onClick={() => navigate(`/chat/${row.thread_id}`)}
                >
                  进入聊天
                </Button>
                <Popconfirm
                  title="确认删除该会话？"
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

      <Modal
        title="新建会话"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void onCreate()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="methodology_id"
            label="方法论"
            rules={[{ required: true, message: '请选择方法论' }]}
            extra={
              published.length === 0
                ? '暂无已发布方法论，请先在「方法论」页发布'
                : '新会话将绑定当前最新版本'
            }
          >
            <Select
              placeholder="选择已发布方法论"
              options={published.map((m) => ({
                value: m.id,
                label: `${m.name}（v${m.version}）`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
