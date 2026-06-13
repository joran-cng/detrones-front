<script setup lang="ts">
import Lobby from '../components/Lobby.vue'
import Game from '../components/Game.vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
</script>

<template>
  <!-- Vue en jeu : plein écran -->
  <div v-if="gameStore.room" class="fixed inset-0 z-50 bg-background-1">
    <Game />
  </div>

  <!-- Lobby -->
  <div v-else class="px-4 py-6 sm:px-8 sm:py-10">
    <div class="w-full">
      <Lobby />
    </div>
  </div>
</template>
