import { requestWithConfig } from '@/utils/request'
import type { AdminOrderDetailResult, AdminOrderListResult } from '@/views/orders/types/result'

// 获取订单列表
export const getOrderList = async (data: {
  keyword?: string
  /** 订单状态，1-待支付，2-待发货，3-待收货，4-待评价，5-已完成，6-已取消 */
  orderState?: 1 | 2 | 3 | 4 | 5 | 6
  /** 排序字段，支付金额（payMoney）,创建时间（createTime） */
  sortBy?: 'payMoney' | 'createTime'
  sortOrder?: 'ASC' | 'DESC'
  page?: number
  pageSize?: number
}) => {
  return requestWithConfig<AdminOrderListResult>({
    url: '/admin-order/list',
    method: 'GET',
    params: data,
  })
}

// 获取订单详情(订单id)
export const getOrderDetail = async (id: string) => {
  return requestWithConfig<AdminOrderDetailResult>({
    url: `/admin-order/detail`,
    method: 'GET',
    params: { id },
  })
}

// 修改订单状态
export const updateOrderState = async (
  id: string,
  data: {
    /** 订单状态，1-待支付，2-待发货，3-待收货，4-待评价，5-已完成，6-已取消 */
    orderState: 1 | 2 | 3 | 4 | 5 | 6
  },
) => {
  return requestWithConfig({
    // 订单id
    url: `/admin-order/${id}`,
    method: 'PUT',
    data,
  })
}
