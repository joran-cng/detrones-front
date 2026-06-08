<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import {
  Globe,
  Users,
  Clock,
  Trophy,
  Loader2,
  Sword,
  Crown,
  Star,
  Zap,
  Shield,
  Award
} from '@lucide/vue'

const router = useRouter()
const authStore = useAuthStore()

type FilterType = 'global' | 'friends'
const activeFilter = ref<FilterType>('global')
const leaderboard = ref<any[]>([])
const loading = ref(true)

// Timer for season countdown
const timeLeft = ref({ days: 22, hours: 4, minutes: 37 })
let timerInterval: ReturnType<typeof setInterval> | null = null

function startTimer() {
  // Set a fixed end date: Saison X ends in ~22 days from a reference point
  // For display purposes, count down from a fixed future date
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 22)
  endDate.setHours(endDate.getHours() + 4)
  endDate.setMinutes(endDate.getMinutes() + 37)

  const target = endDate.getTime()

  timerInterval = setInterval(() => {
    const now = Date.now()
    const diff = target - now
    if (diff <= 0) {
      timeLeft.value = { days: 0, hours: 0, minutes: 0 }
      if (timerInterval) clearInterval(timerInterval)
      return
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    timeLeft.value = { days, hours, minutes }
  }, 1000)
}

async function fetchLeaderboard() {
  loading.value = true
  try {
    const headers: Record<string, string> = {}
    let url = '/api/leaderboard'

    if (activeFilter.value === 'friends' && authStore.token) {
      url += '?filter=friends'
      headers['Authorization'] = `Bearer ${authStore.token}`
    }

    const res = await fetch(url, { headers })
    if (res.ok) {
      leaderboard.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to fetch leaderboard', e)
  } finally {
    loading.value = false
  }
}

function setFilter(filter: FilterType) {
  activeFilter.value = filter
  fetchLeaderboard()
}

function getInitials(username: string) {
  return (username || '?').slice(0, 2).toUpperCase()
}

function getAvatarUrl(url: string) {
  if (!url) return ''
  return url.startsWith('http') ? url : `http://localhost:3000${url}`
}

// Rank badge images
function getRankImage(index: number) {
  if (index === 0) return '/rank1.png'
  if (index === 1) return '/rank2.png'
  if (index === 2) return '/rank3.png'
  return ''
}

// Top 3 styling
function getRankBorderColor(index: number) {
  if (index === 0) return 'rgba(251, 191, 36, 0.5)'
  if (index === 1) return 'rgba(148, 163, 184, 0.4)'
  if (index === 2) return 'rgba(180, 83, 9, 0.4)'
  return 'rgba(255,255,255,0.06)'
}

function getRankBg(index: number) {
  if (index === 0) return 'linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(251,191,36,0.04) 100%)'
  if (index === 1) return 'linear-gradient(135deg, rgba(148,163,184,0.10) 0%, rgba(148,163,184,0.03) 100%)'
  if (index === 2) return 'linear-gradient(135deg, rgba(180,83,9,0.10) 0%, rgba(180,83,9,0.03) 100%)'
  return 'rgba(255,255,255,0.02)'
}

function getMmrColor(index: number) {
  if (index === 0) return '#fbbf24'
  if (index === 1) return '#94a3b8'
  if (index === 2) return '#b45309'
  return '#9b7134'
}

const top3 = computed(() => leaderboard.value.slice(0, 3))
const rest = computed(() => leaderboard.value.slice(3))

onMounted(() => {
  fetchLeaderboard()
  startTimer()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <div class="min-h-screen leaderboard-page" style="background: #070c15;">

    <!-- ═══════════════════ HERO BANNER ═══════════════════ -->
    <div class="hero-banner relative overflow-hidden" style="border-radius: 16px; margin: 20px 20px 0; min-height: 160px;">
      <!-- Background image -->
      <img
        src="/leaderboard_hero.png"
        alt="Leaderboard Hero"
        class="absolute inset-0 w-full h-full object-cover"
        style="object-position: center;"
      />
      <!-- Dark overlay -->
      <div class="absolute inset-0" style="background: linear-gradient(90deg, rgba(7,12,21,0.92) 0%, rgba(7,12,21,0.75) 50%, rgba(7,12,21,0.3) 100%);"></div>
      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center px-8 py-7 h-full" style="min-height: 160px;">
        <div class="flex items-center gap-2 mb-2">
          <Trophy class="w-5 h-5" style="color: #fbbf24;" />
          <span class="text-xs font-bold tracking-widest uppercase" style="color: #9b7134;">Les meilleurs joueurs s'affrontent pour devenir le Président.</span>
        </div>
        <h1 class="font-black tracking-widest uppercase" style="font-size: 2.2rem; color: #f1f5f9; font-family: 'Cinzel', serif; text-shadow: 0 2px 16px rgba(0,0,0,0.7);">CLASSEMENT</h1>
      </div>
    </div>

    <!-- ═══════════════════ FILTERS + SEASON ═══════════════════ -->
    <div class="flex items-center justify-between px-5 py-4" style="gap: 12px;">
      <!-- Filter Buttons -->
      <div class="flex gap-2">
        <!-- Classement Global -->
        <button
          @click="setFilter('global')"
          class="filter-btn flex items-center gap-2"
          :class="activeFilter === 'global' ? 'filter-btn--active' : 'filter-btn--inactive'"
        >
          <Globe class="w-4 h-4" />
          <span>Classement Global</span>
        </button>

        <!-- Amis -->
        <button
          @click="setFilter('friends')"
          class="filter-btn flex items-center gap-2"
          :class="activeFilter === 'friends' ? 'filter-btn--active' : 'filter-btn--inactive'"
        >
          <Users class="w-4 h-4" />
          <span>Amis</span>
        </button>
      </div>

      <!-- Season Info -->
      <div class="season-badge flex items-center gap-3 px-4 py-2.5 rounded-xl" style="background: rgba(20,15,5,0.8); border: 1px solid rgba(155,113,52,0.3); backdrop-filter: blur(8px);">
        <Clock class="w-4 h-4 flex-shrink-0" style="color: #fbbf24;" />
        <div class="text-right">
          <div class="text-xs font-black tracking-wider" style="color: #fbbf24;">Saison X</div>
          <div class="text-xs" style="color: #94a3b8;">
            Se termine dans {{ timeLeft.days }}j {{ timeLeft.hours }}h {{ String(timeLeft.minutes).padStart(2, '0') }}min
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════ LEADERBOARD TABLE ═══════════════════ -->
    <div class="px-5 pb-5">
      <div class="leaderboard-table rounded-2xl overflow-hidden" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);">

        <!-- Loading -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 class="w-8 h-8 animate-spin" style="color: #9b7134;" />
          <span class="text-xs font-bold uppercase tracking-widest" style="color: #64748b;">Chargement...</span>
        </div>

        <!-- Empty -->
        <div v-else-if="leaderboard.length === 0" class="flex flex-col items-center justify-center py-16 gap-3">
          <Trophy class="w-12 h-12 opacity-20" style="color: #9b7134;" />
          <p class="text-sm" style="color: #64748b;">Aucun joueur dans ce classement.</p>
        </div>

        <template v-else>
          <!-- Table Header -->
          <div class="table-header grid items-center px-6 py-3" style="grid-template-columns: 80px 1fr 140px 160px; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <span class="text-xs font-bold uppercase tracking-widest" style="color: #4b5563;">RANG</span>
            <span class="text-xs font-bold uppercase tracking-widest" style="color: #4b5563;">JOUEUR</span>
            <span class="text-xs font-bold uppercase tracking-widest text-right" style="color: #4b5563;">MMR</span>
            <span class="text-xs font-bold uppercase tracking-widest text-right pr-2" style="color: #4b5563;">PARTIES GAGNÉES</span>
          </div>

          <!-- Top 3 rows -->
          <div
            v-for="(user, index) in top3"
            :key="user.id"
            @click="router.push(`/profile/${user.id}`)"
            class="leaderboard-row grid items-center px-6 py-3 cursor-pointer transition-all"
            :style="{
              gridTemplateColumns: '80px 1fr 140px 160px',
              background: getRankBg(index),
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }"
          >
            <!-- Rank badge -->
            <div class="flex items-center justify-center w-12 h-12">
              <img :src="getRankImage(index)" :alt="`Rang ${index + 1}`" class="w-12 h-12 object-contain" />
            </div>

            <!-- Player -->
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div
                class="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black border-2"
                :style="{
                  borderColor: index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : '#b45309',
                  background: user.avatarUrl ? 'transparent' : `linear-gradient(135deg, rgba(155,113,52,0.3), rgba(184,147,92,0.15))`
                }"
              >
                <img v-if="user.avatarUrl" :src="getAvatarUrl(user.avatarUrl)" :alt="user.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                <span v-else style="color: #b8935c;">{{ getInitials(user.username) }}</span>
              </div>
              <!-- Name + crown for #1 -->
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-sm" style="color: #f1f5f9;">{{ user.username }}</span>
                  <Crown v-if="index === 0" class="w-4 h-4" style="color: #fbbf24;" />
                </div>
              </div>
            </div>

            <!-- MMR -->
            <div class="text-right font-black text-lg font-mono" :style="{ color: getMmrColor(index) }">
              {{ user.mmr }}
            </div>

            <!-- Wins -->
            <div class="text-right pr-2 font-bold text-sm" style="color: #94a3b8;">
              {{ user.winsCount ?? 0 }}
            </div>
          </div>

          <!-- Rows 4+ -->
          <div
            v-for="(user, i) in rest"
            :key="user.id"
            @click="router.push(`/profile/${user.id}`)"
            class="leaderboard-row grid items-center px-6 py-3.5 cursor-pointer transition-all"
            :style="{
              gridTemplateColumns: '80px 1fr 140px 160px',
              borderBottom: i < rest.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }"
          >
            <!-- Rank number -->
            <div class="flex items-center justify-center">
              <span class="text-base font-black" style="color: #4b5563;">{{ i + 4 }}</span>
            </div>

            <!-- Player -->
            <div class="flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-black border"
                style="border-color: rgba(255,255,255,0.1); background: linear-gradient(135deg, rgba(155,113,52,0.15), rgba(184,147,92,0.08));"
              >
                <img v-if="user.avatarUrl" :src="getAvatarUrl(user.avatarUrl)" :alt="user.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
                <span v-else style="color: #9b7134;">{{ getInitials(user.username) }}</span>
              </div>
              <span class="font-semibold text-sm" style="color: #cbd5e1;">{{ user.username }}</span>
            </div>

            <!-- MMR -->
            <div class="text-right font-bold text-sm font-mono" style="color: #64748b;">
              {{ user.mmr }}
            </div>

            <!-- Wins -->
            <div class="text-right pr-2 font-bold text-sm" style="color: #4b5563;">
              {{ user.winsCount ?? 0 }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ═══════════════════ FOOTER ═══════════════════ -->
    <div class="footer-section mx-5 mb-5 rounded-2xl px-6 py-5" style="background: rgba(155,113,52,0.06); border: 1px solid rgba(155,113,52,0.15);">
      <div class="grid grid-cols-3 gap-6">
        <!-- Item 1 -->
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.2);">
            <Crown class="w-5 h-5" style="color: #fbbf24;" />
          </div>
          <div>
            <p class="font-black text-sm" style="color: #fbbf24;">Jouez, gagnez, progressez</p>
            <p class="text-xs mt-1 leading-relaxed" style="color: #64748b;">Gravissez les échelons et devenez le Président de la saison.</p>
          </div>
        </div>

        <!-- Item 2 -->
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(155,113,52,0.12); border: 1px solid rgba(155,113,52,0.2);">
            <Star class="w-5 h-5" style="color: #9b7134;" />
          </div>
          <div>
            <p class="font-black text-sm" style="color: #f59e0b;">Saison X en cours</p>
            <p class="text-xs mt-1 leading-relaxed" style="color: #64748b;">Se termine dans {{ timeLeft.days }}j {{ timeLeft.hours }}h {{ String(timeLeft.minutes).padStart(2, '0') }}min</p>
          </div>
        </div>

        <!-- Item 3 -->
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(155,113,52,0.12); border: 1px solid rgba(155,113,52,0.2);">
            <Award class="w-5 h-5" style="color: #9b7134;" />
          </div>
          <div>
            <p class="font-black text-sm" style="color: #f1f5f9;">Récompenses exclusives</p>
            <p class="text-xs mt-1 leading-relaxed" style="color: #64748b;">Des prix uniques pour les meilleurs joueurs en fin de saison.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.leaderboard-page {
  min-height: 100vh;
}

/* Filter buttons */
.filter-btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  white-space: nowrap;
}

.filter-btn--active {
  background: rgba(155, 113, 52, 0.18);
  border-color: rgba(155, 113, 52, 0.6);
  color: #fbbf24;
}

.filter-btn--inactive {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
  color: #64748b;
}

.filter-btn--inactive:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border-color: rgba(255, 255, 255, 0.12);
}

/* Row hover */
.leaderboard-row:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

/* Hero banner */
.hero-banner {
  border: 1px solid rgba(155, 113, 52, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}
</style>
