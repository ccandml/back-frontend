import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { ElMessageBox } from 'element-plus'
import router from '@/router'

import pinia, { useMemberStore } from '@/stores'

// 业务层成功码按 2xx 处理，避免写死 200。
const SUCCESS_CODE_MIN = 200
const SUCCESS_CODE_MAX = 299
// 权限不足业务码（后端约定）。
const FORBIDDEN_CODE = 403
// 未授权状态码，业务 code 与 HTTP status 共用该常量。
const UNAUTHORIZED_CODE = 401
// 请求超时时间（毫秒）。
const DEFAULT_TIMEOUT = 555000
// 统一 API 前缀。
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/cyx/v1'
// 并发请求同时返回 401 时，避免重复清理登录态与重复跳转。
let isHandlingUnauthorized = false

const isSuccessCode = (code: number) => code >= SUCCESS_CODE_MIN && code <= SUCCESS_CODE_MAX

type ApiResponse<T = unknown> = {
  // 后端业务状态码（兼容 string/number）。
  code?: string | number
  // 后端业务提示信息。
  message?: string
  // 兼容 data/result 两种字段命名。
  data: T
  result?: T
}

// 创建独立请求实例，避免污染全局 axios 默认配置。
const request = axios.create({
  timeout: DEFAULT_TIMEOUT,
})

const getMemberStore = () => useMemberStore(pinia)

const handleUnauthorized = (message?: string) => {
  if (isHandlingUnauthorized) {
    return
  }

  isHandlingUnauthorized = true
  removeToken()

  void router
    .replace('/login')
    .catch(() => {
      // 跳转失败时不阻塞登录态清理，最终仍会释放重入锁。
    })
    .finally(() => {
      isHandlingUnauthorized = false
    })
}

request.interceptors.request.use(
  function (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // 如果是相对路径，自动补上统一 baseURL。
    if (config.url && !config.url.startsWith('http')) {
      config.baseURL = BASE_URL
    }

    // 添加前端来源标识，便于后端区分来源渠道。
    config.headers['source-client'] = 'web'

    const memberStore = getMemberStore()
    const token = memberStore.profile?.access_token

    // 自动注入 Bearer Token，业务侧无需每个接口重复拼接。
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (import.meta.env.DEV) {
      const finalUrl = `${config.baseURL ?? ''}${config.url ?? ''}`
      console.log('最终请求地址:', finalUrl)
      console.log('最终请求头:', config.headers)
    }

    return config
  },
  function (error: AxiosError) {
    return Promise.reject(error)
  },
)

request.interceptors.response.use(
  function (response) {
    const payload = response.data as ApiResponse

    // 兼容三种格式：
    // 1) 统一包裹结构：{ code, message, data/result }
    // 2) 半包裹结构：{ data } 或 { result }
    // 3) 直接业务对象：{ id, name, ... }
    if (payload && typeof payload === 'object') {
      const hasCode = 'code' in payload
      const hasData = 'data' in payload
      const hasResult = 'result' in payload

      if (!hasCode && !hasData && !hasResult) {
        return response.data
      }

      const businessCode = payload.code !== undefined ? Number(payload.code) : response.status

      // 业务 403：提示权限不足，不清理登录态。
      if (businessCode === FORBIDDEN_CODE) {
        void ElMessageBox.alert(payload.message || '暂无权限访问该资源', '权限提示', {
          type: 'warning',
          confirmButtonText: '我知道了',
        })
        return Promise.reject(new Error(payload.message || '暂无权限访问该资源'))
      }

      // 业务 401：token 过期或无效，立即清理登录态并跳转登录页。
      if (businessCode === UNAUTHORIZED_CODE) {
        handleUnauthorized()
        return Promise.reject(new Error(payload.message || '登录已过期，请重新登录'))
      }

      // 非 2xx 业务码统一抛错，便于页面层统一兜底。
      if (!isSuccessCode(businessCode)) {
        return Promise.reject(new Error(payload.message || '请求失败'))
      }

      // 成功时优先返回 result，再回退 data；两者都没有时回退原响应对象。
      return payload.result ?? payload.data ?? response.data
    }

    // 非统一结构接口按原样返回。
    return response.data
  },
  function (error: AxiosError<ApiResponse>) {
    // HTTP 401：token 过期或无效，清理登录态并跳转登录页。
    if (error.response?.status === UNAUTHORIZED_CODE) {
      handleUnauthorized()
    }

    // 优先展示后端 message，其次回退 axios 错误信息。
    const message = error.response?.data?.message || error.message || '网络异常，请稍后重试'
    return Promise.reject(new Error(message))
  },
)

export const removeToken = () => {
  getMemberStore().clearProfile()
}

// 便捷请求方法，支持按需传入完整 AxiosRequestConfig。
export const requestWithConfig = <T = unknown>(config: AxiosRequestConfig) => {
  return request.request<unknown, T>(config)
}

export default request
