<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profileUser = ref<any>(null)
const loading = ref(true)
const friends = ref<any[]>([])
const myFriendsIds = ref<string[]>([])

const isMyProfile = computed(() => {
  // Try to use route ID, if none provided or matches current user, it's my profile
  const targetId = route.params.id || authStore.user?.id
  return targetId === authStore.user?.id
})

const targetUserId = computed(() => route.params.id as string || authStore.user?.id)

const isFriend = computed(() => myFriendsIds.value.includes(targetUserId.value))

async function fetchProfile() {
  if (!targetUserId.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/users/${targetUserId.value}`)
    if (res.ok) {
      profileUser.value = await res.json()
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function fetchFriends() {
  if (!authStore.token) return
  try {
    const res = await fetch('/api/friends', {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    if (res.ok) {
      const data = await res.json()
      if (isMyProfile.value) {
        friends.value = data
      }
      myFriendsIds.value = data.map((f: any) => f.id)
    }
  } catch (e) {}
}

async function toggleFriend() {
  if (!authStore.token || !targetUserId.value) return
  const endpoint = isFriend.value ? '/api/friends/remove' : '/api/friends/add'
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ friendId: targetUserId.value })
    })
    if (res.ok) {
      await fetchFriends()
    }
  } catch (e) {}
}

onMounted(() => {
  fetchProfile()
  fetchFriends()
})

watch(() => route.params.id, () => {
  fetchProfile()
})
</script>

<template>
  <div class="min-h-screen" style="background: #0f0f1a;">
    <nav class="flex items-center justify-between px-8 py-4" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
      <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/')">
        <span class="text-2xl">🃏</span>
        <span class="font-bold text-lg" style="color: #f1f5f9;">Président</span>
      </div>
      <button @click="router.push('/')" class="text-sm px-4 py-2 rounded-lg" style="color: #64748b; border: 1px solid rgba(255,255,255,0.08);">
        Retour
      </button>
    </nav>

    <div class="max-w-3xl mx-auto px-6 py-12">
      <div v-if="loading" class="text-center text-gray-500">Chargement...</div>
      
      <div v-else-if="profileUser" class="space-y-8">
        <!-- Profile Header -->
        <div class="rounded-2xl p-8 flex items-center justify-between"
             style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
          <div class="flex items-center gap-6">
            <div class="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                 style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white;">
              👤
            </div>
            <div>
              <h1 class="text-3xl font-bold" style="color: #f1f5f9;">{{ profileUser.username }}</h1>
              <p class="text-sm mt-1" style="color: #64748b;">Membre depuis {{ new Date(profileUser.createdAt).toLocaleDateString() }}</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-4xl font-mono font-bold" style="color: #a855f7;">{{ profileUser.mmr }}</div>
            <div class="text-sm font-semibold" style="color: #64748b;">MMR</div>
            
            <button v-if="!isMyProfile" 
                    @click="toggleFriend"
                    class="mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-all"
                    :style="isFriend 
                      ? 'background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);' 
                      : 'background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.3);'">
              {{ isFriend ? 'Retirer des amis' : 'Ajouter en ami' }}
            </button>
          </div>
        </div>

        <!-- Friends List (only visible on own profile for simplicity) -->
        <div v-if="isMyProfile" class="rounded-2xl p-6" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
          <h2 class="text-xl font-bold mb-4" style="color: #f1f5f9;">Mes Amis</h2>
          <div v-if="friends.length === 0" class="text-sm" style="color: #64748b;">
            Vous n'avez pas encore d'amis. <router-link to="/leaderboard" style="color: #a855f7;">Voir le classement</router-link> pour en ajouter !
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="friend in friends" :key="friend.id"
                 @click="router.push(`/profile/${friend.id}`)"
                 class="rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                 style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
              <div class="font-semibold" style="color: #f1f5f9;">{{ friend.username }}</div>
              <div class="font-mono text-sm" style="color: #a855f7;">{{ friend.mmr }} MMR</div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center text-red-500">
        Utilisateur introuvable
      </div>
    </div>
  </div>
</template>
