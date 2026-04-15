import { requestWithConfig } from '@/utils/request'

export const updateNotice = async (content: string) => {
  return requestWithConfig<string>({
    url: '/admin-notice',
    method: 'POST',
    data: { content },
  })
}

export const getNotice = async () => {
  return requestWithConfig<{ content: string }>({
    url: '/notice',
    method: 'GET',
  })
}
