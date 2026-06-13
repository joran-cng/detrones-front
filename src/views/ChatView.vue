<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Send, Loader2, MessageSquare } from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const friendId = computed(() => route.params.id as string | undefined)
const friend = ref<any>(null)
const messages = ref<any[]>([])
const newMessage = ref('')
const loading = ref(false)
const sendLoading = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

const conversations = ref<any[]>([])
const loadingConversations = ref(true)

let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchConversations(silent = false) {
  if (!authStore.token) return
  if (!silent) loadingConversations.value = true

  try {
    const res = await fetch('/api/chat/conversations', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      conversations.value = await res.json()
    }
  } catch (error) {
    console.error('Error fetching conversations:', error)
  } finally {
    if (!silent) loadingConversations.value = false
  }
}

async function fetchFriend() {
  if (!friendId.value) return
  try {
    const res = await fetch(`/api/users/${friendId.value}`)
    if (res.ok) friend.value = await res.json()
  } catch (error) {
    console.error('Error fetching friend:', error)
  }
}

async function fetchMessages(silent = false) {
  if (!friendId.value || !authStore.token) return
  if (!silent) loading.value = true

  try {
    const res = await fetch(`/api/chat/${friendId.value}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      messages.value = data
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error fetching messages:', error)
  } finally {
    if (!silent) loading.value = false
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || sendLoading.value || !friendId.value) return
  sendLoading.value = true
  const content = newMessage.value.trim()
  newMessage.value = ''

  try {
    const res = await fetch(`/api/chat/${friendId.value}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const msg = await res.json()
      messages.value.push(msg)
      await nextTick()
      scrollToBottom()
      // Immediately refresh conversations for last message preview
      fetchConversations(true)
    }
  } catch (error) {
    console.error('Error sending message:', error)
  } finally {
    sendLoading.value = false
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function resolveAvatar(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('http') ? url : `http://localhost:3000${url}`
}

function getInitials(username: string) {
  return (username || '?').slice(0, 2).toUpperCase()
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

// Group messages by date
const groupedMessages = computed(() => {
  const groups: { date: string; messages: any[] }[] = []
  let currentDate = ''

  for (const msg of messages.value) {
    const date = formatDate(msg.createdAt)
    if (date !== currentDate) {
      currentDate = date
      groups.push({ date, messages: [] })
    }
    groups[groups.length - 1].messages.push(msg)
  }

  return groups
})

function isMyMessage(msg: any) {
  return msg.senderId === authStore.user?.id
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(async () => {
  await fetchConversations()
  if (friendId.value) {
    loading.value = true
    await Promise.all([fetchFriend(), fetchMessages()])
  }
  // Poll for updates every 4 seconds
  pollInterval = setInterval(async () => {
    await fetchConversations(true)
    if (friendId.value) {
      await fetchMessages(true)
    }
  }, 4000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

watch(friendId, async (newVal) => {
  if (newVal) {
    messages.value = []
    friend.value = null
    loading.value = true
    await Promise.all([fetchFriend(), fetchMessages()])
  } else {
    messages.value = []
    friend.value = null
  }
})
</script>

<template>
  <div class="flex h-full absolute inset-0 text-white overflow-hidden" style="background: #070c15;">
    <!-- LEFT PANE: Conversations list -->
    <div class="w-80 border-r flex flex-col flex-shrink-0" style="background: #0b111e; border-color: rgba(255, 255, 255, 0.05);">
      <!-- Title Header -->
      <div class="px-6 py-5 border-b flex items-center justify-between flex-shrink-0" style="border-color: rgba(255, 255, 255, 0.05);">
        <h2 class="text-lg font-black text-slate-100 flex items-center gap-2">
          <MessageSquare class="w-5 h-5" style="color: #b8935c;" />
          Conversations
        </h2>
      </div>

      <!-- Conversations Scrollable Area -->
      <div class="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-custom">
        <div v-if="loadingConversations" class="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
          <Loader2 class="w-5 h-5 animate-spin" style="color: #9b7134;" />
          <span class="text-xs font-bold uppercase tracking-wider">Chargement...</span>
        </div>

        <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center py-12 px-4 text-center gap-2 text-slate-500">
          <MessageSquare class="w-8 h-8 opacity-20" style="color: #9b7134;" />
          <p class="text-sm font-bold text-slate-400">Aucune conversation</p>
          <p class="text-xs text-slate-600">Ajoutez des amis et commencez à tchater !</p>
        </div>

        <template v-else>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            @click="router.push(`/conversations/${conv.id}`)"
            class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-white/5 border border-transparent select-none"
            :style="friendId === conv.id 
              ? 'background: rgba(155, 113, 52, 0.12); border-color: rgba(155, 113, 52, 0.25);' 
              : 'background: rgba(255, 255, 255, 0.01);'"
          >
            <!-- Avatar -->
            <div
              class="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-black border"
              :style="friendId === conv.id 
                ? 'border-color: rgba(155,113,52,0.3); background: rgba(155,113,52,0.1);' 
                : 'border-color: rgba(255,255,255,0.06); background: rgba(255,255,255,0.03);'"
            >
              <img v-if="resolveAvatar(conv.avatarUrl)" :src="resolveAvatar(conv.avatarUrl)!" :alt="conv.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
              <span v-else style="color: #b8935c;">{{ getInitials(conv.username) }}</span>
            </div>

            <!-- Content details -->
            <div class="flex-1 min-w-0">
              <div class="flex justify-between items-baseline mb-0.5">
                <span class="font-bold text-sm truncate" :class="friendId === conv.id ? 'text-[#fbbf24]' : 'text-slate-200'">
                  {{ conv.username }}
                </span>
                <span v-if="conv.lastMessage" class="text-[10px]" style="color: #475569;">
                  {{ formatTime(conv.lastMessage.createdAt) }}
                </span>
              </div>
              <div class="flex items-center justify-between">
                <p class="text-xs truncate flex-1 pr-2 text-left" style="color: #64748b;">
                  <span v-if="conv.lastMessage?.senderId === authStore.user?.id" class="text-slate-500 font-medium mr-0.5">Vous :</span>
                  {{ conv.lastMessage ? conv.lastMessage.content : 'Aucun message' }}
                </p>
                <div v-if="conv.unreadCount > 0" class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-black flex-shrink-0" style="background: #fbbf24;">
                  {{ conv.unreadCount }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- RIGHT PANE: Chat View or Placeholder -->
    <div class="flex-1 flex flex-col relative h-full bg-[#070c15] overflow-hidden">
      <!-- If friendId is specified -->
      <template v-if="friendId">
        <!-- Header -->
        <div class="flex items-center gap-4 px-6 py-4 flex-shrink-0" style="background: #111621; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <div v-if="friend" class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black border"
              style="border-color: rgba(155,113,52,0.3); background: linear-gradient(135deg, rgba(155,113,52,0.2), rgba(184,147,92,0.1));"
            >
              <img v-if="resolveAvatar(friend.avatarUrl)" :src="resolveAvatar(friend.avatarUrl)!" :alt="friend.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
              <span v-else style="color: #b8935c;">{{ getInitials(friend.username) }}</span>
            </div>
            <div class="text-left">
              <div class="font-bold text-slate-100 leading-snug">{{ friend.username }}</div>
              <div class="text-xs" style="color: #64748b;">{{ friend.mmr }} MMR</div>
            </div>
          </div>

          <div class="ml-auto">
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold" style="background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.2);">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En ligne
            </div>
          </div>
        </div>

        <!-- Messages Area -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-custom" style="min-height: 0;">
          <div v-if="loading" class="flex items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 class="w-6 h-6 animate-spin" style="color: #9b7134;" />
            <span class="text-sm font-bold">Chargement des messages...</span>
          </div>

          <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center py-16 gap-3">
            <MessageSquare class="w-10 h-10 opacity-20" style="color: #9b7134;" />
            <p class="text-sm font-bold text-slate-500">Aucun message. Dites bonjour ! 👋</p>
          </div>

          <template v-else>
            <div v-for="group in groupedMessages" :key="group.date">
              <!-- Date separator -->
              <div class="flex items-center gap-4 my-4">
                <div class="flex-1 h-px" style="background: rgba(255,255,255,0.05);"></div>
                <span class="text-xs font-bold px-3 py-1 rounded-full" style="color: #64748b; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);">
                  {{ group.date }}
                </span>
                <div class="flex-1 h-px" style="background: rgba(255,255,255,0.05);"></div>
              </div>

              <!-- Messages -->
              <div
                v-for="msg in group.messages"
                :key="msg.id"
                class="flex gap-3 mb-1"
                :class="isMyMessage(msg) ? 'flex-row-reverse' : 'flex-row'"
              >
                <!-- Avatar (show only for first message in a sequence) -->
                <div
                  v-if="!isMyMessage(msg)"
                  class="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-black border self-end"
                  style="border-color: rgba(155,113,52,0.2); background: linear-gradient(135deg, rgba(155,113,52,0.15), rgba(184,147,92,0.08));"
                >
                  <img v-if="resolveAvatar(msg.sender?.avatarUrl)" :src="resolveAvatar(msg.sender.avatarUrl)!" :alt="msg.sender.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                  <span v-else style="color: #b8935c;">{{ getInitials(msg.sender?.username) }}</span>
                </div>
                <div v-else class="w-8 flex-shrink-0"></div>

                <!-- Bubble -->
                <div class="flex flex-col max-w-xs lg:max-w-md" :class="isMyMessage(msg) ? 'items-end' : 'items-start'">
                  <div
                    class="px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-left break-words whitespace-pre-wrap"
                    :style="isMyMessage(msg)
                      ? 'background: linear-gradient(135deg, rgba(155,113,52,0.5), rgba(184,147,92,0.35)); color: #fef3c7; border: 1px solid rgba(155,113,52,0.4); border-bottom-right-radius: 6px;'
                      : 'background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 6px;'"
                  >
                    {{ msg.content }}
                  </div>
                  <span class="text-[10px] mt-1 px-1" style="color: #475569;">{{ formatTime(msg.createdAt) }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Message Input -->
        <div class="flex-shrink-0 px-6 py-4" style="background: #111621; border-top: 1px solid rgba(255,255,255,0.06);">
          <div class="flex gap-3 items-end">
            <div class="flex-1 rounded-2xl overflow-hidden" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
              <textarea
                v-model="newMessage"
                @keydown="onKeydown"
                placeholder="Écrire un message… (Entrée pour envoyer)"
                rows="1"
                class="w-full px-4 py-3 text-sm resize-none outline-none bg-transparent transition-all"
                style="color: #f1f5f9; max-height: 120px;"
                :style="{ height: 'auto' }"
                @input="($event.target as HTMLTextAreaElement).style.height = 'auto'; ($event.target as HTMLTextAreaElement).style.height = Math.min(($event.target as HTMLTextAreaElement).scrollHeight, 120) + 'px'"
              />
            </div>
            <button
              @click="sendMessage"
              :disabled="!newMessage.trim() || sendLoading"
              class="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
              :style="newMessage.trim()
                ? 'background: linear-gradient(135deg, #9b7134, #b8935c); box-shadow: 0 4px 16px rgba(155,113,52,0.35); color: white;'
                : 'background: rgba(255,255,255,0.04); color: #4b5563; cursor: not-allowed;'"
            >
              <Loader2 v-if="sendLoading" class="w-5 h-5 animate-spin" />
              <Send v-else class="w-5 h-5" />
            </button>
          </div>
          <p class="text-[10px] mt-1.5 px-1 text-left" style="color: #374151;">Shift+Entrée pour aller à la ligne</p>
        </div>
      </template>

      <!-- If no friendId is specified (Placeholder view) -->
      <template v-else>
        <div class="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style="background: rgba(155,113,52,0.1); border: 1px solid rgba(155,113,52,0.25);">
            <MessageSquare class="w-8 h-8" style="color: #b8935c;" />
          </div>
          <h3 class="text-lg font-bold text-slate-200 mb-1">Vos conversations</h3>
          <p class="text-sm text-slate-500 max-w-sm">Sélectionnez un ami dans la liste de gauche pour commencer à tchater, ou accédez à l'onglet <router-link to="/friends" class="text-primary-light hover:underline font-bold" style="color: #b8935c;">Amis</router-link> pour voir vos demandes.</p>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for messages and conversation list */
.scrollbar-custom::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-custom::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-custom::-webkit-scrollbar-thumb {
  background: rgba(155,113,52,0.3);
  border-radius: 2px;
}
.scrollbar-custom::-webkit-scrollbar-thumb:hover {
  background: rgba(155,113,52,0.5);
}
</style>
