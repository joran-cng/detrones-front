<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from '../components/Button.vue'
import {
  Users,
  UserPlus,
  UserMinus,
  MessageSquare,
  Check,
  X,
  Clock,
  Send,
  Loader2,
  ChevronRight,
  Bell,
  UserCheck,
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

type Tab = 'friends' | 'received' | 'sent'
const activeTab = ref<Tab>('friends')

const friends = ref<any[]>([])
const receivedRequests = ref<any[]>([])
const sentRequests = ref<any[]>([])
const loading = ref(true)
const actionLoading = ref<string | null>(null)

let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchAll() {
  if (!authStore.token) return
  const headers = { 'Authorization': `Bearer ${authStore.token}` }

  const [friendsRes, receivedRes, sentRes] = await Promise.all([
    fetch('/api/friends', { headers }),
    fetch('/api/friends/requests', { headers }),
    fetch('/api/friends/sent', { headers }),
  ])

  if (friendsRes.ok) friends.value = await friendsRes.json()
  if (receivedRes.ok) receivedRequests.value = await receivedRes.json()
  if (sentRes.ok) sentRequests.value = await sentRes.json()

  loading.value = false
}

async function acceptRequest(requestId: string) {
  actionLoading.value = requestId
  try {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    })
    if (res.ok) await fetchAll()
  } finally {
    actionLoading.value = null
  }
}

async function declineRequest(requestId: string) {
  actionLoading.value = requestId
  try {
    const res = await fetch('/api/friends/decline', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId }),
    })
    if (res.ok) await fetchAll()
  } finally {
    actionLoading.value = null
  }
}

async function removeFriend(friendId: string) {
  actionLoading.value = friendId
  try {
    const res = await fetch('/api/friends/remove', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ friendId }),
    })
    if (res.ok) await fetchAll()
  } finally {
    actionLoading.value = null
  }
}

function getInitials(username: string) {
  return (username || '?').slice(0, 2).toUpperCase()
}

function resolveAvatar(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `http://localhost:3000${url}`
}

onMounted(() => {
  fetchAll()
  pollInterval = setInterval(fetchAll, 15000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<template>
  <div class="px-4 py-6 sm:px-8 sm:py-10">
    <div class="w-full max-w-3xl mx-auto">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6 sm:mb-8 flex-wrap">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: rgba(155,113,52,0.15); border: 1px solid rgba(155,113,52,0.25);">
          <Users class="w-5 h-5" style="color: #b8935c;" />
        </div>
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-slate-100">Amis</h1>
          <p class="text-[10px] sm:text-xs font-bold uppercase tracking-widest" style="color: #64748b;">Gérer vos relations</p>
        </div>
        <!-- Badge demandes reçues -->
        <div v-if="receivedRequests.length > 0"
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black animate-pulse"
          style="background: rgba(251,191,36,0.15); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3);">
          <Bell class="w-3.5 h-3.5" />
          {{ receivedRequests.length }} demande{{ receivedRequests.length > 1 ? 's' : '' }}
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-2xl mb-6" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
        <button
          v-for="tab in [
            { key: 'friends', label: 'Mes amis', labelMobile: 'Amis', icon: UserCheck, count: friends.length },
            { key: 'received', label: 'Reçues', labelMobile: 'Reçues', icon: Bell, count: receivedRequests.length, highlight: receivedRequests.length > 0 },
            { key: 'sent', label: 'Envoyées', labelMobile: 'Envoyées', icon: Send, count: sentRequests.length },
          ]"
          :key="tab.key"
          @click="activeTab = tab.key as Tab"
          class="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all"
          :style="activeTab === tab.key
            ? 'background: rgba(155,113,52,0.2); color: #fbbf24; border: 1px solid rgba(155,113,52,0.4);'
            : 'color: #64748b; border: 1px solid transparent;'"
        >
          <component :is="tab.icon" class="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span class="hidden sm:inline">{{ tab.label }}</span>
          <span class="sm:hidden">{{ tab.labelMobile }}</span>
          <span v-if="tab.count > 0"
            class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-mono min-w-[18px] sm:min-w-[20px] text-center"
            :style="tab.highlight
              ? 'background: rgba(251,191,36,0.2); color: #fbbf24;'
              : 'background: rgba(255,255,255,0.08); color: #94a3b8;'"
          >{{ tab.count }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-16 gap-3 text-slate-500">
        <Loader2 class="w-6 h-6 animate-spin" style="color: #9b7134;" />
        <span class="text-sm font-bold uppercase tracking-widest">Chargement...</span>
      </div>

      <template v-else>

        <!-- ══ TAB: Mes amis ══ -->
        <div v-if="activeTab === 'friends'">
          <div v-if="friends.length === 0"
            class="rounded-2xl p-12 text-center"
            style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.07);">
            <Users class="w-10 h-10 mx-auto mb-3 opacity-20" style="color: #9b7134;" />
            <p class="font-bold text-slate-400 mb-1">Aucun ami pour l'instant</p>
            <p class="text-sm text-slate-600">Envoyez des demandes depuis le <router-link to="/leaderboard" class="text-primary hover:underline font-bold">classement</router-link> !</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="friend in friends"
              :key="friend.id"
              class="rounded-2xl p-4 flex items-center gap-4 group transition-all"
              style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);"
            >
              <!-- Avatar -->
              <div
                class="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black border cursor-pointer"
                style="border-color: rgba(155,113,52,0.2); background: linear-gradient(135deg, rgba(155,113,52,0.15), rgba(184,147,92,0.08));"
                @click="router.push(`/profile/${friend.id}`)"
              >
                <img v-if="resolveAvatar(friend.avatarUrl)" :src="resolveAvatar(friend.avatarUrl)!" :alt="friend.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                <span v-else style="color: #b8935c;">{{ getInitials(friend.username) }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0 cursor-pointer" @click="router.push(`/profile/${friend.id}`)">
                <div class="font-bold text-slate-200 group-hover:text-primary-light transition-colors">{{ friend.username }}</div>
                <div class="text-xs font-mono mt-0.5" style="color: #64748b;">{{ friend.mmr }} <span class="text-[10px] uppercase font-bold">MMR</span></div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  :icon="MessageSquare"
                  @click="router.push(`/conversations/${friend.id}`)"
                >
                  Tchater
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  :icon="UserMinus"
                  :loading="actionLoading === friend.id"
                  @click="removeFriend(friend.id)"
                  title="Retirer des amis"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ══ TAB: Demandes reçues ══ -->
        <div v-if="activeTab === 'received'">
          <div v-if="receivedRequests.length === 0"
            class="rounded-2xl p-12 text-center"
            style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.07);">
            <Bell class="w-10 h-10 mx-auto mb-3 opacity-20" style="color: #9b7134;" />
            <p class="font-bold text-slate-400">Aucune demande reçue</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="req in receivedRequests"
              :key="req.requestId"
              class="rounded-2xl p-4 flex items-center gap-4 transition-all"
              style="background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.12);"
            >
              <!-- Avatar -->
              <div
                class="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black border cursor-pointer"
                style="border-color: rgba(251,191,36,0.25); background: rgba(251,191,36,0.08);"
                @click="router.push(`/profile/${req.from.id}`)"
              >
                <img v-if="resolveAvatar(req.from.avatarUrl)" :src="resolveAvatar(req.from.avatarUrl)!" :alt="req.from.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                <span v-else style="color: #fbbf24;">{{ getInitials(req.from.username) }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-200">{{ req.from.username }}</div>
                <div class="text-xs mt-0.5" style="color: #64748b;">
                  <Clock class="w-3 h-3 inline mr-1 -mt-0.5" />
                  {{ new Date(req.createdAt).toLocaleDateString('fr-FR') }}
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  :icon="Check"
                  :loading="actionLoading === req.requestId"
                  @click="acceptRequest(req.requestId)"
                >
                  Accepter
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  :icon="X"
                  :loading="actionLoading === req.requestId"
                  @click="declineRequest(req.requestId)"
                >
                  Refuser
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ TAB: Demandes envoyées ══ -->
        <div v-if="activeTab === 'sent'">
          <div v-if="sentRequests.length === 0"
            class="rounded-2xl p-12 text-center"
            style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.07);">
            <Send class="w-10 h-10 mx-auto mb-3 opacity-20" style="color: #9b7134;" />
            <p class="font-bold text-slate-400">Aucune demande envoyée</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="req in sentRequests"
              :key="req.requestId"
              class="rounded-2xl p-4 flex items-center gap-4 transition-all"
              style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);"
            >
              <!-- Avatar -->
              <div
                class="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black border"
                style="border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.04);"
              >
                <img v-if="resolveAvatar(req.to.avatarUrl)" :src="resolveAvatar(req.to.avatarUrl)!" :alt="req.to.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                <span v-else style="color: #94a3b8;">{{ getInitials(req.to.username) }}</span>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-200">{{ req.to.username }}</div>
                <div class="flex items-center gap-1.5 text-xs mt-0.5" style="color: #9b7134;">
                  <Clock class="w-3 h-3" />
                  <span>En attente d'acceptation…</span>
                </div>
              </div>

              <!-- Cancel -->
              <Button
                variant="ghost"
                size="sm"
                :icon="X"
                :loading="actionLoading === req.requestId"
                @click="declineRequest(req.requestId)"
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>
