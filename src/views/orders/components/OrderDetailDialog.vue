<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { AdminOrderDetailResult } from '@/views/orders/types/result'

type OrderStateLabel = '待付款' | '待发货' | '待收货' | '待评价' | '已完成' | '已取消'
type OrderStateCode = 1 | 2 | 3 | 4 | 5 | 6

type OrderBaseInfo = {
  id: string
  username: string
  userAvatar: string
  orderState: number
  statusLabel: OrderStateLabel
}

const visible = defineModel<boolean>({ required: true })

const emits = defineEmits<{
  'update-state': [orderState: OrderStateCode]
}>()

const props = defineProps<{
  loading: boolean
  updateLoading: boolean
  detail: AdminOrderDetailResult | null
  order: OrderBaseInfo | null
}>()

const detailReady = computed(() => Boolean(props.order && props.detail))
const editOrderState = ref<OrderStateCode>(1)

const orderStateOptions: Array<{ label: OrderStateLabel; value: OrderStateCode }> = [
  { label: '待付款', value: 1 },
  { label: '待发货', value: 2 },
  { label: '待收货', value: 3 },
  { label: '待评价', value: 4 },
  { label: '已完成', value: 5 },
  { label: '已取消', value: 6 },
]

// 弹框打开或订单切换时，同步当前状态到下拉框，避免误改上一单的值。
const isOrderStateCode = (value: number): value is OrderStateCode => {
  return value >= 1 && value <= 6
}

watch(
  () => [visible.value, props.order?.orderState] as const,
  ([isVisible, orderState]) => {
    if (isVisible && typeof orderState === 'number' && isOrderStateCode(orderState)) {
      editOrderState.value = orderState
    }
  },
  { immediate: true },
)

const handleStateChange = (value: OrderStateCode) => {
  emits('update-state', value)
}

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`
</script>

<template>
  <el-dialog
    v-model="visible"
    title="订单详情"
    width="min(1260px, 94vw)"
    top="4vh"
    destroy-on-close
    class="order-detail-dialog"
    style="max-height: 89vh; overflow: hidden"
  >
    <div v-loading="loading" class="detail-body">
      <template v-if="detailReady && detail && order">
        <div class="detail-groups">
          <section class="detail-group">
            <h3>订单基础信息</h3>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="订单ID">{{ detail.id }}</el-descriptions-item>
              <el-descriptions-item label="用户信息">
                <span class="user-value">
                  <el-avatar :size="20" :src="order.userAvatar">
                    {{ order.userAvatar || order.username?.slice(0, 1) || '-' }}
                  </el-avatar>
                  <span>{{ detail.username }}</span>
                </span>
              </el-descriptions-item>
              <el-descriptions-item label="订单状态">
                <div class="state-edit-row">
                  <el-select
                    v-model="editOrderState"
                    class="state-select"
                    placeholder="请选择状态"
                    :disabled="updateLoading"
                    @change="handleStateChange"
                  >
                    <el-option
                      v-for="option in orderStateOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    />
                  </el-select>
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
            </el-descriptions>
          </section>

          <section class="detail-group">
            <h3>收货与金额信息</h3>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="收货人">{{
                detail.receiverContact
              }}</el-descriptions-item>
              <el-descriptions-item label="收货人手机">{{
                detail.receiverMobile
              }}</el-descriptions-item>
              <el-descriptions-item label="收货完整地址" :span="2">
                <span class="address-cell">{{ detail.receiverAddress }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="运费">
                <span class="money">{{ formatCurrency(detail.postFee) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="实付价格总计">
                <span class="money">{{ formatCurrency(detail.payMoney) }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </section>
        </div>

        <el-table max-height="60vh" :data="detail.skus" class="detail-table" stripe>
          <el-table-column prop="skuId" label="SKU ID" min-width="180" />

          <el-table-column label="商品图片快照" width="130" align="center">
            <template #default="{ row }">
              <img :src="row.picture" :alt="row.name" class="snapshot-image" />
            </template>
          </el-table-column>

          <el-table-column prop="name" label="商品名称快照" min-width="220" show-overflow-tooltip />

          <el-table-column label="商品属性文字快照" min-width="220">
            <template #default="{ row }">
              <p class="snapshot-attrs">{{ row.attrsText }}</p>
            </template>
          </el-table-column>

          <el-table-column label="购买时单价" width="120">
            <template #default="{ row }">
              <span class="money">{{ formatCurrency(row.payPrice) }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="quantity" label="商品数量" width="100" />

          <el-table-column label="小计金额" width="120">
            <template #default="{ row }">
              <span class="money">{{ formatCurrency(row.totalPayPrice) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.detail-body {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.detail-group {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px;
  min-width: 0;
}

.detail-group h3 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #111827;
}

.user-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.address-cell {
  word-break: break-word;
}

.detail-table {
  flex: 1;
}

.money {
  color: #dc2626;
  font-weight: 700;
}

.state-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.state-select {
  width: 140px;
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

.snapshot-image {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  background: #f3f4f6;
}

.snapshot-attrs {
  margin: 0;
  color: #4b5563;
  white-space: pre-line;
  line-height: 1.4;
}

@media (max-width: 900px) {
  .detail-groups {
    grid-template-columns: 1fr;
  }
}
</style>
