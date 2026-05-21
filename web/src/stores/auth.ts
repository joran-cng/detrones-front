import { defineStore } from 'pinia'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        )
        return JSON.parse(jsonPayload)
    } catch {
        return null
    }
}

function isTokenExpired(token: string): boolean {
    if (!token) return true
    const payload = parseJwt(token)
    if (!payload || !payload.exp) return true
    return Date.now() >= payload.exp * 1000
}

export const useAuthStore = defineStore('auth', () => {
    const token = ref(localStorage.getItem('token') || '')
    const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
    const router = useRouter()
    let expiryTimer: ReturnType<typeof setTimeout> | null = null

    function setAuth(newToken: string, newUser: any) {
        token.value = newToken
        user.value = newUser
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
        scheduleAutoLogout(newToken)
    }

    function logout() {
        if (expiryTimer) {
            clearTimeout(expiryTimer)
            expiryTimer = null
        }
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.push('/login')
    }

    function scheduleAutoLogout(tok: string) {
        if (expiryTimer) {
            clearTimeout(expiryTimer)
            expiryTimer = null
        }
        if (!tok) return
        const payload = parseJwt(tok)
        if (!payload || !payload.exp) return
        const msUntilExpiry = payload.exp * 1000 - Date.now()
        if (msUntilExpiry <= 0) {
            logout()
            return
        }
        expiryTimer = setTimeout(() => {
            console.log('[auth] Token expired, auto-logout')
            logout()
        }, msUntilExpiry)
    }

    // Check on startup if token is already expired
    if (token.value && isTokenExpired(token.value)) {
        console.log('[auth] Token expired on load, logging out')
        token.value = ''
        user.value = null
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    } else if (token.value) {
        scheduleAutoLogout(token.value)
    }

    return { token, user, setAuth, logout }
})
