<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'

import { getOrderDetail, getOrderList, updateOrderState } from '@/service/order'
import OrderDetailDialog from '@/views/orders/components/OrderDetailDialog.vue'
import type { AdminOrderDetailResult, AdminOrderListItem } from '@/views/orders/types/result'

type OrderStateCode = 1 | 2 | 3 | 4 | 5 | 6
type SortField = 'payMoney' | 'createTime'
type SortOrder = 'ASC' | 'DESC'

type OrderStateLabel = '待付款' | '待发货' | '待收货' | '待评价' | '已完成' | '已取消'

type OrderTableRow = AdminOrderListItem & {
  statusLabel: OrderStateLabel
}

const loading = ref(false)
const detailLoading = ref(false)
const updateStateLoading = ref(false)
const orders = ref<OrderTableRow[]>([])
const detailVisible = ref(false)
const currentPage = ref(1)
const pageSize = 8
const total = ref(0)
const keyword = ref('')
const selectedStatus = ref<'all' | OrderStateCode>('all')
const sortField = ref<SortField | ''>('')
const sortOrder = ref<SortOrder | ''>('')
const activeOrderId = ref('')
const activeOrderRow = ref<OrderTableRow | null>(null)
const orderDetailMap = ref<Record<string, AdminOrderDetailResult>>({})

const ORDER_STATE_MAP: Record<OrderStateCode, OrderStateLabel> = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '待评价',
  5: '已完成',
  6: '已取消',
}

const statusOptions: Array<{ label: string; value: 'all' | OrderStateCode }> = [
  { label: '全部状态', value: 'all' },
  { label: '待付款', value: 1 },
  { label: '待发货', value: 2 },
  { label: '待收货', value: 3 },
  { label: '待评价', value: 4 },
  { label: '已完成', value: 5 },
  { label: '已取消', value: 6 },
]

const hasData = computed(() => orders.value.length > 0)

const activeOrder = computed(() => activeOrderRow.value)

const activeDetail = computed(() => {
  if (!activeOrderId.value) {
    return null
  }
  return orderDetailMap.value[activeOrderId.value] ?? null
})

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`

const getSortLabel = (field: SortField) => {
  if (sortField.value !== field || !sortOrder.value) {
    return '未排序'
  }
  return sortOrder.value === 'ASC' ? '升序' : '降序'
}

// 只允许一个排序字段生效，行为与商品管理保持一致。
const toggleSort = (field: SortField) => {
  if (sortField.value !== field) {
    sortField.value = field
    sortOrder.value = 'ASC'
    return
  }

  if (sortOrder.value === 'ASC') {
    sortOrder.value = 'DESC'
    return
  }

  if (sortOrder.value === 'DESC') {
    sortField.value = ''
    sortOrder.value = ''
    return
  }

  sortOrder.value = 'ASC'
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const response = await getOrderList({
      page: currentPage.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      orderState: selectedStatus.value === 'all' ? undefined : selectedStatus.value,
      sortBy: sortField.value || undefined,
      sortOrder: sortOrder.value || undefined,
    })

    orders.value = response.items.map((item) => ({
      ...item,
      statusLabel: ORDER_STATE_MAP[(item.orderState as OrderStateCode) ?? 1] ?? '待付款',
    }))
    total.value = response.counts
  } catch (error) {
    console.error('获取订单列表失败：', error)
    ElMessage.error(error instanceof Error ? error.message : '获取订单列表失败')
    orders.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  void fetchOrders()
}

const handleReset = () => {
  keyword.value = ''
  selectedStatus.value = 'all'
  sortField.value = ''
  sortOrder.value = ''
  currentPage.value = 1
  void fetchOrders()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  void fetchOrders()
}

// 详情按订单懒加载，并缓存结果避免重复请求。
const handleViewDetail = async (row: OrderTableRow) => {
  activeOrderId.value = row.id
  activeOrderRow.value = row
  detailVisible.value = true

  if (orderDetailMap.value[row.id]) {
    return
  }

  detailLoading.value = true
  try {
    const detail = await getOrderDetail(row.id)
    orderDetailMap.value[row.id] = detail
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '获取订单详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

const handleUpdateOrderState = async (orderState: OrderStateCode) => {
  if (!activeOrderId.value || !activeOrderRow.value) {
    return
  }

  if (activeOrderRow.value.orderState === orderState) {
    ElMessage.info('订单状态未变化')
    return
  }

  updateStateLoading.value = true
  try {
    await updateOrderState(activeOrderId.value, { orderState })

    const nextStatusLabel = ORDER_STATE_MAP[orderState]

    // 同步更新当前弹框行，保证修改后状态标签即时反馈。
    activeOrderRow.value = {
      ...activeOrderRow.value,
      orderState,
      statusLabel: nextStatusLabel,
    }

    const target = orders.value.find((item) => item.id === activeOrderId.value)
    if (target) {
      target.orderState = orderState
      target.statusLabel = nextStatusLabel
    }

    const activeDetailData = orderDetailMap.value[activeOrderId.value]
    if (activeDetailData) {
      activeDetailData.orderState = orderState
    }

    ElMessage.success('订单状态更新成功')

    // 触发一次列表刷新，确保筛选条件和服务端状态始终一致。
    void fetchOrders()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '订单状态更新失败')
  } finally {
    updateStateLoading.value = false
  }
}

onMounted(() => {
  void fetchOrders()
})
</script>

<template>
  <section class="orders-page">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        class="filter-keyword"
        clearable
        placeholder="请输入订单ID或用户名"
      />

      <el-select v-model="selectedStatus" class="filter-status" placeholder="请选择订单状态">
        <el-option
          v-for="option in statusOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </el-select>

      <div class="sort-actions">
        <el-button
          :type="sortField === 'payMoney' ? 'primary' : 'default'"
          plain
          @click="toggleSort('payMoney')"
        >
          总价（{{ getSortLabel('payMoney') }}）
        </el-button>
        <el-button
          :type="sortField === 'createTime' ? 'primary' : 'default'"
          plain
          @click="toggleSort('createTime')"
        >
          创建时间（{{ getSortLabel('createTime') }}）
        </el-button>
      </div>

      <div class="filter-actions">
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
      </div>
    </div>

    <div class="table-shell">
      <el-table
        v-loading="loading"
        :data="orders"
        class="order-table"
        empty-text="暂无订单数据"
        stripe
      >
        <el-table-column label="订单ID" min-width="180">
          <template #default="{ row }">
            <span class="order-id">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="用户头像" width="110" align="center">
          <template #default="{ row }">
            <el-avatar :size="34" :src="row.userAvatar">
              {{ row.userAvatar || row.username?.slice(0, 1) || '-' }}
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户名" min-width="120" />

        <el-table-column label="商品总价" width="140">
          <template #default="{ row }">
            <span class="money">{{ formatCurrency(row.totalPayPrice) }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" min-width="180" />

        <el-table-column label="订单状态" width="130">
          <template #default="{ row }">
            <el-tag class="status-tag" effect="light" :class="`status-${row.statusLabel}`">
              {{ row.statusLabel }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleViewDetail(row)">查看详情</el-button>
          </template>
        </el-table-column>

        <template #append>
          <div class="table-bottom-slot">
            <div v-if="!loading && hasData" class="footer-tip">共 {{ total }} 条订单</div>
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              size="small"
              layout="prev, pager, next, jumper, total"
              background
              @current-change="handlePageChange"
            />
          </div>
        </template>
      </el-table>
    </div>

    <OrderDetailDialog
      v-model="detailVisible"
      :loading="detailLoading"
      :update-loading="updateStateLoading"
      :detail="activeDetail"
      :order="activeOrder"
      @update-state="handleUpdateOrderState"
    />
  </section>
</template>

<style scoped lang="scss">
.orders-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-bar {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 10px;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
}

.filter-keyword {
  width: 240px;
}

.filter-status {
  width: 140px;
}

.sort-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
}

.sort-actions :deep(.el-button) {
  padding: 7px 10px;
  font-size: 12px;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.filter-actions :deep(.el-button) {
  padding: 7px 12px;
}

.table-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
}

.order-table {
  height: 100%;
}

.order-id {
  color: #1f2937;
  font-weight: 600;
}

.money {
  color: #dc2626;
  font-weight: 700;
}

.status-tag {
  border: none;
  font-weight: 600;
}

.status-待付款 {
  color: #92400e;
  background: #fef3c7;
}

.status-待发货 {
  color: #1d4ed8;
  background: #dbeafe;
}

.status-待收货 {
  color: #0f766e;
  background: #ccfbf1;
}

.status-待评价 {
  color: #6d28d9;
  background: #ede9fe;
}

.status-已完成 {
  color: #166534;
  background: #dcfce7;
}

.status-已取消 {
  color: #991b1b;
  background: #fee2e2;
}

.table-bottom-slot {
  border-top: 1px solid #e5e7eb;
  min-height: 46px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.footer-tip {
  color: #6b7280;
  font-size: 13px;
}
</style>
