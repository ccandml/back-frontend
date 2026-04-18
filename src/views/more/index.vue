<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { codeToText, regionData } from 'element-china-area-data'
import { useRouter } from 'vue-router'

import { getNotice, updateNotice } from '@/service/notice'
import { updateProfile } from '@/service/user'
import { useMemberStore } from '@/stores'

type UpdateProfileForm = {
  username: string
  gender?: string
  birthday?: string
  avatar?: string
  profession?: string
  fullLocation?: string
}

const memberStore = useMemberStore()
const router = useRouter()

const roleName = computed(() => memberStore.role || '未设置角色')
const userName = computed(() => memberStore.profile?.username || '-')
const avatarUrl = computed(() => memberStore.profile?.avatar || '')
const hasAvatar = computed(() => Boolean(avatarUrl.value))
const avatarText = computed(() => {
  const name = memberStore.profile?.username?.trim()
  return name ? name.slice(0, 1).toUpperCase() : 'U'
})

const profileSubmitting = ref(false)
const profileDialogVisible = ref(false)
const previewVisible = ref(false)
const locationCodes = ref<string[]>([])
const noticeContent = ref('')
const noticeSubmitting = ref(false)
const noticeLoading = ref(false)

const updateForm = reactive<UpdateProfileForm>({
  username: '',
  gender: '',
  birthday: '',
  avatar: '',
  profession: '',
  fullLocation: '',
})

const formRef = ref<{
  validate: () => Promise<boolean>
  resetFields: () => void
} | null>(null)

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
}

const openProfileDialog = () => {
  updateForm.username = memberStore.profile?.username || ''
  updateForm.avatar = memberStore.profile?.avatar || ''
  profileDialogVisible.value = true
}

const closeProfileDialog = () => {
  profileDialogVisible.value = false
  formRef.value?.resetFields()
  locationCodes.value = []
}

const handlePreviewAvatar = () => {
  if (!hasAvatar.value) {
    return
  }
  previewVisible.value = true
}

const closePreview = () => {
  previewVisible.value = false
}

// Cascader 返回行政区编码数组，提交前转换为“省市区”纯文本，兼容后端 fullLocation 字段。
const handleLocationChange = (codes: string[]) => {
  locationCodes.value = codes
  updateForm.fullLocation = codes
    .map((code) => codeToText[code as keyof typeof codeToText])
    .filter(Boolean)
    .join('')
}

const handleUpdateProfile = async () => {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  profileSubmitting.value = true
  try {
    await updateProfile({
      username: updateForm.username.trim() || undefined,
      gender: updateForm.gender || undefined,
      birthday: updateForm.birthday || undefined,
      avatar: updateForm.avatar || undefined,
      profession: updateForm.profession || undefined,
      fullLocation: updateForm.fullLocation || undefined,
    })

    // 资料修改成功后同步更新本地登录态，确保顶部和更多页实时显示。
    if (updateForm.username?.trim()) {
      memberStore.setUsername(updateForm.username.trim())
    }
    if (updateForm.avatar !== undefined) {
      memberStore.setAvatar(updateForm.avatar || '')
    }

    ElMessage.success('个人信息更新成功')
    closeProfileDialog()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '个人信息更新失败')
  } finally {
    profileSubmitting.value = false
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确认退出当前登录账号吗？', '退出登录', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  memberStore.clearProfile()
  ElMessage.success('已退出登录')
  await router.replace('/login')
}

const handleUpdateNotice = async () => {
  const content = noticeContent.value.trim()
  if (!content) {
    ElMessage.warning('请输入系统公告内容')
    return
  }

  noticeSubmitting.value = true
  try {
    await updateNotice(content)
    ElMessage.success('系统公告更新成功')
    // 保存成功后回写去除首尾空白的内容，保持界面与提交数据一致。
    noticeContent.value = content
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '系统公告更新失败')
  } finally {
    noticeSubmitting.value = false
  }
}

const loadNotice = async () => {
  noticeLoading.value = true
  try {
    const result = await getNotice()
    // 接口返回为空时回退空字符串，避免输入框出现 undefined。
    noticeContent.value = result?.content?.trim() || ''
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '系统公告加载失败')
  } finally {
    noticeLoading.value = false
  }
}

onMounted(() => {
  void loadNotice()
})
</script>

<template>
  <section class="more-page">
    <div class="header-card">
      <div class="head-bg" aria-hidden="true"></div>

      <div class="header-actions">
        <el-button text class="edit-entry" @click="openProfileDialog">修改个人信息</el-button>
        <el-button text type="danger" class="logout-btn" @click="handleLogout">退出登录</el-button>
      </div>

      <div class="account-row">
        <el-avatar
          :size="72"
          :src="avatarUrl"
          class="profile-avatar"
          :class="{ 'is-previewable': hasAvatar }"
          @click="handlePreviewAvatar"
        >
          {{ avatarText }}
        </el-avatar>

        <div class="meta">
          <p class="label">当前登录账号</p>
          <h2 class="name">{{ userName }}</h2>
          <p class="role">{{ roleName }}</p>
        </div>
      </div>
    </div>

    <div class="notice-card">
      <div class="notice-head">
        <h3 class="notice-title">系统公告</h3>
        <p class="notice-subtitle">支持在后台统一维护给所有用户展示的公告内容</p>
      </div>

      <el-input
        v-model="noticeContent"
        class="notice-input"
        type="textarea"
        :rows="6"
        maxlength="500"
        show-word-limit
        resize="none"
        placeholder="请输入系统公告内容"
        :disabled="noticeLoading"
      />

      <div class="notice-actions">
        <el-button
          type="primary"
          :loading="noticeSubmitting"
          :disabled="noticeLoading"
          @click="handleUpdateNotice"
        >
          保存公告
        </el-button>
      </div>
    </div>

    <el-dialog
      v-model="profileDialogVisible"
      title="修改个人信息"
      width="520px"
      :close-on-click-modal="false"
      @closed="closeProfileDialog"
    >
      <el-form ref="formRef" :model="updateForm" :rules="rules" label-position="top">
        <div class="grid-two">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="updateForm.username" placeholder="请输入用户名" clearable />
          </el-form-item>
          <el-form-item label="性别">
            <el-select v-model="updateForm.gender" placeholder="可选" clearable class="w-full">
              <el-option value="男" label="男" />
              <el-option value="女" label="女" />
              <el-option value="未知" label="未知" />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid-two">
          <el-form-item label="生日">
            <el-date-picker
              v-model="updateForm.birthday"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="可选"
              class="w-full"
            />
          </el-form-item>
          <el-form-item label="职业">
            <el-input v-model="updateForm.profession" placeholder="可选" clearable />
          </el-form-item>
        </div>

        <el-form-item label="头像链接">
          <el-input v-model="updateForm.avatar" placeholder="可选，输入图片 URL" clearable />
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
          <el-button @click="closeProfileDialog">取消</el-button>
          <el-button type="primary" :loading="profileSubmitting" @click="handleUpdateProfile">
            保存修改
          </el-button>
        </div>
      </template>
    </el-dialog>

    <el-image-viewer
      v-if="previewVisible && hasAvatar"
      :url-list="[avatarUrl]"
      :initial-index="0"
      :hide-on-click-modal="true"
      teleported
      @close="closePreview"
    />
  </section>
</template>

<style scoped lang="scss">
* {
  box-sizing: border-box;
}
.more-page {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 16px;
}

.header-card {
  position: relative;
  border: 1px solid #e7ecf3;
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(140deg, #ffffff 0%, #f7fafc 100%);
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.head-bg {
  position: absolute;
  inset: auto -120px -120px auto;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0));
}

.header-actions {
  position: absolute;
  bottom: 8px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
  z-index: 2;
}

.account-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-avatar {
  border: 2px solid #e2e8f0;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 700;
  cursor: default;
}

.profile-avatar.is-previewable {
  cursor: zoom-in;
}

.meta {
  display: grid;
  gap: 4px;
}

.label {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.name {
  margin: 0;
  color: #0f172a;
  font-size: 24px;
  line-height: 1.15;
}

.role {
  margin: 0;
  color: #2563eb;
  font-weight: 600;
}

.edit-entry {
  opacity: 0.62;
}

.edit-entry:hover {
  opacity: 0.95;
}

.notice-card {
  min-height: 0;
  height: 100%;
  border: 1px solid #e7ecf3;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}

.notice-head {
  display: grid;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eef2f7;
}

.notice-title {
  margin: 0;
  font-size: 17px;
  color: #0f172a;
}

.notice-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.notice-input {
  flex: 1;
  min-height: 0;

  :deep(.el-textarea) {
    height: 100%;
  }

  :deep(.el-textarea__inner) {
    height: 100%;
    min-height: 0;
    resize: none;
    overflow: hidden;
    border: none !important; /* 清除实线边框 */
    outline: none !important; /* 清除聚焦外边框 */
    box-shadow: none !important; /* 清除阴影 */
    background: transparent; /* 可选：透明背景 */
    // background: #fcfdff;
  }
}

.notice-actions {
  display: flex;
  justify-content: flex-end;
}

.logout-btn {
  opacity: 0.62;
}

.logout-btn:hover {
  opacity: 0.95;
}

.grid-two {
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

@media (max-width: 720px) {
  .header-card {
    padding: 18px;
  }

  .notice-card {
    padding: 14px;
  }

  .name {
    font-size: 20px;
  }

  .notice-actions {
    justify-content: stretch;
  }

  .notice-actions .el-button {
    width: 100%;
  }

  .grid-two {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
