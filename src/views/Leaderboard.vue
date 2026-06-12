<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const leaderboard = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/leaderboard')
    if (res.ok) {
      leaderboard.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch leaderboard', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Test -->
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

    <div class="max-w-2xl mx-auto px-6 py-12">
      <h1 class="text-3xl font-bold mb-8 text-center" style="color: #f1f5f9;">🏆 Classement Général</h1>
      
      <div v-if="loading" class="text-center text-gray-500">Chargement...</div>
      
      <div v-else class="space-y-3">
        <div v-for="(user, index) in leaderboard" :key="user.id" 
             @click="router.push(`/profile/${user.id}`)"
             class="rounded-xl p-4 flex items-center justify-between transition-all cursor-pointer hover:bg-white/5"
             style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
          <div class="flex items-center gap-4">
            <div class="text-xl font-bold w-8 text-center" :style="{ color: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#64748b' }">
              #{{ index + 1 }}
            </div>
            <div class="font-semibold text-lg" style="color: #f1f5f9;">{{ user.username }}</div>
          </div>
          <div class="font-mono font-bold text-xl" style="color: #a855f7;">
            {{ user.mmr }} MMR
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
