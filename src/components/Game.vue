<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/game'
import Sortable from 'sortablejs'
import Chat from './Chat.vue'
import Button from './Button.vue'
import {
  Crown,
  Medal,
  User,
  Users,
  Frown,
  Skull,
  Settings,
  Eye,
  BookOpen,
  Play,
  LogOut,
  Check,
  Zap,
  Lock,
  RefreshCw,
  Loader2,
  Sparkles,
  Flame,
  Tornado,
  X,
  HelpCircle,
  Hash
} from '@lucide/vue'

const gameStore = useGameStore()

const showHelpModal = ref(false)
const activeHelpTab = ref('rules')


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
const amISpectator = computed(() => me.value?.isSpectator === true)
const myHand = computed(() => gameStore.gameMyHand)
const currentTrick = computed(() => gameStore.gameCurrentTrick)
const currentTurnPlayerId = computed(() => gameStore.gameCurrentTurnPlayerId)
const phase = computed(() => gameStore.gamePhase)
const isMyTurn = computed(() => !amISpectator.value && currentTurnPlayerId.value !== '' && currentTurnPlayerId.value === mySessionId.value)

function getCardValue(rank: string) {
  const baseOrder = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  if (gameStore.gameReversed) {
    if (rank === "2") return -1;
    const index = baseOrder.indexOf(rank);
    return 11 - index;
  }
  if (rank === "2") return 12;
  return baseOrder.indexOf(rank);
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

  // Special 2 cuts anything
  if (config?.enableSpecialTwo && card.rank === "2") {
    return true;
  }

  const trickType = gameStore.gameCurrentTrickType;

  // Sequence on sequence: any card that's >= the highest trick card value
  if (trickType === 'sequence' && config?.enableSequences) {
    const cardVal = getCardValue(card.rank);
    const trickValues = currentTrick.value.map((c: any) => getCardValue(c.rank));
    const trickMin = Math.min(...trickValues);
    return cardVal >= trickMin;
  }

  // Normal play: need enough cards of same rank to match trick size
  const countInHand = myHand.value.filter((c: any) => c.rank === card.rank).length;
  if (countInHand < currentTrick.value.length) {
      return false;
  }

  // Must be >= trick value
  const cardVal = getCardValue(card.rank);
  const trickVal = getCardValue(trickRank);
  if (cardVal < trickVal) return false;

  return true;
}

const hasPlayableCards = computed(() => {
    if (!isMyTurn.value || myHand.value.length === 0) return false;
    return myHand.value.some(card => isPlayable(card));
});

// Auto-pass if no playable cards
let autoPassTimer: ReturnType<typeof setTimeout> | null = null;
watch([isMyTurn, hasPlayableCards, phase, myHand], ([myTurn, hasCards, currentPhase, hand]) => {
    if (autoPassTimer) {
        clearTimeout(autoPassTimer);
        autoPassTimer = null;
    }

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
  // Strict guard: must be my turn and card must be playable — no way to bypass
  if (!isMyTurn.value || !isPlayable(card)) return
  const key = `${card.suit}-${card.rank}`
  const idx = selectedCards.value.findIndex((c: any) => `${c.suit}-${c.rank}` === key)
  
  if (idx === -1) {
    const config = gameStore.gameConfig
    const sequencesEnabled = config?.enableSequences

    if (selectedCards.value.length === 0) {
      selectedCards.value = [card]
    } else if (sequencesEnabled && selectedCards.value[0].rank !== card.rank) {
      const tempCards = [...selectedCards.value, card]
      const values = tempCards.map((c: any) => getCardValue(c.rank)).sort((a: number, b: number) => a - b)
      const uniqueRanks = new Set(tempCards.map((c: any) => c.rank))
      const isConsecutive = values.every((v: number, i: number) => i === 0 || v === values[i - 1] + 1)
      if (uniqueRanks.size === tempCards.length && isConsecutive) {
        selectedCards.value = [...tempCards]
      } else {
        selectedCards.value = [card]
      }
    } else if (selectedCards.value[0].rank === card.rank) {
      const consecutiveCards = gameStore.gameActiveConsecutiveCards;
      const trickRank = currentTrick.value.length > 0 ? currentTrick.value[0].rank : null;
      let limit = 4;
      if (trickRank && card.rank === trickRank && consecutiveCards >= 1) {
        limit = 4 - consecutiveCards;
      } else if (currentTrick.value.length > 0 && card.rank !== '2') {
        limit = currentTrick.value.length;
      }
      if (selectedCards.value.length < limit) {
        selectedCards.value = [...selectedCards.value, card]
      }
    } else {
      selectedCards.value = [card]
    }
  } else {
    selectedCards.value = selectedCards.value.filter((_: any, i: number) => i !== idx)
  }
}

function isSelected(card: any) {
  return selectedCards.value.some(c => c.suit === card.suit && c.rank === card.rank)
}

// Strict: only allow play if isMyTurn AND all selected are still playable
const canPlay = computed(() =>
  isMyTurn.value &&
  selectedCards.value.length > 0 &&
  selectedCards.value.every((c: any) => isPlayable(c))
)

function playSelected() {
  if (!canPlay.value) return
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
  VICE_PRESIDENT: '#d946ef',
  VICE_TDC: '#64748b',
  TDC: '#ef4444',
  NEUTRE: '#475569',
}
const roleIcons = {
  PRESIDENT: Crown,
  VICE_PRESIDENT: Medal,
  NEUTRE: User,
  VICE_TDC: Frown,
  TDC: Skull,
}

const cinematicIcons = {
  quad: Flame,
  revolution: Tornado,
  president: Crown,
  tdc: Skull,
}

function getMmrText(role: string) {
  if (role === 'PRESIDENT') return '+30 MMR'
  if (role === 'VICE_PRESIDENT') return '+15 MMR'
  if (role === 'NEUTRE') return '+0 MMR'
  if (role === 'VICE_TDC') return '-15 MMR'
  if (role === 'TDC') return '-30 MMR'
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

// ── Exchange phase ──────────────────────────────────────────────────────────
const exchangeSelectedCards = ref<any[]>([])

const isExchangePhase = computed(() => phase.value === 'EXCHANGE')
const myExchangeRequest = computed(() => gameStore.gameExchangeRequest)

function toggleExchangeCard(card: any) {
  const key = `${card.suit}-${card.rank}`
  const idx = exchangeSelectedCards.value.findIndex((c: any) => `${c.suit}-${c.rank}` === key)
  
  if (idx === -1) {
    const count = myExchangeRequest.value?.count || 0
    if (exchangeSelectedCards.value.length < count) {
      exchangeSelectedCards.value = [...exchangeSelectedCards.value, card]
    }
  } else {
    exchangeSelectedCards.value = exchangeSelectedCards.value.filter((_: any, i: number) => i !== idx)
  }
}

function isExchangeSelected(card: any) {
  return exchangeSelectedCards.value.some(c => c.suit === card.suit && c.rank === card.rank)
}

function submitExchange() {
  if (!myExchangeRequest.value) return
  if (exchangeSelectedCards.value.length !== myExchangeRequest.value.count) return
  if (gameStore.exchangeSubmitted) return  // Guard: prevent double-submit
  gameStore.exchangeSubmitted = true
  gameStore.room?.send('exchange_select', { cards: exchangeSelectedCards.value })
  exchangeSelectedCards.value = []
  // Don't null gameExchangeRequest manually — let state_update from server do it
}

// Clear exchange selection when exchange phase ends
watch(isExchangePhase, (val) => {
  if (!val) exchangeSelectedCards.value = []
})

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

// ── Game event style map ───────────────────────────────────────────────────
const eventStyles: Record<string, { bg: string; border: string; glow: string; textColor: string }> = {
  quad:       { bg: 'rgba(239,68,68,0.2)',   border: 'rgba(239,68,68,0.7)',   glow: '0 0 60px rgba(239,68,68,0.6)',   textColor: '#fca5a5' },
  revolution: { bg: 'rgba(139,92,246,0.2)',  border: 'rgba(139,92,246,0.7)',  glow: '0 0 60px rgba(139,92,246,0.6)',  textColor: '#c4b5fd' },
  president:  { bg: 'rgba(245,158,11,0.2)',  border: 'rgba(245,158,11,0.7)',  glow: '0 0 60px rgba(245,158,11,0.6)',  textColor: '#fde68a' },
  tdc:        { bg: 'rgba(100,116,139,0.2)', border: 'rgba(100,116,139,0.7)', glow: '0 0 60px rgba(100,116,139,0.6)', textColor: '#cbd5e1' },
}
const currentEventStyle = computed(() => {
  if (!gameStore.gameEvent) return null
  return eventStyles[gameStore.gameEvent.type] || eventStyles.quad
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-background-1" style="position: relative;">
    


    <!-- ── System Notifications — Toast bottom-left ─────────────────────── -->
    <div class="absolute bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none" style="max-width: 340px; width: 100%;">
      <TransitionGroup name="toast">
        <div v-for="notif in gameStore.systemNotifications" :key="notif.id"
          class="px-4 py-3 rounded-xl flex items-start gap-3 shadow-2xl border pointer-events-auto backdrop-blur-md"
          :style="notif.sender && notif.sender.includes('Président')
            ? 'background: rgba(245, 158, 11, 0.18); border-color: rgba(245, 158, 11, 0.45); box-shadow: 0 8px 32px rgba(245, 158, 11, 0.2); color: #fef3c7;' 
            : 'background: rgba(var(--primary-rgb), 0.18); border-color: rgba(var(--primary-rgb), 0.35); box-shadow: 0 8px 32px rgba(var(--primary-rgb), 0.15); color: #fef3c7;' ">
          <component 
            :is="notif.sender && notif.sender.includes('Président') ? Crown : Zap" 
            class="w-5 h-5 flex-shrink-0 mt-0.5" 
            :class="notif.sender && notif.sender.includes('Président') ? 'text-amber-400' : 'text-primary'"
          />
          <div class="flex-1 min-w-0">
            <span class="block font-black uppercase tracking-widest opacity-70 mb-0.5" style="font-size: 0.6rem;">{{ notif.sender }}</span>
            <p class="text-sm font-semibold text-white leading-snug break-words">{{ notif.text }}</p>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Background abstract shapes -->
    <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
      <div class="absolute w-96 h-96 rounded-full" style="background: radial-gradient(circle, rgba(var(--primary-rgb), 0.35) 0%, transparent 70%); top: -10%; left: -10%; filter: blur(60px);"></div>
      <div class="absolute w-96 h-96 rounded-full" style="background: radial-gradient(circle, rgba(var(--primary-light-rgb), 0.2) 0%, transparent 70%); bottom: -10%; right: -10%; filter: blur(60px);"></div>
    </div>

    <!-- Left Side: Game Board (includes header and game view) -->
    <div class="flex-1 flex flex-col min-h-0 relative z-10">
      <!-- Game Header -->
      <div class="flex items-center justify-between px-6 py-4"
        style="background: transparent; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;">
        <div class="flex items-center gap-3">
          <!-- Room Code Badge -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all duration-300 hover:border-white/20"
            style="background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); color: #cbd5e1;">
            <Hash class="w-3.5 h-3.5 text-primary-light" />
            <span>Code:</span>
            <span class="font-mono font-bold text-white tracking-wider uppercase">{{ gameStore.currentRoomId }}</span>
          </div>

          <!-- Player Count Badge -->
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold backdrop-blur-md transition-all duration-300 hover:border-white/20"
            style="background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); color: #cbd5e1;">
            <Users class="w-3.5 h-3.5 text-primary-light" />
            <span>Joueurs:</span>
            <span class="font-bold text-white">{{ players.length }}</span>
          </div>

          <!-- Spectator badge -->
          <div v-if="amISpectator"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse"
            style="background: rgba(255,255,255,0.04); color: #94a3b8; border: 1px solid rgba(255,255,255,0.08);">
            <Eye class="w-3.5 h-3.5 text-slate-400" />
            <span>Mode Spectateur</span>
          </div>
        </div>
        <div class="flex gap-3 items-center">
          <Button v-if="gameStore.isHost && (!phase || phase === 'LOBBY')"
            @click="startGame"
            variant="primary"
            size="sm"
            :icon="Play"
          >
            Lancer la partie
          </Button>
          <Button
            @click="showHelpModal = true"
            variant="secondary"
            size="sm"
            :icon="HelpCircle"
          />
          <Button @click="gameStore.leaveGame"
            variant="danger"
            size="sm"
            :icon="LogOut"
          >
            Quitter
          </Button>
        </div>
      </div>

      <!-- Game Board Content -->
      <div class="flex-1 flex flex-col relative min-h-0">
        <!-- All players -->
        <div class="flex justify-center gap-3 px-4 py-4 flex-wrap" style="flex-shrink: 0;">
          <div v-for="player in players" :key="player.id"
            class="flex items-center gap-2 px-3 py-1.5 rounded-full relative overflow-hidden transition-all duration-300"
            :style="{
              background: player.id === currentTurnPlayerId ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
              border: player.id === currentTurnPlayerId ? '1px solid rgba(255,255,255,0.4)' : '1px solid rgba(255,255,255,0.05)',
              boxShadow: player.id === currentTurnPlayerId ? '0 0 20px rgba(236,72,153,0.3)' : 'none',
              transform: player.id === currentTurnPlayerId ? 'scale(1.05)' : 'scale(1)',
              opacity: player.isSpectator ? '0.65' : '1'
            }">
            
            <!-- Avatar -->
            <div class="relative">
              <div v-if="player.avatarUrl" class="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/20">
                <img :src="player.avatarUrl.startsWith('http') ? player.avatarUrl : `http://localhost:3000${player.avatarUrl}`" :alt="player.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
              </div>
              <div v-else class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-white/20 bg-gradient-to-br from-primary/25 to-primary-light/25 text-primary-light">
                {{ (player.username || '?').slice(0, 2).toUpperCase() }}
              </div>
              <!-- Role Icon Overlay -->
              <div v-if="player.role && player.role !== 'NEUTRE'" class="absolute -bottom-1.5 -right-1.5 p-0.5 rounded-full bg-[#151525] border border-white/10 flex items-center justify-center shadow-lg">
                <component :is="roleIcons[player.role as keyof typeof roleIcons]" class="w-3 h-3" :style="{ color: roleColors[player.role] }" />
              </div>
              <div v-else-if="player.isSpectator" class="absolute -bottom-1.5 -right-1.5 p-0.5 rounded-full bg-[#151525] border border-white/10 flex items-center justify-center shadow-lg">
                <Eye class="w-3 h-3 text-slate-400" />
              </div>
            </div>

            <span class="text-sm font-semibold" style="color: #f8fafc;">
              {{ player.username }}<span v-if="player.isMe" style="color: #f472b6;"> (moi)</span>
              <span v-if="player.isSpectator" class="text-xs ml-1.5 font-medium" style="color: #64748b;">👁️ Spec.</span>
            </span>
            <span v-if="!player.isSpectator" class="text-xs font-mono px-2 py-0.5 rounded-full" style="background: rgba(0,0,0,0.4); color: #cbd5e1;">{{ player.handCount }}</span>
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
        <div class="flex-1 flex flex-col items-center justify-center p-8 relative">
          
          <!-- ── Cinematic Game Events (Centered on table) ───────────────────── -->
          <Transition name="cinematic">
            <div v-if="gameStore.gameEvent" 
                 class="absolute z-40 flex items-center justify-center pointer-events-none overflow-hidden">
              <div class="flex flex-col items-center justify-center cinematic-content">
                <component 
                  :is="cinematicIcons[gameStore.gameEvent.type as keyof typeof cinematicIcons] || Flame" 
                  class="w-32 h-32 mb-6" 
                  :style="{ 
                    color: gameStore.gameEvent.type === 'revolution' ? '#ef4444' : 
                           gameStore.gameEvent.type === 'quad' ? '#fbbf24' :
                           gameStore.gameEvent.type === 'president' ? '#ffd700' : '#64748b',
                    filter: 'drop-shadow(0 0 30px currentColor)' 
                  }" 
                />
                <span class="text-5xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text text-center px-4"
                  :style="gameStore.gameEvent.type === 'revolution' ? 'background-image: linear-gradient(to right, #f43f5e, #9f1239); text-shadow: 0 0 40px rgba(244,63,94,0.6);' : 
                          gameStore.gameEvent.type === 'quad' ? 'background-image: linear-gradient(to right, #fbbf24, #d97706); text-shadow: 0 0 40px rgba(251,191,36,0.6);' :
                          gameStore.gameEvent.type === 'president' ? 'background-image: linear-gradient(to bottom, #ffd700, #b8860b); text-shadow: 0 0 40px rgba(255,215,0,0.6);' :
                          'background-image: linear-gradient(to right, #a8a29e, #57534e); text-shadow: 0 0 40px rgba(120,113,108,0.6);'">
                  {{ gameStore.gameEvent.text }}
                </span>
              </div>
            </div>
          </Transition>

          <div class="rounded-3xl flex items-center justify-center relative transition-all duration-300"
            style="width: 280px; height: 180px; background: rgba(0,0,0,0.2); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.3);"
            :style="gameStore.gameIsForcedRank ? 'border-color: rgba(239,68,68,0.5); box-shadow: inset 0 0 30px rgba(239,68,68,0.2), 0 10px 30px rgba(0,0,0,0.3);' : ''">
            
            <Transition name="ourien">
              <div v-if="gameStore.gameIsForcedRank && phase === 'PLAY'"
                class="ourien-badge absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 px-6 py-2.5 rounded-2xl text-base font-black tracking-widest pointer-events-none uppercase flex items-center gap-2"
                style="background: rgba(220, 38, 38, 0.2); backdrop-filter: blur(8px); border: 2px solid rgba(239,68,68,0.6); color: #fca5a5; text-shadow: 0 0 15px rgba(239,68,68,0.8); box-shadow: 0 0 30px rgba(239,68,68,0.2); margin-top: -10px;">
                <Lock class="w-5 h-5 text-red-400" />
                <span>{{ gameStore.gameIsForcedRank }} ou rien</span>
              </div>
            </Transition>

            <div v-if="currentTrick.length > 0">
              <TransitionGroup name="trick-card" class="flex gap-2" tag="div">
                <div v-for="(card, idx) in currentTrick" :key="`${card.suit}-${card.rank}-${idx}`"
                  class="rounded-xl flex flex-col items-center justify-center trick-card-item"
                  style="width: 56px; height: 80px; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; box-shadow: 0 4px 15px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,1);"
                  :style="{ animationDelay: `${idx * 80}ms` }">
                  <span class="font-black text-lg leading-none" :style="{ color: isRed(card.suit) ? '#ef4444' : '#0f172a' }">{{ card.rank }}</span>
                  <span class="text-2xl leading-none mt-1" :style="{ color: isRed(card.suit) ? '#ef4444' : '#0f172a' }">{{ getSuitSymbol(card.suit) }}</span>
                </div>
              </TransitionGroup>
            </div>
            <div v-else class="text-sm font-medium tracking-wide uppercase pointer-events-none" style="color: rgba(255,255,255,0.2);">Tapis vide</div>
          </div>

          <!-- Exchange phase indicator -->
          <div v-if="isExchangePhase && myExchangeRequest && !gameStore.exchangeSubmitted"
            class="flex flex-col items-center gap-3">
            <div class="px-6 py-3 rounded-2xl text-center flex flex-col items-center"
              style="background: rgba(251,191,36,0.08); backdrop-filter: blur(8px); border: 1px solid rgba(251,191,36,0.3);">
              <div class="text-base font-bold flex items-center gap-1.5" style="color: #fbbf24;">
                <RefreshCw class="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span>Échange de cartes</span>
              </div>
              <div class="text-xs mt-1" style="color: #fde68a;">
                Sélectionnez {{ myExchangeRequest.count }} carte(s) à donner
              </div>
              <div class="text-[10px] font-semibold mt-1 opacity-70" style="color: #94a3b8;">
                ({{ exchangeSelectedCards.length }} / {{ myExchangeRequest.count }} sélectionnée(s))
              </div>
            </div>
            <Button v-if="exchangeSelectedCards.length === myExchangeRequest.count"
              @click="submitExchange"
              variant="primary"
              size="md"
              :icon="Check"
              class="!from-amber-500 !to-orange-500 hover:!from-amber-400 hover:!to-orange-400 border-amber-500/20 shadow-amber-500/20"
            >
              Confirmer l'échange
            </Button>
          </div>

          <div v-else-if="isExchangePhase && myExchangeRequest && gameStore.exchangeSubmitted"
            class="px-6 py-3 rounded-2xl text-center flex items-center gap-2"
            style="background: rgba(16,185,129,0.08); backdrop-filter: blur(8px); border: 1px solid rgba(16,185,129,0.2);">
            <Check class="w-4 h-4 text-emerald-400 animate-pulse" />
            <div class="text-xs font-semibold" style="color: #6ee7b7;">Échange soumis — en attente des autres...</div>
          </div>

          <div v-else-if="isExchangePhase && !myExchangeRequest"
            class="px-6 py-3 rounded-2xl text-center flex items-center gap-2"
            style="background: rgba(255,255,255,0.03); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.08);">
            <Loader2 class="w-4 h-4 text-slate-400 animate-spin" />
            <div class="text-xs text-slate-400" style="color: #94a3b8;">En attente des échanges...</div>
          </div>

          <!-- Actions -->
          <div v-if="phase === 'PLAY' && !amISpectator" class="flex gap-4 items-center">
            <div v-if="isMyTurn" class="text-xs px-4 py-1.5 rounded-xl font-bold uppercase tracking-wider animate-pulse flex items-center gap-1"
              style="background: rgba(236,72,153,0.15); color: #f472b6; border: 1px solid rgba(236,72,153,0.25);">
              <Zap class="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
              <span>Ton tour</span>
            </div>
            <!-- Use canPlay computed — never flashes from spam clicks -->
            <Button v-if="canPlay"
              @click="playSelected"
              variant="primary"
              size="md"
              :icon="Play"
            >
              Jouer ({{ selectedCards.length }})
            </Button>
            <Button v-if="isMyTurn"
              @click="passTurn"
              variant="secondary"
              size="md"
            >
              Passer
            </Button>
          </div>

          <!-- Spectator message in PLAY phase -->
          <div v-if="phase === 'PLAY' && amISpectator"
            class="px-6 py-3 rounded-2xl text-center flex items-center gap-2"
            style="background: rgba(255,255,255,0.04); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.08);">
            <Eye class="w-4 h-4 text-slate-400" />
            <div class="text-sm font-medium" style="color: #64748b;">Vous observez la partie en tant que spectateur</div>
          </div>
        </div>

        <!-- My hand (hidden for spectators) -->
        <div v-if="!amISpectator" class="px-4 pb-4 pt-4" style="flex-shrink: 0; background: linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 100%);">
          <div class="text-center text-xs mb-2 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5" style="color: #94a3b8;">
            <span v-if="!phase || phase === 'LOBBY'">En attente du lancement...</span>
            <span v-else-if="isExchangePhase && myExchangeRequest && !gameStore.exchangeSubmitted" class="flex items-center gap-1" style="color: #fbbf24; text-shadow: 0 0 10px rgba(251,191,36,0.4);">
              <RefreshCw class="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span>Choisissez vos cartes à échanger</span>
            </span>
            <span v-else-if="isExchangePhase && myExchangeRequest && gameStore.exchangeSubmitted" style="color: #6ee7b7;">En attente de confirmation...</span>
            <span v-else-if="isExchangePhase">En attente des échanges...</span>
            <span v-else-if="isMyTurn" class="flex items-center gap-1" style="color: #f472b6; text-shadow: 0 0 10px rgba(244,114,182,0.4);">
              <Zap class="w-3.5 h-3.5 text-pink-400 fill-pink-400 animate-pulse" />
              <span>À toi de jouer</span>
            </span>
            <span v-else>Tour de l'adversaire...</span>
          </div>
          <div class="flex justify-center items-end pb-2 px-2 pt-6" ref="handContainerRef"
            style="overflow-x: auto; -webkit-overflow-scrolling: touch; min-height: 95px;">
            <div v-for="(card, idx) in myHand" :key="`${card.suit}-${card.rank}-${idx}`"
              :data-rank="card.rank"
              :data-suit="card.suit"
              @click="isExchangePhase && myExchangeRequest && !gameStore.exchangeSubmitted ? toggleExchangeCard(card) : toggleCard(card)"
              class="rounded-lg flex flex-col items-center justify-center flex-shrink-0 transition-all duration-150"
              :class="{ 
                 'cursor-pointer': (isExchangePhase && myExchangeRequest && !gameStore.exchangeSubmitted) || (isMyTurn && isPlayable(card)),
                 'unplayable': !isExchangePhase && (!isPlayable(card) && !isSelected(card))
              }"
              :style="{
                width: '46px',
                height: '66px',
                background: (isExchangePhase && isExchangeSelected(card)) ? '#fff7ed' : isSelected(card) ? '#f0f0ff' : '#fefefe',
                border: (isExchangePhase && isExchangeSelected(card)) ? '2px solid #f59e0b' : isSelected(card) ? '2px solid #6366f1' : '1px solid #d1d5db',
                marginLeft: idx === 0 ? '0' : (myHand.length > 7 ? '-8px' : '3px'),
                position: 'relative',
                zIndex: (isExchangePhase && isExchangeSelected(card)) || isSelected(card) ? 50 : idx,
                transform: (isExchangePhase && isExchangeSelected(card)) || isSelected(card) ? 'translateY(-10px)' : 'translateY(0)',
                boxShadow: (isExchangePhase && isExchangeSelected(card)) ? '0 4px 12px rgba(245,158,11,0.4)' : isSelected(card) ? '0 4px 12px rgba(99,102,241,0.4)' : '0 1px 4px rgba(0,0,0,0.12)',
                opacity: (!isExchangePhase && !isPlayable(card)) && !isSelected(card) ? '0.25' : '1',
                filter: (!isExchangePhase && !isPlayable(card)) && !isSelected(card) ? 'grayscale(80%)' : 'none',
                cursor: (isExchangePhase && myExchangeRequest && !gameStore.exchangeSubmitted) ? 'pointer' : undefined,
                pointerEvents: (!isExchangePhase && !isPlayable(card) && !isSelected(card)) ? 'none' : 'auto',
              }">
              <span class="font-bold text-xs leading-none" :style="{ color: isRed(card.suit) ? '#dc2626' : '#1e293b' }">{{ card.rank }}</span>
              <span class="text-base leading-none" :style="{ color: isRed(card.suit) ? '#dc2626' : '#1e293b' }">{{ getSuitSymbol(card.suit) }}</span>
            </div>
            <div v-if="myHand.length === 0 && phase === 'PLAY'"
              class="text-sm py-4 flex items-center justify-center gap-1.5" style="color: #475569;">
              <span>Tu n'as plus de cartes</span>
              <Sparkles class="w-4 h-4 text-yellow-400 animate-bounce" />
            </div>
          </div>
        </div>

        <!-- Spectator hand zone placeholder -->
        <div v-else class="px-4 pb-4 pt-2" style="flex-shrink: 0;">
          <div class="text-center text-xs uppercase tracking-widest font-semibold py-3 flex items-center justify-center gap-1.5" style="color: #334155;">
            <Eye class="w-4 h-4 text-slate-500" />
            <span>Spectateur — vous rejoindrez à la prochaine manche</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side: Chat -->
    <div class="w-80 flex-shrink-0 p-3 flex flex-col h-full relative z-10" style="border-left: 1px solid rgba(255,255,255,0.06);">
      <Chat />
    </div>

    <!-- Modale de Fin de Partie (RESULTS) -->
    <div v-if="phase === 'RESULTS'"
      class="absolute flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4">
      <div class="w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style="background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.1);">
        
        <div class="p-6 text-center border-b border-white/10">
          <h2 class="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-amber-500">
            Fin de la Manche
          </h2>
          <p class="text-sm text-slate-400 mt-2">Le Président a triomphé !</p>
        </div>

        <div class="p-6 space-y-3">
          <div v-for="(player, idx) in players" :key="player.id"
            class="flex items-center justify-between p-3 rounded-xl"
            :style="{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `4px solid ${roleColors[player.role || 'NEUTRE']}` }">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <component :is="roleIcons[(player.role || 'NEUTRE') as keyof typeof roleIcons]" class="w-5 h-5" :style="{ color: roleColors[player.role || 'NEUTRE'] }" />
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-slate-100">{{ player.username }}</span>
                <span class="text-xs uppercase tracking-wider font-semibold opacity-70" :style="{ color: roleColors[player.role || 'NEUTRE'] }">
                  {{ player.role }}
                </span>
              </div>
            </div>
            <div class="font-mono text-sm font-bold" :class="getMmrColorClass(player.role || 'NEUTRE')">
              {{ getMmrText(player.role || 'NEUTRE') }}
            </div>
          </div>
        </div>

        <div class="p-6 flex justify-center gap-4 bg-black/20 border-t border-white/5">
          <Button v-if="gameStore.isHost" @click="startGame"
            variant="primary"
            size="lg"
            full-width
            :icon="Play"
          >
            Relancer une Manche
          </Button>
          <div v-else class="text-sm font-medium text-slate-400 py-3 flex items-center gap-2">
            <Loader2 class="w-4 h-4 text-primary animate-spin" />
            <span>En attente du chef de salon...</span>
          </div>
        </div>

      </div>
    </div>

    <!-- Modale d'Aide (Règles & Paramètres) -->
    <div v-if="showHelpModal" class="absolute flex items-center justify-center z-50 bg-black/80 backdrop-blur-sm p-4" @click.self="showHelpModal = false">
      <div class="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]" style="background: #151525; border: 1px solid rgba(255,255,255,0.06);">
        <!-- Onglets -->
        <div class="border-b border-white/10" style="background: rgba(0,0,0,0.2);">
          <div class="p-5 flex justify-between items-center pb-2">
            <div class="flex items-center gap-2 text-primary font-bold">
              <HelpCircle class="w-5 h-5 text-primary" />
              <h2 class="text-lg">Aide de la partie</h2>
            </div>
            <Button @click="showHelpModal = false" variant="ghost" size="sm" :icon="X" />
          </div>
          <div class="flex px-5 gap-4">
            <button 
              @click="activeHelpTab = 'rules'"
              class="pb-3 text-sm font-semibold transition-all relative"
              :class="activeHelpTab === 'rules' ? 'text-primary' : 'text-slate-400 hover:text-slate-200'"
            >
              Règles du jeu
              <span v-if="activeHelpTab === 'rules'" class="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-full"></span>
            </button>
            <button 
              @click="activeHelpTab = 'settings'"
              class="pb-3 text-sm font-semibold transition-all relative"
              :class="activeHelpTab === 'settings' ? 'text-primary' : 'text-slate-400 hover:text-slate-200'"
            >
              Configuration de la partie
              <span v-if="activeHelpTab === 'settings'" class="absolute bottom-0 left-0 w-full h-[2px] bg-primary rounded-full"></span>
            </button>
          </div>
        </div>

        <!-- Contenu de la Modale -->
        <div class="p-6 overflow-y-auto text-sm text-slate-300">
          <!-- Règles -->
          <div v-if="activeHelpTab === 'rules'" class="space-y-4">
            <p><strong>Hiérarchie des cartes :</strong> 3, 4, 5, 6, 7, 8, 9, 10, Valet, Dame, Roi, As, 2.</p>
            <p><strong>Le but :</strong> Se débarrasser de toutes ses cartes en premier.</p>
            <p><strong>Déroulement :</strong> Le premier joueur pose une carte (ou une paire, brelan, carré). Les joueurs suivants doivent poser le <strong>même nombre de cartes</strong>, d'une valeur <strong>égale ou supérieure</strong>.</p>
            <p><strong>Le 2 :</strong> C'est la carte spéciale. Elle permet de couper n'importe quel pli et donne instantanément la main au joueur qui l'a posée.</p>
            <p><strong>Couper un pli :</strong> Jouer une carte de même valeur que la précédente oblige le joueur suivant à jouer cette même valeur (et non une valeur supérieure) ou à passer son tour.</p>
            <p><strong>Le Carré :</strong> Si 4 cartes de même valeur se retrouvent sur la table (jouées en une ou plusieurs fois), le pli se termine immédiatement. Le joueur qui a complété le carré remporte le pli.</p>
            <p><strong>Passer :</strong> Si vous ne pouvez ou ne voulez pas jouer, vous passez. Vous pourrez rejouer au prochain tour, sauf si tous les joueurs passent consécutivement.</p>
            <p><strong>Rôles :</strong> Le premier à finir est Président, le deuxième Vice-Président, l'avant-dernier Vice-Trou du Cul, le dernier Trou du Cul. À la manche suivante, le Président échange ses 2 pires cartes contre les 2 meilleures du TDC (et inversement). Idem pour 1 carte avec les Vices.</p>
          </div>

          <!-- Configuration -->
          <div v-if="activeHelpTab === 'settings'" class="space-y-3">
            <div class="flex justify-between pb-2 border-b border-white/5">
              <span>Joueurs max:</span>
              <span class="font-semibold text-slate-100">{{ gameStore.gameConfig?.maxPlayers || 'N/A' }}</span>
            </div>
            <div class="flex justify-between pb-2 border-b border-white/5 flex items-center">
              <span>Suites autorisées:</span>
              <span class="font-semibold flex items-center gap-1" :class="gameStore.gameConfig?.enableSequences ? 'text-emerald-400' : 'text-rose-400'">
                <component :is="gameStore.gameConfig?.enableSequences ? Check : X" class="w-4 h-4" />
                <span>{{ gameStore.gameConfig?.enableSequences ? 'Oui' : 'Non' }}</span>
              </span>
            </div>
            <div class="flex justify-between pb-2 border-b border-white/5 flex items-center">
              <span>Révolution (Carré):</span>
              <span class="font-semibold flex items-center gap-1" :class="gameStore.gameConfig?.enableRevolution ? 'text-emerald-400' : 'text-rose-400'">
                <component :is="gameStore.gameConfig?.enableRevolution ? Check : X" class="w-4 h-4" />
                <span>{{ gameStore.gameConfig?.enableRevolution ? 'Oui' : 'Non' }}</span>
              </span>
            </div>
            <div class="flex justify-between pb-2 border-b border-white/5 flex items-center">
              <span>Révolution ramasse:</span>
              <span class="font-semibold flex items-center gap-1" :class="gameStore.gameConfig?.revolutionResetsTrick ? 'text-emerald-400' : 'text-rose-400'">
                <component :is="gameStore.gameConfig?.revolutionResetsTrick ? Check : X" class="w-4 h-4" />
                <span>{{ gameStore.gameConfig?.revolutionResetsTrick ? 'Oui' : 'Non' }}</span>
              </span>
            </div>
            <div class="flex justify-between pb-2 border-b border-white/5 flex items-center">
              <span>Échange de cartes:</span>
              <span class="font-semibold flex items-center gap-1" :class="gameStore.gameConfig?.exchangeCards ? 'text-emerald-400' : 'text-rose-400'">
                <component :is="gameStore.gameConfig?.exchangeCards ? Check : X" class="w-4 h-4" />
                <span>{{ gameStore.gameConfig?.exchangeCards ? 'Oui' : 'Non' }}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-white/10 flex justify-end">
          <Button @click="showHelpModal = false" variant="secondary" size="md">
            Fermer
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Cinematic Game Event Overlay ───────────────────────────────────────── */
.game-event-enter-active {
  animation: gameEventIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.game-event-leave-active {
  animation: gameEventOut 0.5s ease-in forwards;
}

@keyframes gameEventIn {
  0% { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes gameEventOut {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.2); }
}

.game-event-icon {
  font-size: 3.5rem;
  line-height: 1;
  animation: iconBounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes iconBounce {
  0% { transform: scale(0) rotate(-20deg); }
  70% { transform: scale(1.2) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}

/* ── Toast notifications — bottom right ────────────────────────────────── */
.toast-enter-active {
  animation: toastIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.toast-leave-active {
  animation: toastOut 0.35s ease-in forwards;
}
.toast-move {
  transition: transform 0.3s ease;
}

@keyframes toastIn {
  0% { opacity: 0; transform: translateX(60px) scale(0.9); }
  100% { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes toastOut {
  0% { opacity: 1; transform: translateX(0) scale(1); }
  100% { opacity: 0; transform: translateX(80px) scale(0.9); }
}

/* ── "Ou rien" transition ────────────────────────────────────────────────── */
.ourien-enter-active {
  animation: ourien-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.ourien-leave-active {
  animation: ourien-out 0.3s ease-in forwards;
}
@keyframes ourien-in {
  0% { opacity: 0; transform: translateY(-20px) scale(0.8); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ourien-out {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.9); }
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

/* ── Cards on table ─────────────────────────────────────────────────────── */
.trick-card-item {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.trick-card-enter-active {
  animation: cardFlyIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
.trick-card-leave-active {
  position: absolute;
  opacity: 0;
  transform: translateY(-20px) scale(0.8);
  transition: all 0.2s ease-in;
}
@keyframes cardFlyIn {
  0% { opacity: 0; transform: translateY(100px) scale(0.5) rotate(-20deg); }
  50% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
}

/* ── Pulsating "ou rien" badge ──────────────────────────────────────────── */
.ourien-badge {
  animation: pulseGlow 1.8s infinite alternate ease-in-out;
}
@keyframes pulseGlow {
  0% { box-shadow: 0 0 15px rgba(239,68,68,0.2), inset 0 0 10px rgba(239,68,68,0.1); transform: scale(1); }
  100% { box-shadow: 0 0 35px rgba(239,68,68,0.7), inset 0 0 20px rgba(239,68,68,0.3); transform: scale(1.05); }
}
</style>
