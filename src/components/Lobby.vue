<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useGameStore } from '../stores/game'
import Button from './Button.vue'
import { RotateCw, Plus, X, Check, ChevronRight, Gamepad2, Sliders, Club, Spade, User, LayoutGrid, Crown } from '@lucide/vue'

const gameStore = useGameStore()
const joinRoomId = ref('')
const showSettings = ref(false)

const configOptions = reactive({
  minPlayers: 3,
  maxPlayers: 7,
  enableSequences: false,
  enableRevolution: true,
  revolutionResetsTrick: true,
  exchangeCards: true,
})

const handleCreateGame = () => {
  showSettings.value = false
  gameStore.createGame(configOptions)
}

const getRoomPlayers = (room: any) => {
  // Support both Colyseus lobby format (metadata.players) and REST API format (room.players)
  const players = room.metadata?.players ?? room.players
  if (players && Array.isArray(players) && players.length > 0) {
    return players
  }
  return []
}

const getElapsedTime = (createdAt: number | undefined) => {
  if (!createdAt) return 'à l\'instant'
  const elapsedMs = Date.now() - createdAt
  const elapsedSec = Math.floor(elapsedMs / 1000)
  const elapsedMin = Math.floor(elapsedSec / 60)
  const elapsedHrs = Math.floor(elapsedMin / 60)

  if (elapsedSec < 60) {
    return 'quelques secondes'
  } else if (elapsedMin < 60) {
    return `${elapsedMin} min`
  } else if (elapsedHrs < 24) {
    return `${elapsedHrs} h`
  } else {
    const days = Math.floor(elapsedHrs / 24)
    return `${days} j`
  }
}

onMounted(async () => {
  await gameStore.joinLobby()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex justify-between items-center flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <!-- Circular Gold Club Suit Icon -->
        <div class="w-12 h-12 rounded-full border border-primary flex items-center justify-center bg-primary/5 shadow-[inset_0_1px_3px_rgba(155,113,52,0.2)] flex-shrink-0">
          <Club class="w-6 h-6 text-primary fill-primary" />
        </div>
        <div>
          <h2 class="text-xl tracking-wider text-slate-100 font-cinzel leading-tight uppercase">Parties disponibles</h2>
          <p class="text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-wider">{{ gameStore.lobbyRooms.length }} salon(s) actif(s)</p>
        </div>
      </div>
      <div class="flex gap-3">
        <!-- Actualiser (Desktop / Tablet) -->
        <Button
          @click="gameStore.fetchRooms()"
          variant="secondary"
          :icon="RotateCw"
          size="md"
          class="hidden sm:inline-flex"
        >
          Actualiser
        </Button>
        <!-- Actualiser (Mobile - icon only) -->
        <Button
          @click="gameStore.fetchRooms()"
          variant="secondary"
          :icon="RotateCw"
          size="md"
          class="sm:hidden"
        />
        <Button
          @click="showSettings = true"
          variant="primary"
          :icon="Plus"
          size="md"
        >
          <span class="hidden sm:inline">Créer une partie</span>
          <span class="sm:hidden">Créer</span>
        </Button>
      </div>
    </div>

    <!-- Modal Paramètres de Partie -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-[100] flex items-center justify-center p-4" style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px);">
        <div class="rounded-2xl p-6 w-full max-w-md border" style="background: #151525; border-color: rgba(255,255,255,0.06);">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center gap-2 text-primary font-bold">
              <Sliders class="w-4 h-4" />
              <h3 class="text-lg">Paramètres de la partie</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              class="!p-1 text-slate-400 hover:text-white"
              @click="showSettings = false"
            >
              <X class="w-4 h-4" />
            </Button>
          </div>

          <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <!-- Nombre de joueurs -->
            <div class="flex justify-between items-center py-1">
              <span class="text-sm font-bold text-slate-300">Joueurs Max</span>
              <select v-model.number="configOptions.maxPlayers" class="rounded-lg px-3 py-2 text-sm font-semibold" style="background: rgba(255,255,255,0.04); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.08); outline: none;">
                <option :value="3" class="bg-[#151525]">3 Joueurs</option>
                <option :value="4" class="bg-[#151525]">4 Joueurs</option>
                <option :value="5" class="bg-[#151525]">5 Joueurs</option>
                <option :value="6" class="bg-[#151525]">6 Joueurs</option>
                <option :value="7" class="bg-[#151525]">7 Joueurs</option>
              </select>
            </div>

            <!-- Variantes -->
            <label class="flex items-center gap-3.5 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);">
              <input type="checkbox" v-model="configOptions.enableSequences" class="w-4 h-4 rounded accent-primary">
              <div>
                <div class="text-sm font-bold text-slate-300">Suites autorisées</div>
                <div class="text-xs text-slate-500 mt-0.5">Permet de jouer des suites (ex: 3,4,5)</div>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);">
              <input type="checkbox" v-model="configOptions.enableRevolution" class="w-4 h-4 rounded accent-primary">
              <div>
                <div class="text-sm font-bold text-slate-300">Révolution</div>
                <div class="text-xs text-slate-500 mt-0.5">Un carré inverse l'ordre des cartes</div>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all" :style="{ opacity: configOptions.enableRevolution ? 1 : 0.5 }" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);">
              <input type="checkbox" v-model="configOptions.revolutionResetsTrick" :disabled="!configOptions.enableRevolution" class="w-4 h-4 rounded accent-primary">
              <div>
                <div class="text-sm font-bold text-slate-300">Révolution ramasse</div>
                <div class="text-xs text-slate-500 mt-0.5">Un carré ferme également le pli en cours</div>
              </div>
            </label>

            <label class="flex items-center gap-3.5 cursor-pointer p-3 rounded-xl hover:bg-white/5 transition-all" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04);">
              <input type="checkbox" v-model="configOptions.exchangeCards" class="w-4 h-4 rounded accent-primary">
              <div>
                <div class="text-sm font-bold text-slate-300">Échange de cartes</div>
                <div class="text-xs text-slate-500 mt-0.5">Président ↔ TDC en début de manche</div>
              </div>
            </label>
          </div>

          <Button
            @click="handleCreateGame"
            variant="primary"
            full-width
            size="lg"
            class="mt-6"
          >
            Valider et Créer
          </Button>
        </div>
      </div>
    </Teleport>

    <!-- Code partageable après création -->
    <div v-if="gameStore.currentRoomId"
      class="rounded-xl p-4 flex items-center justify-between"
      style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);">
      <div class="flex items-center gap-2">
        <Check class="w-5 h-5 text-emerald-400" />
        <div>
          <p class="text-sm font-bold text-emerald-400">Partie créée !</p>
          <p class="text-[10px] uppercase font-bold text-emerald-500/80 tracking-wider">Partage ce code à ton ami :</p>
        </div>
      </div>
      <div class="font-mono font-black text-3xl tracking-widest select-all text-emerald-400">
        {{ gameStore.currentRoomId }}
      </div>
    </div>

    <!-- Rejoindre par code -->
    <div class="rounded-2xl p-6 bg-background-2 border border-white/[0.04] space-y-4">
      <div>
        <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 font-cinzel">Rejoindre une partie par code</h3>
        <p class="text-[11px] text-slate-500 mt-1.5 tracking-wide leading-relaxed font-medium">Entrez le code secret d'une partie pour la rejoindre directement.</p>
      </div>
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          v-model="joinRoomId"
          placeholder="Code de partie (ex: AB12)"
          maxlength="4"
          class="w-full sm:w-60 sm:min-w-[200px] rounded-xl px-4 py-3 text-sm outline-none uppercase font-medium placeholder-slate-600 tracking-wide bg-[#090d14] border border-white/5 focus:border-primary text-slate-100 transition-all duration-200"
        />
        <Button
          @click="gameStore.joinGame(joinRoomId.toUpperCase())"
          :disabled="joinRoomId.length < 4"
          variant="primary"
          size="md"
          class="w-full sm:w-auto px-8"
        >
          Rejoindre
        </Button>
      </div>
    </div>

    <!-- Liste des rooms -->
    <div v-if="gameStore.lobbyRooms.length === 0"
      class="rounded-2xl p-8 text-center flex flex-col items-center justify-center bg-background-2 border border-white/[0.04]">
      <!-- Centered gold circle with transparent playing cards PNG -->
      <div class="w-16 h-16 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center mb-3 shadow-[inset_0_1px_3px_rgba(155,113,52,0.15)] flex-shrink-0">
        <img src="/cards.png" alt="Cards" class="w-8 h-8 object-contain" />
      </div>
      <p class="font-bold text-primary-light font-cinzel text-lg mb-1">Aucune autre partie disponible</p>
      <p class="text-xs text-slate-400 font-medium max-w-sm mb-4 leading-relaxed">Soyez le premier à créer une partie et à inviter vos amis !</p>
      <Button
        @click="showSettings = true"
        variant="primary"
        size="md"
      >
        + Créer une partie
      </Button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="room in gameStore.lobbyRooms"
        :key="room.roomId"
        class="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 bg-background-2 border border-primary/30 transition-all hover:border-primary/55"
      >
        <!-- Left Section: Spade Emblem & Room Metadata -->
        <div class="flex items-center gap-4 w-full sm:w-auto">
          <!-- Circular Gold Spade Suit Icon -->
          <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-primary flex items-center justify-center bg-primary/5 flex-shrink-0">
            <Spade class="w-5 h-5 sm:w-6 sm:h-6 text-primary fill-primary" />
          </div>
          <div class="space-y-1 sm:space-y-2 flex-1 sm:flex-initial">
            <div class="flex items-center justify-between sm:justify-start gap-2">
              <!-- Room code: WHITE (not gold) -->
              <div class="text-lg sm:text-xl font-bold text-white font-cinzel tracking-wider leading-none">
                {{ (room.metadata as any)?.code || (room as any).code || room.roomId.slice(0,4).toUpperCase() }}
              </div>
              <!-- Creation Elapsed Time (only inline on mobile) -->
              <div class="flex sm:hidden items-center gap-1 text-[10px] font-medium text-slate-500">
                <span class="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0"></span>
                <span>{{ getElapsedTime((room.metadata as any)?.createdAt ?? (room as any).createdAt) }}</span>
              </div>
            </div>
            <!-- Badges row -->
            <div class="flex items-center flex-wrap gap-2">
              <div class="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] text-[10px] sm:text-[11px] font-medium text-slate-400">
                <User class="w-3 h-3 flex-shrink-0" />
                <span>{{ room.clients }} / {{ room.maxClients }} joueurs</span>
              </div>
              <div class="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] text-[10px] sm:text-[11px] font-medium text-slate-400">
                <LayoutGrid class="w-3 h-3 flex-shrink-0" />
                <span>Partie classique</span>
              </div>
            </div>
            <!-- Creation Elapsed Time (desktop/tablet only) -->
            <div class="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span>Créée il y a {{ getElapsedTime((room.metadata as any)?.createdAt ?? (room as any).createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Center Section: Horizontal Player Slots (hidden on mobile phone screens) -->
        <div class="hidden sm:flex flex-1 items-start gap-3 sm:gap-4 overflow-hidden">
          <div
            v-for="i in room.maxClients"
            :key="i"
            class="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <!-- Occupied Slot -->
            <template v-if="getRoomPlayers(room)[i - 1]">
              <div class="relative flex justify-center">
                <!-- Crown above host -->
                <Crown
                  v-if="getRoomPlayers(room)[i - 1].isHost"
                  class="absolute -top-3.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 text-primary fill-primary"
                />
                <!-- Avatar circle with gold border for host, muted for others -->
                <div
                  class="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
                  :class="getRoomPlayers(room)[i - 1].isHost
                    ? 'border-2 border-primary bg-[#1c1a10]'
                    : 'border border-slate-700/60 bg-[#161620]'"
                >
                  <span
                    class="text-xs sm:text-sm font-bold font-cinzel"
                    :class="getRoomPlayers(room)[i - 1].isHost ? 'text-primary' : 'text-slate-300'"
                  >
                    {{ (getRoomPlayers(room)[i - 1].username || '?').slice(0, 2).toUpperCase() }}
                  </span>
                </div>
              </div>
              <!-- Username -->
              <span class="text-[10px] sm:text-[11px] font-medium text-slate-300 max-w-[44px] sm:max-w-[52px] truncate text-center leading-none">
                {{ getRoomPlayers(room)[i - 1].username }}
              </span>
              <!-- Hôte label -->
              <span v-if="getRoomPlayers(room)[i - 1].isHost" class="text-[9px] sm:text-[10px] font-semibold text-primary leading-none">
                Hôte
              </span>
            </template>

            <!-- Empty Slot -->
            <template v-else>
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-slate-700/40 bg-[#13131e] flex items-center justify-center">
                <User class="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </div>
              <span class="text-[10px] sm:text-[11px] font-medium text-slate-500 text-center leading-none">En attente</span>
            </template>
          </div>
        </div>

        <!-- Right Section: Join Button (Button component) -->
        <div class="w-full sm:w-auto flex-shrink-0">
          <Button
            @click="gameStore.joinGame(room.roomId)"
            variant="primary"
            size="md"
            :icon="ChevronRight"
            icon-position="right"
            class="w-full sm:w-auto"
          >
            Rejoindre
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
