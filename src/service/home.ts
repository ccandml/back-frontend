import { requestWithConfig } from '@/utils/request'
import type { StatisticsDailySalesResult, StatisticsSummaryResult } from '@/views/home/types/result'

// 当月份汇总
export const getMonthSummary = () => {
  return requestWithConfig<StatisticsSummaryResult>({
    url: '/statistics/month-summary',
    method: 'GET',
  })
}

// 今日汇总
export const getTodaySummary = () => {
  return requestWithConfig<StatisticsSummaryResult>({
    url: '/statistics/today-summary',
    method: 'GET',
  })
}

// 最近30日趋势：每日销售额与订单数
export const getDailySales = () => {
  return requestWithConfig<StatisticsDailySalesResult>({
    url: '/statistics/daily-sales',
    method: 'GET',
  })
}
