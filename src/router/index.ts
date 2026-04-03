import Layout from '@/views/Layout.vue'
import Login from '@/views/login/index.vue'
import Home from '@/views/home/index.vue'
import Products from '@/views/products/index.vue'
import Orders from '@/views/orders/index.vue'
import Users from '@/views/users/index.vue'
import More from '@/views/more/index.vue'
import pinia, { useMemberStore } from '@/stores'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      component: Login,
    },
    {
      path: '/',
      component: Layout,
      redirect: '/home',
      children: [
        {
          path: 'home',
          component: Home,
        },
        {
          path: 'products',
          component: Products,
        },
        {
          path: 'orders',
          component: Orders,
        },
        {
          path: 'users',
          component: Users,
        },
        {
          path: 'more',
          component: More,
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const memberStore = useMemberStore(pinia)
  const hasToken = Boolean(memberStore.token)

  // if (to.path === '/login' && hasToken) {
  //   return '/home'
  // }

  if (to.path !== '/login' && !hasToken) {
    return '/login'
  }

  return true
})

export default router
