<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import Lobby from '../components/Lobby.vue'
import Game from '../components/Game.vue'
import { useGameStore } from '../stores/game'

const authStore = useAuthStore()
const gameStore = useGameStore()
</script>

<template>
  <!-- Vue en jeu : plein écran -->
  <div v-if="gameStore.room" class="fixed inset-0 z-50" style="background: #0f0f1a;">
    <Game />
  </div>

  <!-- Lobby -->
  <div v-else class="min-h-screen" style="background: #0f0f1a;">
    <!-- Navbar -->
    <nav class="flex items-center justify-between px-8 py-4" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🃏</span>
        <span class="font-bold text-lg" style="color: #f1f5f9;">Président</span>
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/leaderboard" class="text-sm font-semibold transition-all hover:opacity-80" style="color: #fbbf24;">
          🏆 Classement
        </router-link>
        <router-link to="/profile" class="text-sm font-medium transition-all hover:opacity-80 flex items-center gap-1" style="color: #94a3b8;">
          👤 {{ authStore.user?.username }}
        </router-link>
        <button
          @click="authStore.logout"
          class="text-sm px-4 py-2 rounded-lg transition-all"
          style="color: #64748b; border: 1px solid rgba(255,255,255,0.08); cursor: pointer;"
        >
          Déconnexion
        </button>
      </div>
    </nav>

    <!-- Content -->
    <div class="max-w-2xl mx-auto px-6 py-12">
      <Lobby />
    </div>
  </div>
</template>
