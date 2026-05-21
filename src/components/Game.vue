<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import Chat from './Chat.vue'

const gameStore = useGameStore()

// ── All data comes from reactive store refs — no more reading room.state ───
const mySessionId = computed(() => gameStore.room?.sessionId ?? '')
const players = computed(() => {
  const roleOrder: Record<string, number> = {
    PRESIDENT: 1,
    VICE_PRESIDENT: 2,
    NEUTRE: 3,
    VICE_TDC: 4,
    TDC: 5
  }
  return [...gameStore.gamePlayers].sort((a, b) => {
    const valA = roleOrder[a.role] || 99
    const valB = roleOrder[b.role] || 99
    return valA - valB
  })
})
const me = computed(() => players.value.find(p => p.isMe))
const myHand = computed(() => gameStore.gameMyHand)
const currentTrick = computed(() => gameStore.gameCurrentTrick)
const currentTurnPlayerId = computed(() => gameStore.gameCurrentTurnPlayerId)
const phase = computed(() => gameStore.gamePhase)
const isMyTurn = computed(() => currentTurnPlayerId.value !== '' && currentTurnPlayerId.value === mySessionId.value)

// ── Card selection ─────────────────────────────────────────────────────────
const selectedCards = ref<any[]>([])

function toggleCard(card: any) {
  if (!isMyTurn.value) return
  const key = `${card.suit}-${card.rank}`
  const idx = selectedCards.value.findIndex(c => `${c.suit}-${c.rank}` === key)
  if (idx === -1) {
    if (selectedCards.value.length === 0 || selectedCards.value[0].rank === card.rank) {
      selectedCards.value = [...selectedCards.value, card]
    } else {
      selectedCards.value = [card]
    }
  } else {
    selectedCards.value = selectedCards.value.filter((_, i) => i !== idx)
  }
}

function isSelected(card: any) {
  return selectedCards.value.some(c => c.suit === card.suit && c.rank === card.rank)
}

function playSelected() {
  if (selectedCards.value.length === 0 || !isMyTurn.value) return
  gameStore.room?.send('play_card', { cards: selectedCards.value })
  selectedCards.value = []
}

function passTurn() {
  gameStore.room?.send('pass')
}

function startGame() {
  gameStore.room?.send('start_game')
}

function getSuitSymbol(suit: string) {
  return { C: '♣', D: '♦', H: '♥', S: '♠' }[suit] ?? suit
}
function isRed(suit: string) { return ['D', 'H'].includes(suit) }

const roleColors: Record<string, string> = {
  PRESIDENT: '#f59e0b',
  VICE_PRESIDENT: '#a855f7',
  VICE_TDC: '#64748b',
  TDC: '#ef4444',
  NEUTRE: '#475569',
}
</script>

<template>
  <div class="flex flex-col h-screen" style="background: #0a0a14;">

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3"
      style="border-bottom: 1px solid rgba(255,255,255,0.06);">
      <div class="flex items-center gap-3">
        <span class="text-lg">🃏</span>
        <span class="font-mono font-bold text-sm" style="color: #a855f7;">
          Code: {{ gameStore.currentRoomId }}
        </span>
        <span v-if="phase" class="text-xs px-2 py-0.5 rounded-full font-medium"
          style="background: rgba(16,185,129,0.1); color: #34d399;">
          {{ phase }}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="gameStore.isHost && (!phase || phase === 'LOBBY')"
          @click="startGame"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer;">
          🚀 Lancer la partie
        </button>
        <button @click="gameStore.leaveGame"
          class="px-3 py-2 rounded-lg text-sm"
          style="color: #64748b; border: 1px solid rgba(255,255,255,0.08); cursor: pointer;">
          Quitter
        </button>
      </div>
    </div>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Board -->
      <div class="flex-1 flex flex-col relative">

        <!-- Other players -->
        <div class="flex justify-center gap-4 p-4 flex-wrap">
          <div v-for="player in players.filter(p => !p.isMe)" :key="player.id"
            class="flex flex-col items-center gap-1 px-4 py-2 rounded-xl"
            :style="{
              background: player.id === currentTurnPlayerId ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
              border: player.id === currentTurnPlayerId ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.06)',
            }">
            <div class="text-sm font-semibold" style="color: #f1f5f9;">{{ player.username }}</div>
            <div class="text-xs" style="color: #64748b;">🂠 {{ player.handCount }} cartes</div>
            <div v-if="player.id === currentTurnPlayerId" class="text-xs font-medium" style="color: #a855f7;">⚡ Son tour</div>
            <div v-if="player.role && player.role !== 'NEUTRE'"
              class="text-xs px-2 py-0.5 rounded-full font-medium"
              :style="{ background: 'rgba(0,0,0,0.3)', color: roleColors[player.role] }">
              {{ player.role }}
            </div>
          </div>
        </div>

        <!-- Center table -->
        <div class="flex-1 flex flex-col items-center justify-center gap-4">
          <div class="rounded-full flex items-center justify-center"
            style="width: 220px; height: 220px; background: radial-gradient(circle, rgba(124,58,237,0.1), rgba(10,10,20,0.5)); border: 2px solid rgba(124,58,237,0.2);">
            <div v-if="currentTrick.length > 0" class="flex gap-2">
              <div v-for="(card, idx) in currentTrick" :key="idx"
                class="rounded-lg flex flex-col items-center justify-center shadow-xl"
                style="width: 52px; height: 76px; background: white; border: 1px solid #e2e8f0;">
                <span class="font-bold text-base leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#1e293b' }">{{ card.rank }}</span>
                <span class="text-xl leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#1e293b' }">{{ getSuitSymbol(card.suit) }}</span>
              </div>
            </div>
            <div v-else class="text-sm" style="color: rgba(255,255,255,0.2);">Tapis vide</div>
          </div>

          <!-- Actions -->
          <div v-if="phase === 'PLAY'" class="flex gap-3 items-center">
            <div v-if="isMyTurn" class="text-xs px-3 py-1 rounded-full font-medium animate-pulse"
              style="background: rgba(124,58,237,0.2); color: #a855f7;">⚡ Ton tour</div>
            <button v-if="isMyTurn && selectedCards.length > 0"
              @click="playSelected"
              class="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
              style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer;">
              Jouer ({{ selectedCards.length }})
            </button>
            <button v-if="isMyTurn"
              @click="passTurn"
              class="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); cursor: pointer;">
              Passer
            </button>
          </div>
        </div>

        <!-- My hand -->
        <div class="p-4 space-y-2">
          <div class="text-center text-xs mb-2" style="color: #475569;">
            <span v-if="!phase || phase === 'LOBBY'">En attente du lancement...</span>
            <span v-else-if="isMyTurn" style="color: #a855f7; font-weight: 600;">Sélectionne tes cartes puis clique Jouer</span>
            <span v-else>Tour de l'adversaire...</span>
          </div>
          <div class="flex gap-2 justify-center overflow-x-auto pb-2">
            <div v-for="(card, idx) in myHand" :key="`${card.suit}-${card.rank}-${idx}`"
              @click="toggleCard(card)"
              class="rounded-lg flex flex-col items-center justify-center shadow-xl flex-shrink-0 transition-all duration-150"
              :class="{ 'cursor-pointer': isMyTurn }"
              style="width: 56px; height: 80px; background: white; border: 1px solid #e2e8f0;"
              :style="{
                transform: isSelected(card) ? 'translateY(-12px)' : 'translateY(0)',
                boxShadow: isSelected(card) ? '0 0 0 2px #7c3aed, 0 8px 16px rgba(124,58,237,0.4)' : undefined,
                opacity: (!isMyTurn && !isSelected(card)) ? '0.6' : '1',
              }">
              <span class="font-bold text-base leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#1e293b' }">{{ card.rank }}</span>
              <span class="text-xl leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#1e293b' }">{{ getSuitSymbol(card.suit) }}</span>
            </div>
            <div v-if="myHand.length === 0 && phase === 'PLAY'"
              class="text-sm py-4" style="color: #475569;">
              Tu n'as plus de cartes 🎉
            </div>
          </div>
        </div>
      </div>

      <!-- Chat -->
      <div class="w-72 flex-shrink-0 p-3" style="border-left: 1px solid rgba(255,255,255,0.06);">
        <Chat />
      </div>
    </div>
  </div>
</template>
