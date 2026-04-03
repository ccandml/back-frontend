import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()

// 注册持久化插件，使各 store 的 persist 配置生效。
pinia.use(piniaPluginPersistedstate)

export default pinia

export * from './modules/user'
