import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Register from './views/Register.vue'
import Home from './views/Home.vue' // Placeholder
import Leaderboard from './views/Leaderboard.vue'
import Profile from './views/Profile.vue'
import { useAuthStore } from './stores/auth'

const routes = [
    { path: '/', component: Home, meta: { requiresAuth: true } },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/leaderboard', component: Leaderboard, meta: { requiresAuth: true } },
    { path: '/profile/:id?', component: Profile, meta: { requiresAuth: true } },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    if (to.meta.requiresAuth && !authStore.token) {
        next('/login')
    } else {
        next()
    }
})

export default router
