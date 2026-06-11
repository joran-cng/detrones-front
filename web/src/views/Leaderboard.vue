<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { 
  Trophy, 
  Globe, 
  Users, 
  Clock, 
  Crown, 
  Award, 
  Gift, 
  Loader2 
} from '@lucide/vue'
import Button from '../components/Button.vue'

const router = useRouter()
const authStore = useAuthStore()

const leaderboard = ref<any[]>([])
const loading = ref(true)
const activeFilter = ref<'global' | 'friends'>('global')

async function loadLeaderboard(filter: 'global' | 'friends' = 'global') {
  activeFilter.value = filter
  loading.value = true
  try {
    const headers: Record<string, string> = {}
    if (authStore.token) {
      headers['Authorization'] = `Bearer ${authStore.token}`
    }
    const res = await fetch(`/api/leaderboard?filter=${filter}`, { headers })
    if (res.ok) {
      leaderboard.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch leaderboard', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLeaderboard('global')
})
</script>

<template>
  <div class="px-8 py-10 min-h-screen bg-background-1 text-slate-100">
    <div class="max-w-6xl mx-auto">
      
      <!-- Premium Hero Header -->
      <div class="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-r from-[#0d121f] via-[#111726] to-[#070b14] p-8 md:p-12 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 min-h-[220px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <!-- Background decorative ambient glow -->
        <div class="absolute inset-0 pointer-events-none opacity-20">
          <div class="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-primary/20 blur-3xl"></div>
          <div class="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary-light/10 blur-3xl"></div>
        </div>
        
        <!-- Text content -->
        <div class="relative z-10 flex-1">
          <h1 class="text-4xl md:text-5xl font-black tracking-[0.15em] text-white uppercase font-cinzel select-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            Classement
          </h1>
          <div class="flex items-center gap-3 mt-4 text-slate-300">
            <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Trophy class="w-4.5 h-4.5 text-primary-light" />
            </div>
            <p class="text-sm md:text-base font-semibold leading-relaxed text-slate-300">
              Les meilleurs joueurs s'affrontent pour devenir le Président.
            </p>
          </div>
        </div>
        
        <!-- Hero Image Right -->
        <div class="relative z-10 w-full md:w-[45%] h-44 flex items-center justify-end">
          <img 
            src="/images/leaderboard_banner.png" 
            alt="Président Classement" 
            class="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]" 
          />
        </div>
      </div>

      <!-- Filters & Season Info Row -->
      <div class="flex items-center justify-between flex-wrap gap-4 mb-6">
        <!-- Filters Left -->
        <div class="flex items-center gap-3 bg-[#0b0e14]/60 p-1.5 rounded-2xl border border-white/[0.04]">
          <button
            @click="loadLeaderboard('global')"
            class="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all duration-300 cursor-pointer border"
            :class="activeFilter === 'global'
              ? 'bg-gradient-to-r from-primary to-primary-light border-primary-light/20 text-white shadow-lg shadow-primary/20'
              : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'"
          >
            <Globe class="w-4.5 h-4.5" />
            Classement Global
          </button>
          <button
            @click="loadLeaderboard('friends')"
            class="px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all duration-300 cursor-pointer border"
            :class="activeFilter === 'friends'
              ? 'bg-gradient-to-r from-primary to-primary-light border-primary-light/20 text-white shadow-lg shadow-primary/20'
              : 'border-transparent bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'"
          >
            <Users class="w-4.5 h-4.5" />
            Amis
          </button>
        </div>

        <!-- Season Card Right -->
        <div class="rounded-2xl border border-white/[0.08] bg-[#111621] px-5 py-3 flex items-center gap-3 shadow-lg">
          <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Clock class="w-4.5 h-4.5 text-primary-light" />
          </div>
          <div class="flex flex-col">
            <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Saison 5</span>
            <span class="text-sm font-black text-slate-200">Se termine dans 12j 4h 23m</span>
          </div>
        </div>
      </div>

      <!-- Main Leaderboard Card -->
      <div class="rounded-3xl border border-white/[0.06] bg-background-2/95 shadow-2xl backdrop-blur-md overflow-hidden mb-8">
        
        <!-- Table Headers -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] text-xs font-bold uppercase tracking-widest text-slate-500 bg-[#0e121b]">
          <div class="w-24 text-left">Rang</div>
          <div class="flex-1 text-left">Joueur</div>
          <div class="w-24 text-right">MMR</div>
          <div class="w-36 text-right">Parties Gagnées</div>
        </div>

        <!-- Loader -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <Loader2 class="w-10 h-10 animate-spin text-primary" />
          <span class="text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">Chargement de l'arène...</span>
        </div>

        <!-- Empty State -->
        <div v-else-if="leaderboard.length === 0" class="p-16 text-center flex flex-col items-center justify-center">
          <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-slate-500">
            <Trophy class="w-8 h-8 opacity-40" />
          </div>
          <h2 class="text-xl font-bold text-slate-300">Aucun joueur trouvé</h2>
          <p class="text-sm text-slate-500 mt-2 max-w-sm leading-relaxed">
            Il n'y a actuellement aucun joueur dans cette liste. Rejoignez ou créez une partie pour être le premier à inscrire votre nom !
          </p>
          <Button variant="primary" size="md" class="mt-6" @click="router.push('/')">
            Lancer une partie
          </Button>
        </div>

        <!-- Leaderboard List -->
        <div v-else class="divide-y divide-white/[0.04]">
          <div 
            v-for="(user, index) in leaderboard" 
            :key="user.id" 
            @click="router.push(`/profile/${user.id}`)"
            class="flex items-center justify-between px-6 py-4.5 transition-all duration-200 cursor-pointer hover:bg-white/[0.02]"
            :class="[
              index === 0 ? 'bg-primary/[0.03] border-y border-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]' : ''
            ]"
          >
            <!-- Rank Column -->
            <div class="w-24 flex items-center justify-start">
              <!-- Top 3 Wreaths -->
              <div v-if="index === 0" class="relative flex items-center justify-center w-12 h-12">
                <svg class="w-11 h-11 text-amber-500 filter drop-shadow-[0_2px_4px_rgba(217,119,6,0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4.5 16.5C3.5 13 4.5 8.5 8 5.5M19.5 16.5C20.5 13 19.5 8.5 16 5.5" stroke-linecap="round" />
                  <path d="M4.2 13c0.8-.6 1.8-.6 2.5 0M19.8 13c-.8-.6-1.8-.6-2.5 0M5.2 9.5c0.8-.6 1.8-.6 2.5 0M18.8 9.5c-.8-.6-1.8-.6-2.5 0" stroke-linecap="round" />
                </svg>
                <span class="absolute text-sm font-black text-amber-500 select-none">1</span>
              </div>
              
              <div v-else-if="index === 1" class="relative flex items-center justify-center w-12 h-12">
                <svg class="w-11 h-11 text-slate-300 filter drop-shadow-[0_2px_4px_rgba(203,213,225,0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4.5 16.5C3.5 13 4.5 8.5 8 5.5M19.5 16.5C20.5 13 19.5 8.5 16 5.5" stroke-linecap="round" />
                  <path d="M4.2 13c0.8-.6 1.8-.6 2.5 0M19.8 13c-.8-.6-1.8-.6-2.5 0M5.2 9.5c0.8-.6 1.8-.6 2.5 0M18.8 9.5c-.8-.6-1.8-.6-2.5 0" stroke-linecap="round" />
                </svg>
                <span class="absolute text-sm font-black text-slate-300 select-none">2</span>
              </div>
              
              <div v-else-if="index === 2" class="relative flex items-center justify-center w-12 h-12">
                <svg class="w-11 h-11 text-amber-700 filter drop-shadow-[0_2px_4px_rgba(180,83,9,0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4.5 16.5C3.5 13 4.5 8.5 8 5.5M19.5 16.5C20.5 13 19.5 8.5 16 5.5" stroke-linecap="round" />
                  <path d="M4.2 13c0.8-.6 1.8-.6 2.5 0M19.8 13c-.8-.6-1.8-.6-2.5 0M5.2 9.5c0.8-.6 1.8-.6 2.5 0M18.8 9.5c-.8-.6-1.8-.6-2.5 0" stroke-linecap="round" />
                </svg>
                <span class="absolute text-sm font-black text-amber-700 select-none">3</span>
              </div>
              
              <!-- Regular Rank Number -->
              <div v-else class="text-sm font-bold text-slate-500 w-11 text-center select-none font-mono">
                {{ index + 1 }}
              </div>
            </div>

            <!-- Player Column -->
            <div class="flex-1 flex items-center gap-4">
              <!-- Avatar Circle with Custom Rank Border -->
              <div 
                class="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border flex items-center justify-center text-sm font-black transition-all bg-background-1 shadow-inner"
                :class="[
                  index === 0 ? 'border-amber-500 shadow-amber-500/10' :
                  index === 1 ? 'border-slate-400' :
                  index === 2 ? 'border-amber-700' :
                  'border-white/[0.08]'
                ]"
              >
                <img 
                  v-if="user.avatarUrl" 
                  :src="user.avatarUrl.startsWith('http') ? user.avatarUrl : `http://localhost:3000${user.avatarUrl}`" 
                  :alt="user.username" 
                  class="w-full h-full object-cover animate-fade-in" 
                  @error="(e: any) => e.target.style.display='none'" 
                />
                <span 
                  v-else 
                  :class="[
                    index === 0 ? 'text-amber-400' :
                    index === 1 ? 'text-slate-300' :
                    index === 2 ? 'text-amber-600' :
                    'text-slate-400'
                  ]"
                >
                  {{ (user.username || '?').slice(0, 2).toUpperCase() }}
                </span>
              </div>

              <!-- Username & Optional Crown -->
              <div class="flex items-center gap-2">
                <span class="font-bold text-base text-slate-200 hover:text-white transition-colors">
                  {{ user.username }}
                </span>
                <!-- Floating Gold Crown for #1 -->
                <Crown 
                  v-if="index === 0" 
                  class="w-4 h-4 text-amber-500 filter drop-shadow-[0_0_8px_rgba(217,119,6,0.6)] animate-pulse" 
                />
              </div>
            </div>

            <!-- MMR Column -->
            <div class="w-24 text-right">
              <span 
                class="font-mono font-black text-base md:text-lg"
                :class="index === 0 ? 'text-amber-500' : 'text-slate-300'"
              >
                {{ user.mmr }}
              </span>
            </div>

            <!-- Victories (Parties Gagnées) Column -->
            <div class="w-36 text-right">
              <span class="font-mono font-bold text-sm md:text-base text-slate-400">
                {{ user.wins ?? 0 }}
              </span>
            </div>

          </div>
        </div>

      </div>

      <!-- Footer Info Section -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Feature 1 -->
        <div class="rounded-2xl border border-white/[0.05] bg-[#0d1017]/80 p-6 flex gap-4 items-start shadow-md hover:border-white/[0.08] transition-all">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-[0_4px_12px_rgba(217,119,6,0.05)]">
            <Crown class="w-6 h-6" />
          </div>
          <div>
            <h4 class="font-bold text-slate-200 text-sm md:text-base leading-tight">Jouez, gagnez, progressez</h4>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              Gravissez les échelons et devenez le Président de la saison.
            </p>
          </div>
        </div>

        <!-- Feature 2 -->
        <div class="rounded-2xl border border-white/[0.05] bg-[#0d1017]/80 p-6 flex gap-4 items-start shadow-md hover:border-white/[0.08] transition-all">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-[0_4px_12px_rgba(217,119,6,0.05)]">
            <Award class="w-6 h-6" />
          </div>
          <div>
            <h4 class="font-bold text-slate-200 text-sm md:text-base leading-tight">Saison 5 en cours</h4>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              Se termine le 15 juillet 2024
            </p>
          </div>
        </div>

        <!-- Feature 3 -->
        <div class="rounded-2xl border border-white/[0.05] bg-[#0d1017]/80 p-6 flex gap-4 items-start shadow-md hover:border-white/[0.08] transition-all">
          <div class="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-[0_4px_12px_rgba(217,119,6,0.05)]">
            <Gift class="w-6 h-6" />
          </div>
          <div>
            <h4 class="font-bold text-slate-200 text-sm md:text-base leading-tight">Récompenses exclusives</h4>
            <p class="text-xs text-slate-400 mt-1.5 leading-relaxed font-medium">
              Des prix uniques pour les meilleurs joueurs en fin de saison.
            </p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
.font-cinzel {
  font-family: 'Cinzel', serif;
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
