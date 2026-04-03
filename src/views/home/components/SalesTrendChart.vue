<script setup lang="ts">
import * as echarts from 'echarts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { StatisticsDailySalesItem } from '../types/result'

interface Props {
  items: StatisticsDailySalesItem[]
  loading?: boolean
}

const props = defineProps<Props>()

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const formatCurrency = (value: number) => `¥${value.toLocaleString('zh-CN')}`

interface TooltipDataItem {
  axisValueLabel?: string
  seriesName?: string
  marker?: string
  value?: number | string
}

const chartData = computed(() => {
  return props.items.map((item) => ({
    label: item.date.slice(5).replace('-', '/'),
    salesAmount: item.salesAmount,
    orderCount: item.orderCount,
  }))
})

const renderChart = () => {
  if (!chartRef.value) {
    return
  }

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  if (chartData.value.length === 0) {
    chartInstance.clear()
    return
  }

  const labels = chartData.value.map((item) => item.label)
  const salesAmount = chartData.value.map((item) => item.salesAmount)
  const orderCount = chartData.value.map((item) => item.orderCount)

  chartInstance.setOption({
    grid: {
      left: 24,
      right: 42,
      top: 72,
      bottom: 24,
      containLabel: true,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0f172a',
      borderWidth: 0,
      textStyle: {
        color: '#f8fafc',
      },
      // 自定义 tooltip，按系列分别格式化金额与数量。
      formatter(params: unknown) {
        const dataList = (Array.isArray(params) ? params : [params]) as TooltipDataItem[]
        const title = dataList[0]?.axisValueLabel ?? ''
        const lines = dataList.map((item) => {
          const value = Number(item.value ?? 0)
          if (item.seriesName === '销售额') {
            return `${item.marker}${item.seriesName}: ${formatCurrency(value)}`
          }
          return `${item.marker}${item.seriesName}: ${value.toLocaleString('zh-CN')}`
        })

        return [title, ...lines].join('<br/>')
      },
    },
    legend: {
      top: 18,
      right: 18,
      orient: 'horizontal',
      itemWidth: 22,
      itemHeight: 10,
      itemGap: 30,
      padding: [6, 10, 6, 10],
      textStyle: {
        color: '#475569',
        fontSize: 14,
        padding: [0, 0, 0, 8],
      },
      data: ['销售额', '订单数'],
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: labels,
      axisLine: {
        lineStyle: {
          color: '#cbd5e1',
        },
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#64748b',
        interval: 4,
      },
    },
    yAxis: [
      {
        // 主轴：销售额。
        type: 'value',
        name: '销售额',
        splitLine: {
          lineStyle: {
            color: '#e2e8f0',
          },
        },
        axisLabel: {
          color: '#64748b',
          formatter(value: number) {
            return `¥${Math.round(value / 1000)}k`
          },
        },
      },
      {
        // 副轴：订单数。
        type: 'value',
        name: '订单数',
        splitLine: {
          show: false,
        },
        axisLabel: {
          color: '#64748b',
          formatter(value: number) {
            return `${Math.round(value)}`
          },
        },
      },
    ],
    series: [
      {
        // 主线：销售额。
        name: '销售额',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: salesAmount,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#2563eb',
        },
        itemStyle: {
          color: '#2563eb',
        },
        areaStyle: {
          color: 'rgba(37, 99, 235, 0.08)',
        },
      },
      {
        // 副线：订单数。
        name: '订单数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: orderCount,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#10b981',
        },
        itemStyle: {
          color: '#10b981',
        },
      },
    ],
  })
}

const handleResize = () => {
  chartInstance?.resize()
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

watch(
  () => props.items,
  () => {
    renderChart()
  },
  { deep: true },
)

watch(
  () => props.loading,
  () => {
    renderChart()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <section class="trend-card">
    <div class="card-head">
      <h2>销售与订单趋势</h2>
      <p>最近 30 天核心指标走势</p>
    </div>
    <div ref="chartRef" class="chart-box"></div>
  </section>
</template>

<style scoped lang="scss">
.trend-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.card-head {
  padding: 12px 14px 0;
}

.card-head h2 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.card-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.chart-box {
  flex: 1;
  min-height: 0;
  margin-top: 8px;
}
</style>
