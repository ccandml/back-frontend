<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useMemberStore } from '@/stores'

const memberStore = useMemberStore()
const route = useRoute()

const displayName = computed(() => memberStore.profile?.username || '管理员')
const displayRole = computed(() => memberStore.role || '未设置角色')
const displayAvatar = computed(() => memberStore.profile?.avatar || '')
const avatarText = computed(() => {
  const name = displayName.value.trim()
  return name ? name.slice(0, 1).toUpperCase() : '管'
})

const navItems = [
  {
    title: '工作台',
    path: '/home',
    desc: '总览看板',
  },
  {
    title: '商品管理',
    path: '/products',
    desc: '商品维护与上下架',
  },
  {
    title: '订单管理',
    path: '/orders',
    desc: '订单查询与发货跟踪',
  },
  {
    title: '用户管理',
    path: '/users',
    desc: '账号资料与状态管理',
  },
  {
    title: '更多',
    path: '/more',
    desc: '个人信息与快捷操作',
  },
]

const currentNavTitle = computed(() => {
  const currentPath = route.path
  const matched = navItems.find((item) => item.path === currentPath)
  return matched?.title || '页面'
})

const breadcrumbs = computed(() => ['首页', currentNavTitle.value])
</script>

<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">CX</div>
        <div>
          <p class="title">管理后台</p>
          <p class="sub-title">晨曦优选</p>
        </div>
      </div>

      <nav class="nav-list">
        <template v-for="item in navItems" :key="item.title">
          <RouterLink v-if="item.path" :to="item.path" class="nav-item">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-desc">{{ item.desc }}</span>
          </RouterLink>
          <div v-else class="nav-item nav-item-disabled">
            <span class="item-title">{{ item.title }}</span>
            <span class="item-desc">{{ item.desc }}</span>
          </div>
        </template>
      </nav>
    </aside>

    <section class="main-panel">
      <div class="topbar">
        <div class="breadcrumb">
          <span v-for="(item, index) in breadcrumbs" :key="item" class="crumb-item">
            <span>{{ item }}</span>
            <span v-if="index < breadcrumbs.length - 1" class="crumb-separator">/</span>
          </span>
        </div>

        <RouterLink to="/more" class="user-box user-link">
          <el-avatar :size="34" :src="displayAvatar" class="avatar">{{ avatarText }}</el-avatar>
          <div class="user-meta">
            <p class="user-name">{{ displayName }}</p>
            <p class="user-role">{{ displayRole }}</p>
          </div>
        </RouterLink>
      </div>

      <div class="panel-body">
        <main class="content">
          <RouterView />
        </main>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.admin-shell {
  height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%);
  overflow: hidden;
}

.sidebar {
  padding: 24px 16px;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
  color: #111827;
  overflow: hidden;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 10px;
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #2563eb;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.sub-title {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.nav-list {
  display: grid;
  gap: 8px;
}

.nav-item {
  text-decoration: none;
  color: inherit;
  border: 1px solid transparent;
  border-radius: 10px;
  padding: 10px 12px;
  display: grid;
  gap: 2px;
  background: #ffffff;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.nav-item:hover {
  border-color: #e5e7eb;
  background: #f9fafb;
  color: #1f2937;
}

.nav-item.router-link-active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.12);
}

.nav-item-disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.nav-item-disabled:hover {
  border-color: transparent;
  background: #ffffff;
  color: #111827;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
}

.item-desc {
  font-size: 12px;
  color: #6b7280;
}

.main-panel {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 60px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-body {
  padding: 15px 24px 20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 13px;
}

.crumb-item {
  display: inline-flex;
  align-items: center;
}

.crumb-item:last-child {
  color: #111827;
  font-weight: 600;
}

.crumb-separator {
  margin: 0 8px;
  color: #9ca3af;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-link {
  color: inherit;
  text-decoration: none;
  border-radius: 10px;
  padding: 4px 6px;
  transition: background-color 0.2s ease;
}

.user-link:hover {
  background: #f8fafc;
}

.avatar {
  width: 34px;
  height: 34px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 700;
}

.user-meta {
  display: grid;
  gap: 2px;
}

.user-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1;
}

.user-role {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #0f172a;
}

.header {
  margin-top: 0;
}

.header p {
  margin: 8px 0 0;
  color: #475569;
}

.content {
  margin-top: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

:global(html),
:global(body),
:global(#app) {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: none;
    border-bottom: 1px solid #1e293b;
  }

  .main-panel {
    height: auto;
  }

  .topbar {
    height: auto;
    min-height: 56px;
    padding: 10px 16px;
  }

  .panel-body {
    padding: 14px 16px 16px;
  }
}
</style>
