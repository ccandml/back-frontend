<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getDailySales, getMonthSummary, getTodaySummary } from '@/service/home'

import type { StatisticsDailySalesItem } from './types/result'
import StatCard from './components/StatCard.vue'
import SalesTrendChart from './components/SalesTrendChart.vue'

type SummaryCard = {
  label: string
  value: string
}

const monthSummary = ref({ orderCount: 0, salesAmount: 0, newUsers: 0 })
const todaySummary = ref({ orderCount: 0, salesAmount: 0, newUsers: 0 })
const dailySales = ref<StatisticsDailySalesItem[]>([])
const loading = ref(false)

const formatCount = (value: number) => value.toLocaleString('zh-CN')
const formatCurrency = (value: number) => `¥ ${value.toLocaleString('zh-CN')}`

const cards = computed<SummaryCard[]>(() => [
  { label: '本月订单数', value: formatCount(monthSummary.value.orderCount) },
  { label: '本月销售额', value: formatCurrency(monthSummary.value.salesAmount) },
  { label: '本月新增用户', value: formatCount(monthSummary.value.newUsers) },
  { label: '今日订单数', value: formatCount(todaySummary.value.orderCount) },
  { label: '今日销售额', value: formatCurrency(todaySummary.value.salesAmount) },
  { label: '今日新增用户', value: formatCount(todaySummary.value.newUsers) },
])

const fetchDashboardData = async () => {
  loading.value = true
  try {
    const [monthResult, todayResult, dailyResult] = await Promise.all([
      getMonthSummary(),
      getTodaySummary(),
      getDailySales(),
    ])

    monthSummary.value = monthResult
    todaySummary.value = todayResult
    dailySales.value = dailyResult.items || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void fetchDashboardData()
})
</script>

<template>
  <section class="dashboard">
    <div class="dashboard-top">
      <StatCard
        v-for="card in cards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :loading="loading"
      />
    </div>

    <div class="dashboard-chart">
      <SalesTrendChart :items="dailySales" :loading="loading" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.dashboard {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-top {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.dashboard-chart {
  flex: 1;
  min-height: 0;
}

@media (max-width: 900px) {
  .dashboard {
    gap: 10px;
  }

  .dashboard-top {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .dashboard-chart {
    min-height: 320px;
  }
}
</style>
