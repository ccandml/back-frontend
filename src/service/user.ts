import { requestWithConfig } from '@/utils/request'
import type {
  AdminUserDetailResult,
  AdminUserListResult,
  MemberData,
} from '@/views/users/types/result'

// 新增用户
export const createUser = async (data: {
  username: string
  password: string
  gender?: string
  birthday?: string
  avatar?: string
  profession?: string
  fullLocation?: string // 省市区字符串，如 "北京市朝阳区"
  roleId: 2 | 3 // 2-管理员，3-普通用户
}) => {
  return requestWithConfig({
    url: '/admin-user',
    method: 'POST',
    data,
  })
}

// 修改个人信息
export const updateProfile = async (data: {
  username?: string
  gender?: string
  birthday?: string
  avatar?: string
  profession?: string
  fullLocation?: string
}) => {
  return requestWithConfig({
    url: '/user/profile',
    method: 'PUT',
    data,
  })
}

// 登录
export const login = async (data: { username: string; password: string }) => {
  return requestWithConfig<MemberData>({
    url: '/auth/admin-signin',
    method: 'POST',
    data,
  })
}

// 获取用户列表
export const getUsersList = async (data: {
  keyword?: string
  sortBy?: 'createTime' | 'orderCount' | 'totalPayMoney'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  pageSize?: number
}) => {
  return requestWithConfig<AdminUserListResult>({
    url: '/admin-user/list',
    method: 'GET',
    params: data,
  })
}

// 获取用户详情(用户id)
export const getUserDetail = async (id: string) => {
  return requestWithConfig<AdminUserDetailResult>({
    url: `/admin-user/detail`,
    method: 'GET',
    params: { id },
  })
}

// 删除注销用户(用户id)
export const deleteUser = async (id: string) => {
  return requestWithConfig({
    url: `/admin-user/${id}`,
    method: 'DELETE',
  })
}
