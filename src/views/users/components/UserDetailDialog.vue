<script setup lang="ts">
import { computed } from 'vue'

import type { AdminUserDetailResult, AdminUserListItem } from '@/views/users/types/result'

type OrderStatusLabel = '待付款' | '待发货' | '待收货' | '待评价' | '已完成' | '已取消'
type GenderLabel = '男' | '女' | '未知'
type RoleLabel = '超级管理员' | '管理员' | '普通用户'
type RoleTagType = 'danger' | 'warning' | 'info'

type UserTableRow = AdminUserListItem & {
  genderLabel: GenderLabel
}

const visible = defineModel<boolean>({ required: true })

const props = defineProps<{
  loading: boolean
  user: UserTableRow | null
  detail: AdminUserDetailResult | null
}>()

const ORDER_STATE_MAP: Record<number, OrderStatusLabel> = {
  1: '待付款',
  2: '待发货',
  3: '待收货',
  4: '待评价',
  5: '已完成',
  6: '已取消',
}

const detailReady = computed(() => Boolean(props.user && props.detail))

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`

const ROLE_TAG_MAP: Record<RoleLabel, RoleTagType> = {
  超级管理员: 'danger',
  管理员: 'warning',
  普通用户: 'info',
}

// 后端角色字段可能包含未知值，统一回退为普通用户样式，避免页面崩溃。
const getRoleTagType = (role: string): RoleTagType => {
  return ROLE_TAG_MAP[role as RoleLabel] ?? 'info'
}

const getOrderStateLabel = (state: number): OrderStatusLabel => {
  return ORDER_STATE_MAP[state] ?? '已完成'
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="用户详情"
    width="min(1280px, 94vw)"
    top="4vh"
    class="user-detail-dialog"
    destroy-on-close
  >
    <div v-loading="loading" class="detail-main">
      <template v-if="detailReady && user && detail">
        <div class="detail-top-row">
          <section class="info-group">
            <h3>用户基础信息</h3>
            <div class="info-grid info-grid-six">
              <div class="info-item">
                <span class="label">用户ID</span>
                <span class="value">{{ user.id }}</span>
              </div>
              <div class="info-item">
                <span class="label">头像</span>
                <span class="value">
                  <el-avatar :size="22" :src="user.avatar">{{
                    user.username.slice(0, 1)
                  }}</el-avatar>
                </span>
              </div>
              <div class="info-item">
                <span class="label">用户名</span>
                <span class="value">{{ detail.profile.username }}</span>
              </div>
              <div class="info-item">
                <span class="label">性别</span>
                <span class="value">{{ user.genderLabel }}</span>
              </div>
              <div class="info-item">
                <span class="label">用户角色</span>
                <div class="value role-tags" v-if="detail.profile.roleNames?.length">
                  <el-tag
                    v-for="role in detail.profile.roleNames"
                    :key="`detail-${detail.profile.id}-${role}`"
                    :type="getRoleTagType(role)"
                    effect="light"
                    size="small"
                  >
                    {{ role }}
                  </el-tag>
                </div>
                <span class="value" v-else>-</span>
              </div>
              <div class="info-item">
                <span class="label">注册时间</span>
                <span class="value">{{ detail.profile.createTime }}</span>
              </div>
            </div>
          </section>

          <section class="info-group">
            <h3>统计信息</h3>
            <div class="info-grid info-grid-three">
              <div class="info-item">
                <span class="label">订单总数</span>
                <span class="value">{{ detail.stats.orderCount }}</span>
              </div>
              <div class="info-item">
                <span class="label">累计消费金额</span>
                <span class="value money">{{ formatCurrency(detail.stats.totalPayMoney) }}</span>
              </div>
              <div class="info-item">
                <span class="label">最近下单时间</span>
                <span class="value">{{ detail.stats.latestOrderTime || '-' }}</span>
              </div>
            </div>
          </section>
        </div>

        <section class="detail-table-card">
          <h3>收货地址</h3>
          <el-table :data="detail.addresses" class="detail-table" max-height="180" stripe>
            <el-table-column prop="receiver" label="收货人" min-width="120" />
            <el-table-column prop="mobile" label="手机号" min-width="140" />
            <el-table-column
              prop="fullAddress"
              label="完整地址"
              min-width="320"
              show-overflow-tooltip
            />
            <el-table-column label="是否默认" width="120">
              <template #default="{ row }">
                <el-tag :type="row.isDefault ? 'success' : 'warning'" effect="light">
                  {{ row.isDefault ? '是' : '否' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <section class="detail-table-card grow">
          <h3>最近订单</h3>
          <el-table max-height="40vh" :data="detail.recentOrders" class="detail-table" stripe>
            <el-table-column prop="id" label="订单ID" min-width="200" />
            <el-table-column prop="createTime" label="下单时间" min-width="180" />
            <el-table-column label="订单金额" width="130">
              <template #default="{ row }">
                <span class="money">{{ formatCurrency(row.payMoney) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="订单状态" width="120">
              <template #default="{ row }">
                <span class="status-tag" :class="`status-${getOrderStateLabel(row.orderState)}`">
                  {{ getOrderStateLabel(row.orderState) }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </template>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.user-detail-dialog :deep(.el-dialog) {
  min-height: 60vh;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.user-detail-dialog :deep(.el-dialog__body) {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: auto;
}

.detail-main {
  flex: 1;
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-top-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
}

.info-group {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 8px 10px;
  background: #ffffff;
}

.info-group h3 {
  margin: 0 0 6px;
  font-size: 13px;
  color: #111827;
}

.info-grid {
  display: grid;
  gap: 6px 8px;
}

.info-grid-six {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.info-grid-three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-item {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.info-item .label {
  font-size: 11px;
  color: #6b7280;
}

.info-item .value {
  font-size: 12px;
  color: #111827;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-table-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.detail-table-card h3 {
  margin: 0;
  padding: 8px 10px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  color: #111827;
}

.detail-table-card.grow {
  flex: 1;
  min-height: 280px;
}

.money {
  color: #dc2626;
  font-weight: 700;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
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

@media (max-width: 1200px) {
  .info-grid-six {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .detail-top-row {
    grid-template-columns: 1fr;
  }

  .info-grid-six,
  .info-grid-three {
    grid-template-columns: 1fr;
  }
}
</style>
