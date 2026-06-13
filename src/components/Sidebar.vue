<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from './Button.vue'
import * as Icons from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const currentPath = computed(() => route.path)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// Check active state
const isLobbyActive = computed(() => currentPath.value === '/')
const isLeaderboardActive = computed(() => currentPath.value === '/leaderboard')
const isProfileActive = computed(() => currentPath.value.startsWith('/profile'))
const isFriendsActive = computed(() => currentPath.value === '/friends')
const isConversationsActive = computed(() => currentPath.value.startsWith('/conversations'))

// Notification badge
const pendingRequests = ref(0)
const unreadMessages = ref(0)

let notifInterval: ReturnType<typeof setInterval> | null = null

async function fetchNotifications() {
  if (!authStore.token) return
  try {
    const res = await fetch('/api/chat/notifications', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      pendingRequests.value = data.pendingRequests
      unreadMessages.value = data.unreadMessages
    }
  } catch {}
}

onMounted(() => {
  // Polling désactivé car le chat n'est pas implémenté côté serveur
  // fetchNotifications()
  // notifInterval = setInterval(fetchNotifications, 30000)
})

onUnmounted(() => {
  if (notifInterval) clearInterval(notifInterval)
})
</script>

<template>
  <aside 
    class="w-64 h-screen fixed left-0 top-0 z-30 flex flex-col justify-between border-r select-none bg-background-2"
    style="border-color: rgba(255, 255, 255, 0.03);"
  >
    <!-- Top Section -->
    <div class="flex flex-col flex-1 overflow-y-auto">
      <!-- Brand Logo -->
      <div class="pt-8 pb-6 px-6 flex flex-col items-center text-center">
        <!-- Premium Gold Crown Logo -->
        <div class="mb-2 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Président Logo" 
            class="w-10 h-auto object-contain"
          />
        </div>
        <div>
          <h1 class="font-extrabold text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-primary to-primary-dark uppercase leading-none font-cinzel" style="filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.45));">Président</h1>
          <div class="flex items-center justify-center gap-2.5 mt-2.5 w-full">
            <span class="h-[1px] w-5 bg-primary/50"></span>
            <span class="text-[9px] font-bold text-primary-light tracking-[0.25em] uppercase">Online Arena</span>
            <span class="h-[1px] w-5 bg-primary/50"></span>
          </div>
        </div>
      </div>

      <!-- User Profile Card -->
      <div v-if="authStore.user" class="px-5 py-2 mb-6">
        <div class="p-3.5 rounded-2xl bg-background-2 border border-white/[0.04] flex items-center gap-3">
          <!-- Avatar -->
          <div class="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-[#0d121f] border-2 border-primary flex items-center justify-center shadow-inner">
            <img 
              v-if="authStore.user.avatarUrl" 
              :src="authStore.user.avatarUrl.startsWith('http') ? authStore.user.avatarUrl : `http://localhost:3000${authStore.user.avatarUrl}`" 
              :alt="authStore.user.username" 
              class="w-full h-full object-cover" 
              @error="(e: any) => e.target.style.display='none'" 
            />
            <span v-else class="text-base font-bold text-primary-light tracking-wider font-cinzel">
              {{ (authStore.user.username || '?').slice(0, 2).toUpperCase() }}
            </span>
          </div>
          
          <!-- User Info -->
          <div class="min-w-0 flex-1 flex flex-col justify-center">
            <h2 class="text-sm font-bold text-white truncate cursor-pointer hover:text-primary transition-colors leading-tight" @click="router.push(authStore.user ? `/profile/${authStore.user.id}` : '/')">
              {{ authStore.user.username }}
            </h2>
            <div class="flex items-center gap-1.5 mt-1 text-[11px] text-slate-300 font-semibold leading-none">
              <component :is="Icons.Swords" class="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
              <span>{{ authStore.user.mmr || 1000 }} MMR</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation links -->
      <nav class="px-4 space-y-2">
        <!-- Salon de Jeu -->
        <Button
          :variant="isLobbyActive ? 'primary' : 'ghost'"
          :shade="isLobbyActive ? 'dark' : 'default'"
          :icon="Icons.Gamepad2"
          full-width
          size="md"
          class="!justify-start"
          @click="router.push('/')"
        >
          Salon de Jeu
        </Button>

        <!-- Classement -->
        <Button
          :variant="isLeaderboardActive ? 'primary' : 'ghost'"
          :shade="isLeaderboardActive ? 'dark' : 'default'"
          :icon="Icons.Trophy"
          full-width
          size="md"
          class="!justify-start"
          @click="router.push('/leaderboard')"
        >
          Classement
        </Button>

        <!-- Amis -->
        <div class="relative">
          <Button
            :variant="isFriendsActive ? 'primary' : 'ghost'"
            :shade="isFriendsActive ? 'dark' : 'default'"
            :icon="Icons.Users"
            full-width
            size="md"
            class="!justify-start"
            @click="router.push('/friends')"
          >
            Amis
          </Button>
          <!-- Notification badge for requests -->
          <div
            v-if="pendingRequests > 0"
            class="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black pointer-events-none"
            style="background: #fbbf24; color: #0f0c00;"
          >
            {{ pendingRequests > 9 ? '9+' : pendingRequests }}
          </div>
        </div>

        <!-- Conversations (Désactivé car non implémenté)
        <div class="relative">
          <Button
            :variant="isConversationsActive ? 'primary' : 'ghost'"
            :shade="isConversationsActive ? 'dark' : 'default'"
            :icon="Icons.MessageSquare"
            full-width
            size="md"
            class="!justify-start"
            @click="router.push('/conversations')"
          >
            Conversations
          </Button>
          <div
            v-if="unreadMessages > 0"
            class="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black pointer-events-none"
            style="background: #fbbf24; color: #0f0c00;"
          >
            {{ unreadMessages > 9 ? '9+' : unreadMessages }}
          </div>
        </div>
        -->

        <!-- Mon Profil -->
        <Button
          :variant="isProfileActive ? 'primary' : 'ghost'"
          :shade="isProfileActive ? 'dark' : 'default'"
          :icon="Icons.User"
          full-width
          size="md"
          class="!justify-start"
          @click="router.push(authStore.user ? `/profile/${authStore.user.id}` : '/profile')"
        >
          Mon Profil
        </Button>
      </nav>
    </div>

    <!-- Bottom Section -->
    <div class="p-5 border-t" style="border-color: rgba(255, 255, 255, 0.03);">
      <Button
        variant="ghost"
        :icon="Icons.LogOut"
        full-width
        size="md"
        class="!justify-start"
        @click="handleLogout"
      >
        Déconnexion
      </Button>
    </div>
  </aside>
</template>
