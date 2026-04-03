<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import { login } from '@/service/user'
import { useMemberStore } from '@/stores'

type LoginForm = {
  username: string
  password: string
}

const router = useRouter()
const memberStore = useMemberStore()
const loading = ref(false)

const form = reactive<LoginForm>({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const formRef = ref<{
  validate: () => Promise<boolean>
} | null>(null)

const handleLogin = async () => {
  if (!formRef.value) {
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    const result = await login({
      username: form.username.trim(),
      password: form.password,
    })

    // 登录接口返回 access_token/id/username/avatar/role，直接持久化到会员 store。
    memberStore.setProfile(result)
    ElMessage.success('登录成功')
    await router.replace('/home')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="login-page">
    <div class="bg-grid"></div>

    <div class="login-card">
      <div class="head">
        <div class="brand-row">
          <span class="brand-mark" aria-hidden="true">CX</span>
          <p class="brand-name">晨曦优选</p>
        </div>
        <p class="title">管理后台登录</p>
        <p class="desc">欢迎回来，请输入管理员账号密码</p>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" placeholder="请输入账号（管理员1）" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（123123）"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button type="primary" class="submit" :loading="loading" @click="handleLogin">
          登录
        </el-button>
      </el-form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 20%, #e0f2fe 0%, transparent 40%),
    radial-gradient(circle at 80% 10%, #fee2e2 0%, transparent 36%),
    radial-gradient(circle at 85% 80%, #dcfce7 0%, transparent 34%), #f8fafc;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(15, 23, 42, 0.04) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(circle at center, #000 40%, transparent 100%);
}

.login-card {
  width: min(420px, 92vw);
  border-radius: 16px;
  border: 1px solid #dbe4f0;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(6px);
  padding: 26px 24px 20px;
  position: relative;
  z-index: 1;
  transform: translateY(-65px);
}

@media (max-width: 720px) {
  .login-card {
    transform: translateY(-8px);
  }
}

.head {
  margin-bottom: 10px;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: linear-gradient(135deg, #0ea5e9, #22c55e);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.brand-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.3px;
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.desc {
  margin: 8px 0 0;
  color: #475569;
  font-size: 13px;
}

.submit {
  width: 100%;
  margin-top: 8px;
  height: 40px;
}
</style>
