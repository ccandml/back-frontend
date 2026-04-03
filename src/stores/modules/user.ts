import type { MemberData } from '@/views/users/types/result'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useMemberStore = defineStore(
  'adminMember',
  () => {
    // 会员信息。
    const profile = ref<MemberData>()

    // 常用 token 读取，拦截器可直接消费该值。
    const token = computed(() => profile.value?.access_token || '')

    // 角色字段兼容两种来源：新字段 role 与历史 roleNames。
    const role = computed(() => profile.value?.role || profile.value?.roleNames?.[0] || '')

    // 保存会员信息。
    const setProfile = (val: MemberData) => {
      profile.value = val
      profile.value.username = val.username
      profile.value.avatar = val.avatar
    }

    const setUsername = (username: string) => {
      if (profile.value) {
        profile.value.username = username
      }
    }

    const setAvatar = (avatar: string) => {
      if (profile.value) {
        profile.value.avatar = avatar
      }
    }

    const setRole = (role: string) => {
      if (profile.value) {
        profile.value.role = role
      }
    }

    // 清理会员信息。
    const clearProfile = () => {
      profile.value = undefined
    }

    return {
      profile,
      token,
      role,
      setProfile,
      setUsername,
      setAvatar,
      setRole,
      clearProfile,
    }
  },
  {
    // 持久化到浏览器本地存储，刷新后可恢复登录态。
    persist: {
      key: 'member',
      storage: localStorage,
      pick: ['profile'],
    },
  },
)
