<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { codeToText, regionData } from 'element-china-area-data'

import { createUser, deleteUser, getUserDetail, getUsersList } from '@/service/user'
import UserDetailDialog from '@/views/users/components/UserDetailDialog.vue'
import type { AdminUserDetailResult, AdminUserListItem } from '@/views/users/types/result'

type SortField = 'createTime' | 'orderCount' | 'totalPayMoney'
type SortOrder = 'ASC' | 'DESC'
type GenderLabel = '男' | '女' | '未知'
type RoleLabel = '超级管理员' | '管理员' | '普通用户'
type RoleTagType = 'danger' | 'warning' | 'info'

type UserRow = AdminUserListItem & {
  genderLabel: GenderLabel
}

type CreateUserForm = {
  username: string
  password: string
  roleId: 2 | 3
  gender?: string
  birthday?: string
  avatar?: string
  profession?: string
  fullLocation?: string
}

const loading = ref(false)
const detailLoading = ref(false)
const users = ref<UserRow[]>([])
const pageSize = 8
const currentPage = ref(1)
const total = ref(0)
const keyword = ref('')
const sortField = ref<SortField | ''>('')
const sortOrder = ref<SortOrder | ''>('')
const detailVisible = ref(false)
const activeUserId = ref<number | null>(null)
const detailMap = ref<Record<number, AdminUserDetailResult>>({})
const deletingUserIds = ref<number[]>([])
const createVisible = ref(false)
const creating = ref(false)
const locationCodes = ref<string[]>([])

const createForm = ref<CreateUserForm>({
  username: '',
  password: '',
  roleId: 3,
  gender: '',
  birthday: '',
  avatar: '',
  profession: '',
  fullLocation: '',
})

const createFormRef = ref<{
  validate: () => Promise<boolean>
  resetFields: () => void
} | null>(null)

const createRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const hasData = computed(() => users.value.length > 0)

const activeUser = computed(() => {
  if (activeUserId.value === null) {
    return null
  }

  return users.value.find((item) => item.id === activeUserId.value) ?? null
})

const activeUserDetail = computed(() => {
  if (activeUserId.value === null) {
    return null
  }

  return detailMap.value[activeUserId.value] ?? null
})

const normalizeGender = (value: string): GenderLabel => {
  if (value === '男' || value === '女') {
    return value
  }
  return '未知'
}

const ROLE_TAG_MAP: Record<RoleLabel, RoleTagType> = {
  超级管理员: 'danger',
  管理员: 'warning',
  普通用户: 'info',
}

// 后端角色字段可能包含未知值，统一回退为普通用户样式，避免页面崩溃。
const getRoleTagType = (role: string): RoleTagType => {
  return ROLE_TAG_MAP[role as RoleLabel] ?? 'info'
}

const formatCurrency = (value: number) => `¥${value.toFixed(2)}`

const getSortLabel = (field: SortField) => {
  if (sortField.value !== field || !sortOrder.value) {
    return '未排序'
  }
  return sortOrder.value === 'ASC' ? '升序' : '降序'
}

// 仅允许单字段排序，点击同一字段按升序/降序/取消循环。
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

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await getUsersList({
      page: currentPage.value,
      pageSize,
      keyword: keyword.value.trim() || undefined,
      sortBy: sortField.value || undefined,
      sortOrder: sortOrder.value || undefined,
    })

    users.value = response.items.map((item) => ({
      ...item,
      genderLabel: normalizeGender(item.gender),
    }))
    total.value = response.counts
  } catch (error) {
    console.error('获取用户列表失败：', error)
    ElMessage.error(error instanceof Error ? error.message : '获取用户列表失败')
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const fetchUserDetail = async (id: number) => {
  detailLoading.value = true
  try {
    const detail = await getUserDetail(String(id))
    detailMap.value[id] = detail
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '获取用户详情失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

// 查询由按钮触发，避免输入过程频繁请求。
const handleSearch = () => {
  currentPage.value = 1
  void fetchUsers()
}

const handleReset = () => {
  keyword.value = ''
  sortField.value = ''
  sortOrder.value = ''
  currentPage.value = 1
  void fetchUsers()
}

const handlePageChange = (page: number) => {
  currentPage.value = page
  void fetchUsers()
}

const handleViewDetail = (row: UserRow) => {
  activeUserId.value = row.id
  detailVisible.value = true

  if (detailMap.value[row.id]) {
    return
  }

  void fetchUserDetail(row.id)
}

const handleDeactivate = async (row: UserRow) => {
  if (deletingUserIds.value.includes(row.id)) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认注销用户 ${row.username}（${row.id}）吗？注销后不可恢复。`,
      '注销确认',
      {
        confirmButtonText: '确认注销',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  deletingUserIds.value = [...deletingUserIds.value, row.id]
  try {
    await deleteUser(String(row.id))

    // 注销成功后直接移除当前行，避免出现“已注销”的过渡状态。
    users.value = users.value.filter((item) => item.id !== row.id)
    total.value = Math.max(0, total.value - 1)

    if (activeUserId.value === row.id) {
      activeUserId.value = null
      detailVisible.value = false
    }

    // 当前页删空且仍有数据时回退一页补齐列表。
    if (users.value.length === 0 && total.value > 0 && currentPage.value > 1) {
      currentPage.value -= 1
      await fetchUsers()
    }

    ElMessage.success('用户注销成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '用户注销失败')
  } finally {
    deletingUserIds.value = deletingUserIds.value.filter((id) => id !== row.id)
  }
}

const openCreateDialog = () => {
  createVisible.value = true
}

const closeCreateDialog = () => {
  createVisible.value = false
  createFormRef.value?.resetFields()
  locationCodes.value = []
}

// Cascader 返回行政区编码数组，提交前转换为“省市区”纯文本。
const handleLocationChange = (codes: string[]) => {
  locationCodes.value = codes
  createForm.value.fullLocation = codes
    .map((code) => codeToText[code as keyof typeof codeToText])
    .filter(Boolean)
    .join('')
}

const handleCreateUser = async () => {
  if (!createFormRef.value) {
    return
  }

  try {
    await createFormRef.value.validate()
  } catch {
    return
  }

  creating.value = true
  try {
    await createUser({
      username: createForm.value.username.trim(),
      password: createForm.value.password,
      roleId: createForm.value.roleId,
      gender: createForm.value.gender || undefined,
      birthday: createForm.value.birthday || undefined,
      avatar: createForm.value.avatar || undefined,
      profession: createForm.value.profession || undefined,
      fullLocation: createForm.value.fullLocation || undefined,
    })
    ElMessage.success('新增用户成功')
    closeCreateDialog()
    currentPage.value = 1
    await fetchUsers()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '新增用户失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => {
  void fetchUsers()
})
</script>

<template>
  <section class="users-page">
    <div class="filter-bar">
      <el-input
        v-model="keyword"
        class="filter-keyword"
        clearable
        placeholder="支持用户名/用户ID"
      />

      <div class="sort-actions">
        <el-button
          :type="sortField === 'createTime' ? 'primary' : 'default'"
          plain
          @click="toggleSort('createTime')"
        >
          注册时间（{{ getSortLabel('createTime') }}）
        </el-button>
        <el-button
          :type="sortField === 'orderCount' ? 'primary' : 'default'"
          plain
          @click="toggleSort('orderCount')"
        >
          订单数（{{ getSortLabel('orderCount') }}）
        </el-button>
        <el-button
          :type="sortField === 'totalPayMoney' ? 'primary' : 'default'"
          plain
          @click="toggleSort('totalPayMoney')"
        >
          总消费金额（{{ getSortLabel('totalPayMoney') }}）
        </el-button>
      </div>

      <div class="filter-actions">
        <el-button type="success" plain @click="openCreateDialog">新增用户</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="primary" @click="handleSearch">筛选</el-button>
      </div>
    </div>

    <div class="table-shell">
      <el-table
        v-loading="loading"
        :data="users"
        class="user-table"
        empty-text="暂无用户数据"
        stripe
      >
        <el-table-column label="用户ID" min-width="90">
          <template #default="{ row }">
            <span class="user-id">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="头像" width="100" align="center">
          <template #default="{ row }">
            <el-avatar :size="34" :src="row.avatar">{{ row.username.slice(0, 1) }}</el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户名" min-width="160" />
        <el-table-column label="用户角色" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="role-tags" v-if="row.roleNames?.length">
              <el-tag
                v-for="role in row.roleNames"
                :key="`${row.id}-${role}`"
                :type="getRoleTagType(role)"
                effect="light"
                size="small"
              >
                {{ role }}
              </el-tag>
            </div>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="注册时间" min-width="180" />
        <el-table-column prop="orderCount" label="订单数" width="100" />

        <el-table-column label="消费金额" width="130">
          <template #default="{ row }">
            <span class="money">{{ formatCurrency(row.totalPayMoney) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="op-group">
              <el-button type="primary" link @click="handleViewDetail(row)">查看详情</el-button>
              <el-button
                type="warning"
                link
                :loading="deletingUserIds.includes(row.id)"
                :disabled="deletingUserIds.includes(row.id)"
                @click="handleDeactivate(row)"
              >
                注销用户
              </el-button>
            </div>
          </template>
        </el-table-column>

        <template #append>
          <div class="table-bottom-slot">
            <div v-if="!loading && hasData" class="footer-tip">共 {{ total }} 条用户</div>
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

    <UserDetailDialog
      v-model="detailVisible"
      :loading="detailLoading"
      :user="activeUser"
      :detail="activeUserDetail"
    />

    <el-dialog
      v-model="createVisible"
      title="新增用户"
      width="560px"
      :close-on-click-modal="false"
      @closed="closeCreateDialog"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <div class="form-grid-two">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="createForm.username" placeholder="请输入用户名" clearable />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="createForm.password"
              type="password"
              placeholder="请输入密码"
              show-password
              clearable
            />
          </el-form-item>
        </div>

        <div class="form-grid-two">
          <el-form-item label="角色" prop="roleId">
            <el-select v-model="createForm.roleId" placeholder="请选择角色" class="w-full">
              <el-option :value="2" label="管理员" />
              <el-option :value="3" label="普通用户" />
            </el-select>
          </el-form-item>
          <el-form-item label="性别">
            <el-select v-model="createForm.gender" placeholder="可选" clearable class="w-full">
              <el-option value="男" label="男" />
              <el-option value="女" label="女" />
              <el-option value="未知" label="未知" />
            </el-select>
          </el-form-item>
        </div>

        <div class="form-grid-two">
          <el-form-item label="生日">
            <el-date-picker
              v-model="createForm.birthday"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="可选"
              class="w-full"
            />
          </el-form-item>
          <el-form-item label="职业">
            <el-input v-model="createForm.profession" placeholder="可选" clearable />
          </el-form-item>
        </div>

        <el-form-item label="头像链接">
          <el-input v-model="createForm.avatar" placeholder="可选，输入图片 URL" clearable />
        </el-form-item>

        <el-form-item label="省市区">
          <el-cascader
            v-model="locationCodes"
            :options="regionData"
            clearable
            filterable
            placeholder="可选，选择省/市/区"
            class="w-full"
            @change="handleLocationChange"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeCreateDialog">取消</el-button>
          <el-button type="primary" :loading="creating" @click="handleCreateUser"
            >确认新增</el-button
          >
        </div>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped lang="scss">
.users-page {
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

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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

.user-table {
  height: 100%;
}

.user-id {
  color: #1f2937;
  font-weight: 600;
}

.money {
  color: #dc2626;
  font-weight: 700;
}

.op-group {
  display: inline-flex;
  gap: 8px;
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

.form-grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.w-full {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 900px) {
  .form-grid-two {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
