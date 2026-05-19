<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/game'
import Sortable from 'sortablejs'
import Chat from './Chat.vue'

const gameStore = useGameStore()

const showRules = ref(false)
const showGameSettings = ref(false)

// ── All data comes from reactive store refs — no more reading room.state ───
const mySessionId = computed(() => gameStore.room?.sessionId ?? '')
const players = computed(() => gameStore.gamePlayers)
const me = computed(() => players.value.find(p => p.isMe))
const myHand = computed(() => gameStore.gameMyHand)
const currentTrick = computed(() => gameStore.gameCurrentTrick)
const currentTurnPlayerId = computed(() => gameStore.gameCurrentTurnPlayerId)
const phase = computed(() => gameStore.gamePhase)
const isMyTurn = computed(() => currentTurnPlayerId.value !== '' && currentTurnPlayerId.value === mySessionId.value)

const NORMAL_ORDER = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"];

function getCardValue(rank: string) {
  return NORMAL_ORDER.indexOf(rank);
}

function isPlayable(card: any) {
  if (!isMyTurn.value) return false;

  const config = gameStore.gameConfig;
  const forcedRank = gameStore.gameIsForcedRank;
  
  // "Ou rien": only the forced rank can be played
  if (forcedRank) {
    return card.rank === forcedRank;
  }

  // Empty trick: anything goes
  if (currentTrick.value.length === 0) {
    return true;
  }

  const trickRank = currentTrick.value[0].rank;
  const consecutiveCards = gameStore.gameActiveConsecutiveCards;

  // Quad completion: if this card matches the trick rank and we have
  // enough cards of that rank to reach exactly 4 total
  if (card.rank === trickRank && consecutiveCards >= 1) {
    const sameRankCount = myHand.value.filter((c: any) => c.rank === card.rank).length;
    const neededForQuad = 4 - consecutiveCards;
    if (neededForQuad > 0 && sameRankCount >= neededForQuad) {
      return true;
    }
  }

  // Normal play: need enough cards of same rank to match trick size
  const countInHand = myHand.value.filter((c: any) => c.rank === card.rank).length;
  if (countInHand < currentTrick.value.length) {
      return false;
  }

  // Special 2 cuts anything
  if (config?.enableSpecialTwo && card.rank === "2") {
    return true;
  }

  // Must be >= trick value
  const cardVal = getCardValue(card.rank);
  const trickVal = getCardValue(trickRank);
  if (cardVal < trickVal) return false;

  return true;
}

const hasPlayableCards = computed(() => {
    if (!isMyTurn.value || myHand.value.length === 0) return false;
    // We check if at least one subset of our hand could legally be played.
    // For simplicity, if they can't even play a single card or special 2, they definitely must pass.
    return myHand.value.some(card => isPlayable(card));
});

// Auto-pass if no playable cards
let autoPassTimer: ReturnType<typeof setTimeout> | null = null;
watch([isMyTurn, hasPlayableCards, phase, myHand], ([myTurn, hasCards, currentPhase, hand]) => {
    if (autoPassTimer) {
        clearTimeout(autoPassTimer);
        autoPassTimer = null;
    }

    // Only start timer if it's our turn, we are in PLAY phase, we actually hold cards (hand synced), and we have NO playable cards.
    if (myTurn && currentPhase === 'PLAY' && hand.length > 0 && !hasCards) {
        autoPassTimer = setTimeout(() => {
            if (isMyTurn.value && phase.value === 'PLAY' && !hasPlayableCards.value) {
                gameStore.room?.send('chat_message', { text: "Je n'ai pas de cartes à jouer, je passe." });
                passTurn();
            }
        }, 1500);
    }
}, { immediate: true });

// ── Card selection ─────────────────────────────────────────────────────────
const selectedCards = ref([] as any[])

const turnStartTime = ref(Date.now())
const now = ref(Date.now())

watch([currentTurnPlayerId, () => currentTrick.value], () => {
  turnStartTime.value = Date.now()
})

watch(currentTurnPlayerId, () => {
  selectedCards.value = []
})

const turnProgress = computed(() => {
  const timeoutMs = gameStore.gameConfig?.turnTimeoutMs || 30000;
  if (!timeoutMs) return 0;
  const elapsed = now.value - turnStartTime.value;
  const p = 1 - (elapsed / timeoutMs);
  return Math.max(0, p);
})

function toggleCard(card: any) {
  if (!isMyTurn.value || !isPlayable(card)) return
  const key = `${card.suit}-${card.rank}`
  const idx = selectedCards.value.findIndex((c: any) => `${c.suit}-${c.rank}` === key)
  
  if (idx === -1) {
    if (selectedCards.value.length === 0 || selectedCards.value[0].rank !== card.rank) {
      selectedCards.value = [card]
    } else {
      const consecutiveCards = gameStore.gameActiveConsecutiveCards;
      const trickRank = currentTrick.value.length > 0 ? currentTrick.value[0].rank : null;
      let limit = 4;

      if (trickRank && card.rank === trickRank && consecutiveCards >= 1) {
        // Quad completion: allow up to (4 - consecutive) cards
        limit = 4 - consecutiveCards;
      } else if (currentTrick.value.length > 0 && card.rank !== '2') {
        limit = currentTrick.value.length;
      }
      if (selectedCards.value.length < limit) {
        selectedCards.value = [...selectedCards.value, card]
      }
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
const roleIcons: Record<string, string> = {
  PRESIDENT: '👑',
  VICE_PRESIDENT: '🥈',
  VICE_TDC: '🥉',
  TDC: '💩',
  NEUTRE: '👤',
}

function getMmrText(role: string) {
  if (role === 'PRESIDENT' || role === 'VICE_PRESIDENT') return '+30 MMR'
  if (role === 'TDC' || role === 'VICE_TDC') return '-30 MMR'
  return '+0 MMR'
}

function getMmrColorClass(role: string) {
  if (role === 'PRESIDENT' || role === 'VICE_PRESIDENT') return 'text-emerald-400'
  if (role === 'TDC' || role === 'VICE_TDC') return 'text-red-400'
  return 'text-slate-400'
}

// ── Hand Sorting (SortableJS) ─────────────────────────────────────────────
const handContainerRef = ref<HTMLElement | null>(null)
let handSortableInstance: Sortable | null = null

function initSortable() {
  if (handContainerRef.value && !handSortableInstance) {
    handSortableInstance = new Sortable(handContainerRef.value, {
      animation: 150,
      ghostClass: 'opacity-50',
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
          const movedItem = gameStore.gameMyHand.splice(evt.oldIndex, 1)[0]
          gameStore.gameMyHand.splice(evt.newIndex, 0, movedItem)
        }
      }
    })
  }
}

watch(() => myHand.value.length, async () => {
  await nextTick()
  initSortable()
})

let timerInterval: any = null;

onMounted(async () => {
  await nextTick()
  initSortable()
  timerInterval = setInterval(() => {
    now.value = Date.now()
  }, 100)
})

onBeforeUnmount(() => {
  if (handSortableInstance) {
      handSortableInstance.destroy()
      handSortableInstance = null
  }
  if (autoPassTimer) {
      clearTimeout(autoPassTimer)
  }
  if (timerInterval) {
      clearInterval(timerInterval)
  }
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%); position: relative;">
    
    <!-- Toast d'erreur -->
    <Transition name="fade-down">
      <div v-if="gameStore.gameErrorMessage"
        class="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl"
        style="background: rgba(220, 38, 38, 0.9); backdrop-filter: blur(10px); border: 1px solid rgba(255,165,165,0.4);">
        <span class="text-xl">⚠️</span>
        <span class="font-bold text-white tracking-wide">{{ gameStore.gameErrorMessage }}</span>
      </div>
    </Transition>

    <!-- Background abstract shapes -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
      <div class="absolute w-96 h-96 rounded-full" style="background: radial-gradient(circle, #ec4899 0%, transparent 70%); top: -10%; left: -10%; filter: blur(60px);"></div>
      <div class="absolute w-96 h-96 rounded-full" style="background: radial-gradient(circle, #8b5cf6 0%, transparent 70%); bottom: -10%; right: -10%; filter: blur(60px);"></div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 relative z-10"
      style="background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05);">
      <div class="flex items-center gap-4">
        <h1 class="text-xl font-black text-transparent bg-clip-text uppercase tracking-widest"
            style="background-image: linear-gradient(to right, #e879f9, #c084fc);">
          Président
        </h1>
        <div class="text-xs font-mono px-3 py-1 rounded-full"
          style="background: rgba(255,255,255,0.1); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.1);">
          Code: <span class="font-bold text-white">{{ gameStore.currentRoomId }}</span>
        </div>
        <button v-if="gameStore.gameConfig" @click="showGameSettings = true"
          class="text-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
          <span>⚙️ Paramètres</span>
        </button>
      </div>
      <div class="flex gap-3">
        <button @click="showRules = true"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-white/10"
          style="background: rgba(255,255,255,0.05); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
          📖 Règles
        </button>
        <button v-if="gameStore.isHost && (!phase || phase === 'LOBBY')"
          @click="startGame"
          class="px-5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
          style="background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; cursor: pointer; box-shadow: 0 4px 15px rgba(236,72,153,0.4);">
          🚀 Lancer la partie
        </button>
        <button @click="gameStore.leaveGame"
          class="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-red-500/20"
          style="background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.2); cursor: pointer;">
          Quitter
        </button>
      </div>
    </div>

    <!-- Main area -->
    <div class="flex flex-1 overflow-hidden min-h-0 relative z-10">

      <!-- Board -->
      <div class="flex-1 flex flex-col relative min-h-0">

        <!-- All players -->
        <div class="flex justify-center gap-3 px-4 py-4 flex-wrap" style="flex-shrink: 0;">
          <div v-for="player in players" :key="player.id"
            class="flex items-center gap-2 px-4 py-2 rounded-full relative overflow-hidden transition-all duration-300"
            :style="{
              background: player.id === currentTurnPlayerId ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
              border: player.id === currentTurnPlayerId ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
              boxShadow: player.id === currentTurnPlayerId ? '0 0 20px rgba(236,72,153,0.3)' : 'none',
              transform: player.id === currentTurnPlayerId ? 'scale(1.05)' : 'scale(1)'
            }">
            <span class="text-base">{{ player.role && player.role !== 'NEUTRE' ? roleIcons[player.role] : '👤' }}</span>
            <span class="text-sm font-semibold" style="color: #f8fafc;">
              {{ player.username }}<span v-if="player.isMe" style="color: #f472b6;"> (moi)</span>
            </span>
            <span class="text-xs font-mono px-2 py-0.5 rounded-full" style="background: rgba(0,0,0,0.4); color: #cbd5e1;">{{ player.handCount }}</span>
            <div v-if="player.id === currentTurnPlayerId && phase === 'PLAY'" 
                 class="absolute bottom-0 left-0 h-1 transition-all duration-100 ease-linear rounded-full"
                 :style="{ 
                    width: `${turnProgress * 100}%`,
                    background: turnProgress < 0.25 ? '#ef4444' : 'linear-gradient(90deg, #ec4899, #8b5cf6)'
                 }">
            </div>
          </div>
        </div>

        <!-- Center table -->
        <div class="flex-1 flex flex-col items-center justify-center gap-6 min-h-0">

          <!-- "Ou rien" indicator -->
          <Transition name="ourien">
            <div v-if="gameStore.gameIsForcedRank && phase === 'PLAY'"
              class="px-6 py-2.5 rounded-full text-base font-black tracking-widest pointer-events-none uppercase"
              style="background: rgba(220, 38, 38, 0.2); backdrop-filter: blur(8px); border: 2px solid rgba(239,68,68,0.6); color: #fca5a5; text-shadow: 0 0 15px rgba(239,68,68,0.8); box-shadow: 0 0 30px rgba(239,68,68,0.2);">
              🔒 {{ gameStore.gameIsForcedRank }} ou rien
            </div>
          </Transition>

          <div class="rounded-3xl flex items-center justify-center relative transition-all duration-300"
            style="width: 280px; height: 180px; background: rgba(0,0,0,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3);"
            :style="gameStore.gameIsForcedRank ? 'border-color: rgba(239,68,68,0.5); box-shadow: inset 0 0 30px rgba(239,68,68,0.2), 0 10px 30px rgba(0,0,0,0.3);' : ''">
            <div v-if="currentTrick.length > 0" class="flex gap-2">
              <div v-for="(card, idx) in currentTrick" :key="idx"
                class="rounded-xl flex flex-col items-center justify-center"
                style="width: 56px; height: 80px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; box-shadow: 0 4px 15px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,1);">
                <span class="font-black text-lg leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#0f172a' }">{{ card.rank }}</span>
                <span class="text-2xl leading-none mt-1" :style="{ color: isRed(card.suit) ? '#ef4444' : '#0f172a' }">{{ getSuitSymbol(card.suit) }}</span>
              </div>
            </div>
            <div v-else class="text-sm font-medium tracking-wide uppercase pointer-events-none" style="color: rgba(255,255,255,0.2);">Tapis vide</div>
          </div>

          <!-- Actions -->
          <div v-if="phase === 'PLAY'" class="flex gap-4 items-center">
            <div v-if="isMyTurn" class="text-xs px-4 py-1.5 rounded-full font-bold uppercase tracking-wider animate-pulse"
              style="background: rgba(236,72,153,0.2); color: #f472b6; border: 1px solid rgba(236,72,153,0.3);">⚡ Ton tour</div>
            <button v-if="isMyTurn && selectedCards.length > 0"
              @click="playSelected"
              class="px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all hover:scale-105"
              style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; cursor: pointer; box-shadow: 0 6px 20px rgba(139,92,246,0.4);">
              Jouer ({{ selectedCards.length }})
            </button>
            <button v-if="isMyTurn"
              @click="passTurn"
              class="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide transition-all hover:bg-red-500/20"
              style="background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); cursor: pointer;">
              Passer
            </button>
          </div>
        </div>

        <!-- My hand -->
        <div class="px-4 pb-4 pt-4" style="flex-shrink: 0; background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 100%);">
          <div class="text-center text-xs mb-2 uppercase tracking-widest font-semibold" style="color: #94a3b8;">
            <span v-if="!phase || phase === 'LOBBY'">En attente du lancement...</span>
            <span v-else-if="isMyTurn" style="color: #f472b6; text-shadow: 0 0 10px rgba(244,114,182,0.4);">À toi de jouer</span>
            <span v-else>Tour de l'adversaire...</span>
          </div>
          <div class="flex justify-center items-end pb-2 px-2 pt-6" ref="handContainerRef"
            style="overflow-x: auto; -webkit-overflow-scrolling: touch; min-height: 95px;">
            <div v-for="(card, idx) in myHand" :key="`${card.suit}-${card.rank}-${idx}`"
              :data-rank="card.rank"
              :data-suit="card.suit"
              @click="toggleCard(card)"
              class="rounded-lg flex flex-col items-center justify-center flex-shrink-0 transition-all duration-150"
              :class="{ 
                 'cursor-pointer': isMyTurn && isPlayable(card),
                 'unplayable': (!isPlayable(card) && !isSelected(card))
              }"
              :style="{
                width: '46px',
                height: '66px',
                background: isSelected(card) ? '#f0f0ff' : '#fefefe',
                border: isSelected(card) ? '2px solid #6366f1' : '1px solid #d1d5db',
                marginLeft: idx === 0 ? '0' : (myHand.length > 7 ? '-8px' : '3px'),
                position: 'relative',
                zIndex: isSelected(card) ? 50 : idx,
                transform: isSelected(card) ? 'translateY(-10px)' : 'translateY(0)',
                boxShadow: isSelected(card) ? '0 4px 12px rgba(99,102,241,0.4)' : '0 1px 4px rgba(0,0,0,0.12)',
                opacity: (!isPlayable(card)) && !isSelected(card) ? '0.25' : '1',
                filter: (!isPlayable(card)) && !isSelected(card) ? 'grayscale(80%)' : 'none',
              }">
              <span class="font-bold text-xs leading-none" :style="{ color: isRed(card.suit) ? '#dc2626' : '#1e293b' }">{{ card.rank }}</span>
              <span class="text-base leading-none" :style="{ color: isRed(card.suit) ? '#dc2626' : '#1e293b' }">{{ getSuitSymbol(card.suit) }}</span>
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

    <!-- Modale de Fin de Partie (RESULTS) -->
    <div v-if="phase === 'RESULTS'"
      class="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.1);">
        
        <div class="p-6 text-center border-b border-white/10">
          <h2 class="text-3xl font-bold bg-clip-text text-transparent"
              style="background-image: linear-gradient(to right, #a855f7, #ec4899);">
            Fin de la Manche
          </h2>
          <p class="text-sm text-slate-400 mt-2">Le Président a triomphé !</p>
        </div>

        <div class="p-6 space-y-3">
          <div v-for="(player, idx) in players" :key="player.id"
            class="flex items-center justify-between p-3 rounded-lg"
            :style="{ background: 'rgba(255,255,255,0.05)', borderLeft: `4px solid ${roleColors[player.role || 'NEUTRE']}` }">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ roleIcons[player.role || 'NEUTRE'] }}</span>
              <div class="flex flex-col">
                <span class="font-bold text-slate-100">{{ player.username }}</span>
                <span class="text-xs" :style="{ color: roleColors[player.role || 'NEUTRE'] }">
                  {{ player.role }}
                </span>
              </div>
            </div>
            <!-- Fake MMR variance for now based strictly on role -->
            <div class="font-mono text-sm font-bold" :class="getMmrColorClass(player.role || 'NEUTRE')">
              {{ getMmrText(player.role || 'NEUTRE') }}
            </div>
          </div>
        </div>

        <div class="p-6 flex justify-center gap-4 bg-black/20">
          <button v-if="gameStore.isHost" @click="startGame"
            class="w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-105"
            style="background: linear-gradient(135deg, #7c3aed, #ec4899); box-shadow: 0 4px 15px rgba(124,58,237,0.3);">
            Relancer une Manche
          </button>
          <div v-else class="text-sm font-medium text-slate-400 py-3">
            En attente du chef de salon...
          </div>
        </div>

      </div>
    </div>

    <!-- Règles Modale -->
    <div v-if="showRules" class="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4" @click.self="showRules = false">
      <div class="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.1);">
        <div class="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">📖 Règles du Président</h2>
          <button @click="showRules = false" class="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">✕</button>
        </div>
        <div class="p-6 overflow-y-auto text-sm text-slate-300 space-y-4">
          <p><strong>Hiérarchie des cartes :</strong> 3, 4, 5, 6, 7, 8, 9, 10, Valet, Dame, Roi, As, 2.</p>
          <p><strong>Le but :</strong> Se débarrasser de toutes ses cartes en premier.</p>
          <p><strong>Déroulement :</strong> Le premier joueur pose une carte (ou une paire, brelan, carré). Les joueurs suivants doivent poser le <strong>même nombre de cartes</strong>, d'une valeur <strong>égale ou supérieure</strong>.</p>
          <p><strong>Le 2 :</strong> C'est la carte spéciale. Elle permet de couper n'importe quel pli et donne instantanément la main au joueur qui l'a posée.</p>
          <p><strong>Couper un pli :</strong> Jouer une carte de même valeur que la précédente oblige le joueur suivant à jouer cette même valeur (et non une valeur supérieure) ou à passer son tour.</p>
          <p><strong>Le Carré :</strong> Si 4 cartes de même valeur se retrouvent sur la table (jouées en une ou plusieurs fois), le pli se termine immédiatement. Le joueur qui a complété le carré remporte le pli.</p>
          <p><strong>Passer :</strong> Si vous ne pouvez ou ne voulez pas jouer, vous passez. Vous pourrez rejouer au prochain tour, sauf si tous les joueurs passent consécutivement.</p>
          <p><strong>Rôles :</strong> Le 1er à finir est Président 👑, le 2ème Vice-Président 🥈, l'avant-dernier Vice-Trou du Cul 🥉, le dernier Trou du Cul 💩. À la manche suivante, le Président échange ses 2 pires cartes contre les 2 meilleures du TDC (et inversement). Idem pour 1 carte avec les Vices.</p>
        </div>
        <div class="p-4 border-t border-white/10 flex justify-end">
           <button @click="showRules = false" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style="background: rgba(255,255,255,0.1); color: white; cursor: pointer;">
             Fermer
           </button>
        </div>
      </div>
    </div>

    <!-- Paramètres de la partie Modale -->
    <div v-if="showGameSettings" class="absolute inset-0 flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4" @click.self="showGameSettings = false">
      <div class="w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.1);">
        <div class="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 class="text-xl font-bold text-white">⚙️ Paramètres de la partie</h2>
          <button @click="showGameSettings = false" class="text-slate-400 hover:text-white transition-colors cursor-pointer p-1">✕</button>
        </div>
        <div class="p-6 space-y-3 text-sm text-slate-300">
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Joueurs max:</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.maxPlayers || 'N/A' }}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Suites autorisées:</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.enableSequences ? '✅ Oui' : '❌ Non' }}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Le 2 brûle le pli:</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.enableSpecialTwo ? '✅ Oui' : '❌ Non' }}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Révolution (Carré):</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.enableRevolution ? '✅ Oui' : '❌ Non' }}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Révolution ramasse:</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.revolutionResetsTrick ? '✅ Oui' : '❌ Non' }}</span>
          </div>
          <div class="flex justify-between pb-2 border-b border-white/10">
            <span>Échange de cartes:</span>
            <span class="font-semibold text-white">{{ gameStore.gameConfig?.exchangeCards ? '✅ Oui' : '❌ Non' }}</span>
          </div>
        </div>
        <div class="p-4 flex justify-end">
           <button @click="showGameSettings = false" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all" style="background: rgba(255,255,255,0.1); color: white; cursor: pointer;">
             Fermer
           </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* "Ou rien" transition – slide in from top with bounce, max 1s */
.ourien-enter-active {
  animation: ourien-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.ourien-leave-active {
  animation: ourien-out 0.3s ease-in forwards;
}

@keyframes ourien-in {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes ourien-out {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
  }
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
