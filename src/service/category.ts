import { requestWithConfig } from '@/utils/request'
import type { ClassifyResult } from '@/views/products/types/category'

// 获取分类列表，返回一级分类及其子分类数据。
export const getCategories = async () => {
  return requestWithConfig<ClassifyResult[]>({
    url: '/admin-categories/detail',
  })
}
