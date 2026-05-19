<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useGameStore } from '../stores/game'

const gameStore = useGameStore()
const joinRoomId = ref('')
const showSettings = ref(false)

const configOptions = reactive({
  minPlayers: 3,
  maxPlayers: 7,
  enableSequences: false,
  enableSpecialTwo: false,
  enableRevolution: true,
  revolutionResetsTrick: true,
  exchangeCards: true,
})

const handleCreateGame = () => {
  showSettings.value = false
  gameStore.createGame(configOptions)
}

onMounted(async () => {
  await gameStore.joinLobby()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold" style="color: #f1f5f9;">Parties disponibles</h2>
        <p class="text-sm mt-0.5" style="color: #64748b;">{{ gameStore.lobbyRooms.length }} room(s) active(s)</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="gameStore.fetchRooms()"
          class="px-4 py-2.5 rounded-xl text-sm transition-all"
          style="color: #64748b; border: 1px solid rgba(255,255,255,0.08); cursor: pointer;"
        >
          🔄 Actualiser
        </button>
        <button
          @click="showSettings = true"
          class="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer;"
        >
          + Créer une partie
        </button>
      </div>
    </div>

    <!-- Modal Paramètres de Partie -->
    <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(4px);">
      <div class="rounded-2xl p-6 w-full max-w-md" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1);">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold" style="color: #f8fafc;">Règles de la partie</h3>
          <button @click="showSettings = false" class="text-xl" style="color: #64748b;">✕</button>
        </div>

        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          <!-- Nombre de joueurs -->
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium" style="color: #cbd5e1;">Joueurs Max</span>
            <select v-model.number="configOptions.maxPlayers" class="rounded-lg px-3 py-1.5 text-sm" style="background: rgba(255,255,255,0.05); color: #f1f5f9; border: 1px solid rgba(255,255,255,0.1);">
              <option :value="3">3 Joueurs</option>
              <option :value="4">4 Joueurs</option>
              <option :value="5">5 Joueurs</option>
              <option :value="6">6 Joueurs</option>
              <option :value="7">7 Joueurs</option>
            </select>
          </div>

          <!-- Variantes -->
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="configOptions.enableSequences" class="w-4 h-4 rounded" style="accent-color: #7c3aed;">
            <div>
              <div class="text-sm font-medium" style="color: #cbd5e1;">Suites autorisées</div>
              <div class="text-xs" style="color: #64748b;">Permet de jouer des suites (ex: 3,4,5)</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="configOptions.enableSpecialTwo" class="w-4 h-4 rounded" style="accent-color: #7c3aed;">
            <div>
              <div class="text-sm font-medium" style="color: #cbd5e1;">Le 2 brûle le pli</div>
              <div class="text-xs" style="color: #64748b;">Jouer un 2 ramasse le pli immédiatement</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="configOptions.enableRevolution" class="w-4 h-4 rounded" style="accent-color: #7c3aed;">
            <div>
              <div class="text-sm font-medium" style="color: #cbd5e1;">Révolution</div>
              <div class="text-xs" style="color: #64748b;">Un carré inverse l'ordre des cartes</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer" :style="{ opacity: configOptions.enableRevolution ? 1 : 0.5 }">
            <input type="checkbox" v-model="configOptions.revolutionResetsTrick" :disabled="!configOptions.enableRevolution" class="w-4 h-4 rounded" style="accent-color: #7c3aed;">
            <div>
              <div class="text-sm font-medium" style="color: #cbd5e1;">Révolution ramasse</div>
              <div class="text-xs" style="color: #64748b;">Un carré ferme également le pli en cours</div>
            </div>
          </label>

          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" v-model="configOptions.exchangeCards" class="w-4 h-4 rounded" style="accent-color: #7c3aed;">
            <div>
              <div class="text-sm font-medium" style="color: #cbd5e1;">Échange de cartes</div>
              <div class="text-xs" style="color: #64748b;">Président ↔ TDC en début de manche</div>
            </div>
          </label>
        </div>

        <button
          @click="handleCreateGame"
          class="w-full mt-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
          style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white;"
        >
          Valider et Créer
        </button>
      </div>
    </div>

    <!-- Code partageable après création -->
    <div v-if="gameStore.currentRoomId"
      class="rounded-xl p-4 flex items-center justify-between"
      style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);">
      <div>
        <p class="text-sm font-medium" style="color: #34d399;">✅ Partie créée !</p>
        <p class="text-xs mt-0.5" style="color: #6ee7b7;">Partage ce code à ton ami :</p>
      </div>
      <div class="font-mono font-bold text-3xl tracking-widest select-all" style="color: #34d399;">
        {{ gameStore.currentRoomId }}
      </div>
    </div>

    <!-- Rejoindre par code -->
    <div class="rounded-xl p-4" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);">
      <p class="text-sm font-medium mb-3" style="color: #94a3b8;">Rejoindre par code</p>
      <div class="flex gap-2">
        <input
          v-model="joinRoomId"
          placeholder="XXXX"
          maxlength="4"
          class="flex-1 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest outline-none uppercase"
          style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f1f5f9;"
        />
        <button
          @click="gameStore.joinGame(joinRoomId.toUpperCase())"
          :disabled="joinRoomId.length < 4"
          class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style="background: #7c3aed; color: white; cursor: pointer;"
          :style="joinRoomId.length < 4 ? 'opacity: 0.4; cursor: not-allowed;' : ''"
        >
          Rejoindre
        </button>
      </div>
    </div>

    <!-- Liste des rooms  -->
    <div v-if="gameStore.lobbyRooms.length === 0"
      class="rounded-xl p-10 text-center"
      style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08);">
      <div class="text-3xl mb-2">🃏</div>
      <p style="color: #475569;">Aucune partie en cours. Crée-en une !</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="room in gameStore.lobbyRooms"
        :key="room.roomId"
        class="rounded-xl p-4 flex items-center justify-between transition-all"
        style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);"
      >
        <div class="flex items-center gap-3">
          <div class="font-mono font-bold text-2xl tracking-widest" style="color: #a855f7;">{{ (room.metadata as any)?.code || (room as any).code || room.roomId.slice(0,4).toUpperCase() }}</div>
          <div class="text-sm" style="color: #64748b;">
            {{ room.clients }} / {{ room.maxClients }} joueurs
          </div>
        </div>
        <button
          @click="gameStore.joinGame(room.roomId)"
          class="px-4 py-2 rounded-lg text-sm font-semibold"
          style="background: rgba(124,58,237,0.2); color: #a855f7; border: 1px solid rgba(124,58,237,0.3); cursor: pointer;"
        >
          Rejoindre →
        </button>
      </div>
    </div>
  </div>
</template>
