import type { GoodsItems, PagesResult } from '@/types/global'
import { requestWithConfig } from '@/utils/request'
import type { SkuItem } from '@/views/products/types/result'

// 筛选商品列表，支持搜索、分页、排序和分类过滤。
export const getProducts = async (data: {
  keyword?: string
  page?: number
  pageSize?: number
  sortBy?: 'price' | 'stock' | 'orderNum'
  sortOrder?: 'ASC' | 'DESC'
  available?: 0 | 1
  categoryId?: string
}) => {
  return requestWithConfig<PagesResult<GoodsItems[]>>({
    url: '/admin-products/list',
    method: 'GET',
    params: data,
  })
}

// 获取商品 sku 列表详情。
export const getProductDetail = async (id: string) => {
  return requestWithConfig<SkuItem[]>({
    url: `/admin-products/detail`,
    method: 'GET',
    params: { id },
  })
}

// 修改商品详情
export const updateSkuProduct = async (data: {
  id: string
  available: boolean
  inventory: number
  oldPrice: number
  price: number
}) => {
  return requestWithConfig({
    url: `/admin-products/sku`,
    method: 'PATCH',
    data,
  })
}
