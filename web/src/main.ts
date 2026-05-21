import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// Global Fetch Interceptor to logout on 401 (Expired or invalid token)
const { fetch: originalFetch } = window
window.fetch = async (...args) => {
    try {
        const response = await originalFetch(...args)
        if (response.status === 401) {
            console.warn('[fetch interceptor] 401 Unauthorized detected, logging out.')
            const authStore = useAuthStore()
            authStore.logout()
        }
        return response
    } catch (error) {
        throw error;
    }
}

app.mount('#app')
