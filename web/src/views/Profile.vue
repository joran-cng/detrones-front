<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Button from '../components/Button.vue'
import { 
  Camera, 
  Pencil, 
  UserPlus, 
  UserMinus, 
  Check, 
  X, 
  Save, 
  Palette, 
  Upload, 
  Users, 
  ChevronRight,
  Trophy,
  Diamond,
  Star,
  Sparkles,
  Leaf,
  Gamepad2,
  Clock,
  MessageSquare,
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profileUser = ref<any>(null)
const loading = ref(true)
const friends = ref<any[]>([])
const myFriendsIds = ref<string[]>([])
// Relationship state with the viewed profile
// null = no relation, 'PENDING_SENT' = I sent a request, 'PENDING_RECEIVED' = they sent me one, 'ACCEPTED' = friends
const relationshipStatus = ref<null | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED'>(null)
const relationshipRequestId = ref<string | null>(null)

// ── Edit state ─────────────────────────────────────────────────────────────
const showEditPanel = ref(false)
const editUsername = ref('')
const editLoading = ref(false)
const editError = ref('')
const editSuccess = ref('')

// ── Avatar picker ──────────────────────────────────────────────────────────
const avatarTab = ref<'defaults' | 'upload'>('defaults')
const uploadLoading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const selectedFile = ref<File | null>(null)

// DiceBear styles to offer as defaults
const DICEBEAR_STYLES = [
  { id: 'fun-emoji', label: 'Fun Emoji' },
  { id: 'bottts', label: 'Robot' },
  { id: 'lorelei', label: 'Personnage' },
  { id: 'pixel-art', label: 'Pixel Art' },
  { id: 'thumbs', label: 'Thumbs' },
  { id: 'shapes', label: 'Formes' },
]

function getDiceBearUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`
}

// Generate 3 variants per style using the username as base seed
const defaultAvatars = computed(() => {
  const seed = profileUser.value?.username || 'player'
  return DICEBEAR_STYLES.flatMap(style => [
    { url: getDiceBearUrl(style.id, seed), label: style.label },
    { url: getDiceBearUrl(style.id, seed + '2'), label: style.label + ' 2' },
  ])
})

const selectedDefaultAvatar = ref<string | null>(null)

async function applyDefaultAvatar(url: string) {
  selectedDefaultAvatar.value = url
  editError.value = ''
  editLoading.value = true
  try {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ avatarUrl: url }),
    })
    const data = await res.json()
    if (!res.ok) { editError.value = 'Erreur lors de la mise à jour.'; return }
    profileUser.value = { ...profileUser.value, avatarUrl: url }
    authStore.setAuth(authStore.token, { ...authStore.user, avatarUrl: url })
    editSuccess.value = 'Avatar mis à jour !'
    setTimeout(() => { editSuccess.value = '' }, 2000)
  } finally {
    editLoading.value = false
  }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    uploadError.value = 'Type non supporté. Utilisez JPEG, PNG, GIF ou WebP.'
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    uploadError.value = 'Fichier trop lourd (max 3 Mo).'
    return
  }
  uploadError.value = ''
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

async function uploadAvatar() {
  if (!selectedFile.value) return
  uploadLoading.value = true
  uploadError.value = ''
  try {
    const form = new FormData()
    form.append('avatar', selectedFile.value)
    const res = await fetch('/api/users/avatar', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}` },
      body: form,
    })
    const data = await res.json()
    if (!res.ok) {
      uploadError.value = data.statusMessage || 'Erreur lors de l\'upload.'
      return
    }
    const fullUrl = data.avatarUrl.startsWith('http') ? data.avatarUrl : `http://localhost:3000${data.avatarUrl}`
    profileUser.value = { ...profileUser.value, avatarUrl: data.avatarUrl }
    authStore.setAuth(authStore.token, { ...authStore.user, avatarUrl: data.avatarUrl })
    editSuccess.value = 'Photo de profil mise à jour !'
    previewUrl.value = null
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
    setTimeout(() => { editSuccess.value = '' }, 2000)
  } finally {
    uploadLoading.value = false
  }
}

function openEditPanel() {
  editUsername.value = profileUser.value?.username || ''
  editError.value = ''
  editSuccess.value = ''
  uploadError.value = ''
  previewUrl.value = null
  selectedFile.value = null
  selectedDefaultAvatar.value = null
  avatarTab.value = 'defaults'
  showEditPanel.value = true
}

async function saveUsername() {
  if (!editUsername.value.trim() || editUsername.value === profileUser.value?.username) {
    editSuccess.value = 'Aucune modification.'
    setTimeout(() => { editSuccess.value = '' }, 1500)
    return
  }
  editLoading.value = true
  editError.value = ''
  try {
    const res = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username: editUsername.value.trim() }),
    })
    const data = await res.json()
    if (!res.ok) {
      editError.value = data.statusMessage === 'Username already taken' ? 'Ce pseudo est déjà pris.' : 'Erreur.'
      return
    }
    profileUser.value = { ...profileUser.value, username: data.username }
    authStore.setAuth(authStore.token, { ...authStore.user, username: data.username })
    editSuccess.value = 'Pseudo mis à jour !'
    setTimeout(() => { editSuccess.value = '' }, 1500)
  } finally {
    editLoading.value = false
  }
}

// ── Profile & friends ──────────────────────────────────────────────────────
const isMyProfile = computed(() => {
  const targetId = route.params.id || authStore.user?.id
  return targetId === authStore.user?.id
})
const targetUserId = computed(() => route.params.id as string || authStore.user?.id)
const isFriend = computed(() => myFriendsIds.value.includes(targetUserId.value))

function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // DiceBear or absolute URLs — use as-is
  if (url.startsWith('http')) return url
  // Local upload — prepend backend base
  return `http://localhost:3000${url}`
}

async function fetchProfile() {
  if (!targetUserId.value) return
  loading.value = true
  try {
    const res = await fetch(`/api/users/${targetUserId.value}`)
    if (res.ok) profileUser.value = await res.json()
  } catch (e) { console.error(e) }
  loading.value = false
}

async function fetchFriends() {
  if (!authStore.token) return
  try {
    const headers = { 'Authorization': `Bearer ${authStore.token}` }
    const [friendsRes, receivedRes, sentRes] = await Promise.all([
      fetch('/api/friends', { headers }),
      fetch('/api/friends/requests', { headers }),
      fetch('/api/friends/sent', { headers }),
    ])

    if (friendsRes.ok) {
      const data = await friendsRes.json()
      if (isMyProfile.value) friends.value = data
      myFriendsIds.value = data.map((f: any) => f.id)
    }

    // Determine relationship status with viewed profile
    if (!isMyProfile.value && targetUserId.value) {
      relationshipStatus.value = null
      relationshipRequestId.value = null

      // Check if accepted friend
      if (myFriendsIds.value.includes(targetUserId.value)) {
        relationshipStatus.value = 'ACCEPTED'
        return
      }

      // Check sent requests
      if (sentRes.ok) {
        const sent = await sentRes.json()
        const sentToThis = sent.find((r: any) => r.to.id === targetUserId.value)
        if (sentToThis) {
          relationshipStatus.value = 'PENDING_SENT'
          relationshipRequestId.value = sentToThis.requestId
          return
        }
      }

      // Check received requests
      if (receivedRes.ok) {
        const received = await receivedRes.json()
        const fromThis = received.find((r: any) => r.from.id === targetUserId.value)
        if (fromThis) {
          relationshipStatus.value = 'PENDING_RECEIVED'
          relationshipRequestId.value = fromThis.requestId
        }
      }
    }
  } catch (e) {}
}

async function sendFriendRequest() {
  if (!authStore.token || !targetUserId.value) return
  try {
    const res = await fetch('/api/friends/add', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: targetUserId.value })
    })
    if (res.ok) await fetchFriends()
  } catch (e) {}
}

async function acceptRequest() {
  if (!authStore.token || !relationshipRequestId.value) return
  try {
    const res = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: relationshipRequestId.value })
    })
    if (res.ok) await fetchFriends()
  } catch (e) {}
}

async function cancelOrDeclineRequest() {
  if (!authStore.token || !relationshipRequestId.value) return
  try {
    const res = await fetch('/api/friends/decline', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: relationshipRequestId.value })
    })
    if (res.ok) await fetchFriends()
  } catch (e) {}
}

async function removeFriend() {
  if (!authStore.token || !targetUserId.value) return
  try {
    const res = await fetch('/api/friends/remove', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: targetUserId.value })
    })
    if (res.ok) await fetchFriends()
  } catch (e) {}
}

onMounted(() => { fetchProfile(); fetchFriends() })
watch(() => route.params.id, () => fetchProfile())

function getInitials(username: string) { return (username || '?').slice(0, 2).toUpperCase() }

function getMmrRank(mmr: number) {
  if (mmr >= 500) return { label: 'Légende', color: '#fbbf24', icon: Trophy }
  if (mmr >= 300) return { label: 'Maître', color: '#d946ef', icon: Diamond }
  if (mmr >= 150) return { label: 'Expert', color: '#3b82f6', icon: Star }
  if (mmr >= 50) return { label: 'Initié', color: '#10b981', icon: Sparkles }
  if (mmr > 0) return { label: 'Novice', color: '#64748b', icon: Leaf }
  return { label: 'Débutant', color: '#475569', icon: Gamepad2 }
}
</script>

<template>
  <div class="px-8 py-10 relative">
    <div class="w-full relative z-10">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>

      <div v-else-if="profileUser" class="space-y-6">
        <!-- Profile Header -->
        <div class="rounded-2xl p-8 relative overflow-hidden bg-background-2 border"
             style="border-color: rgba(255,255,255,0.06); backdrop-filter: blur(12px);">

          <div class="flex items-start justify-between relative gap-4 flex-wrap">
            <div class="flex items-center gap-6">
              <!-- Avatar display -->
              <div class="relative">
                <div v-if="resolveAvatarUrl(profileUser.avatarUrl)"
                  class="w-24 h-24 rounded-2xl overflow-hidden ring-2 ring-primary/30 bg-[#241e15]">
                  <img :src="resolveAvatarUrl(profileUser.avatarUrl)!" :alt="profileUser.username"
                    class="w-full h-full object-cover"
                    @error="(e: any) => { e.target.style.display='none' }" />
                </div>
                <div v-else
                  class="w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-black ring-2 ring-primary/20 bg-gradient-to-br from-primary to-primary-light text-white">
                  {{ getInitials(profileUser.username) }}
                </div>
                <!-- Camera icon for own profile -->
                <button v-if="isMyProfile" @click="openEditPanel"
                  class="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 cursor-pointer border border-primary-light/30 bg-gradient-to-br from-primary to-primary-light shadow-[0_4px_10px_rgba(155,113,52,0.3)] hover:shadow-[0_4px_12px_rgba(155,113,52,0.5)]">
                  <Camera class="w-4 h-4 text-white" />
                </button>
              </div>

              <div>
                <h1 class="text-3xl font-black text-slate-100">{{ profileUser.username }}</h1>
                <p class="text-sm mt-1 text-slate-400">
                  Membre depuis {{ new Date(profileUser.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) }}
                </p>
                <div class="flex items-center gap-2 mt-2.5">
                  <component :is="getMmrRank(profileUser.mmr).icon" class="w-4 h-4" :style="{ color: getMmrRank(profileUser.mmr).color }" />
                  <span class="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    :style="{ background: getMmrRank(profileUser.mmr).color + '15', color: getMmrRank(profileUser.mmr).color, border: `1px solid ${getMmrRank(profileUser.mmr).color}25` }">
                    {{ getMmrRank(profileUser.mmr).label }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-3.5">
              <div class="text-right">
                <div class="text-4xl font-mono font-black text-primary">{{ profileUser.mmr }}</div>
                <div class="text-[10px] font-bold uppercase tracking-widest mt-0.5 text-slate-500">Points MMR</div>
              </div>
              
              <Button v-if="isMyProfile" @click="openEditPanel"
                variant="secondary"
                size="sm"
                :icon="Pencil"
              >
                Modifier le profil
              </Button>

              <!-- No relation: send request -->
              <Button v-if="!isMyProfile && relationshipStatus === null" @click="sendFriendRequest"
                variant="secondary"
                size="sm"
                :icon="UserPlus"
              >
                Ajouter en ami
              </Button>

              <!-- I sent a pending request -->
              <Button v-if="!isMyProfile && relationshipStatus === 'PENDING_SENT'" @click="cancelOrDeclineRequest"
                variant="ghost"
                size="sm"
                :icon="Clock"
              >
                Demande envoyée
              </Button>

              <!-- They sent me a request: accept or decline -->
              <template v-if="!isMyProfile && relationshipStatus === 'PENDING_RECEIVED'">
                <Button @click="acceptRequest" variant="primary" size="sm" :icon="Check">Accepter</Button>
                <Button @click="cancelOrDeclineRequest" variant="danger" size="sm" :icon="X">Refuser</Button>
              </template>

              <!-- Already friends: chat + remove -->
              <template v-if="!isMyProfile && relationshipStatus === 'ACCEPTED'">
                <Button @click="router.push(`/conversations/${targetUserId}`)" variant="secondary" size="sm" :icon="MessageSquare">Tchater</Button>
                <Button @click="removeFriend" variant="danger" size="sm" :icon="UserMinus">Retirer</Button>
              </template>
            </div>
          </div>

          <!-- Success toast inside card -->
          <Transition name="fade-down">
            <div v-if="editSuccess"
              class="mt-4 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              style="background: rgba(16,185,129,0.1); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2);">
              <Check class="w-4 h-4 text-emerald-400" />
              {{ editSuccess }}
            </div>
          </Transition>
        </div>

        <!-- ── Edit Panel ──────────────────────────────────────────────────── -->
        <Transition name="edit-panel">
          <div v-if="showEditPanel && isMyProfile"
            class="rounded-2xl overflow-hidden bg-background-2 border"
            style="border-color: rgba(139,92,246,0.2); backdrop-filter: blur(16px);">

            <!-- Panel header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div class="flex items-center gap-2 text-primary font-bold">
                <Pencil class="w-4 h-4" />
                <span>Modifier le profil</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                @click="showEditPanel = false"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <!-- Username section -->
            <div class="px-6 py-5 border-b border-white/5">
              <label class="block text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">Pseudo</label>
              <div class="flex gap-3">
                <input v-model="editUsername" type="text" placeholder="Nouveau pseudo"
                  class="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
                  style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); color: #f1f5f9;"
                  @keyup.enter="saveUsername"
                  @focus="($event.target as HTMLElement).style.borderColor='rgba(124, 58, 237, 0.4)'"
                  @blur="($event.target as HTMLElement).style.borderColor='rgba(255,255,255,0.08)'"
                />
                <Button 
                  @click="saveUsername" 
                  :loading="editLoading"
                  variant="primary"
                  size="md"
                  :icon="Save"
                >
                  Sauvegarder
                </Button>
              </div>
              <div v-if="editError" class="mt-2 text-xs text-red-400">{{ editError }}</div>
            </div>

            <!-- Avatar section -->
            <div class="px-6 py-5">
              <label class="block text-xs font-bold uppercase tracking-wider mb-3 text-slate-500">Photo de profil</label>

              <!-- Tabs -->
              <div class="flex gap-1.5 p-1 rounded-xl mb-5" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                <Button 
                  @click="avatarTab = 'defaults'"
                  full-width
                  size="sm"
                  :variant="avatarTab === 'defaults' ? 'primary' : 'ghost'"
                  :icon="Palette"
                >
                  Avatars par défaut
                </Button>
                <Button 
                  @click="avatarTab = 'upload'"
                  full-width
                  size="sm"
                  :variant="avatarTab === 'upload' ? 'primary' : 'ghost'"
                  :icon="Camera"
                >
                  Importer une photo
                </Button>
              </div>

              <!-- Default avatars grid -->
              <div v-if="avatarTab === 'defaults'">
                <div class="grid grid-cols-6 gap-3">
                  <button v-for="avatar in defaultAvatars" :key="avatar.url"
                    @click="applyDefaultAvatar(avatar.url)"
                    class="group relative overflow-hidden transition-all hover:scale-105 cursor-pointer rounded-xl"
                    :class="profileUser.avatarUrl === avatar.url
                      ? 'ring-2 ring-primary shadow-[0_0_16px_rgba(155,113,52,0.3)]'
                      : 'shadow-[0_2px_8px_rgba(0,0,0,0.2)]'"
                    :title="avatar.label">
                    <div class="w-full aspect-square flex items-center justify-center"
                      style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
                      <img :src="avatar.url" :alt="avatar.label" class="w-12 h-12 object-contain" loading="lazy" />
                    </div>
                    <!-- Selected indicator -->
                    <div v-if="profileUser.avatarUrl === avatar.url"
                      class="absolute inset-0 flex items-center justify-center bg-primary/15">
                      <Check class="w-5 h-5 text-primary font-bold" />
                    </div>
                    <!-- Hover overlay -->
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity bg-primary/15">
                    </div>
                  </button>
                </div>
                <p class="text-[10px] font-bold text-slate-500 uppercase mt-3.5 tracking-wider">Cliquez sur un avatar pour l'appliquer immédiatement.</p>
              </div>

              <!-- File upload -->
              <div v-if="avatarTab === 'upload'" class="space-y-4">
                <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="onFileChange" />
                
                <!-- Drop zone / preview -->
                <div @click="triggerFileInput"
                  class="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:border-primary/40 hover:bg-primary/5"
                  style="border-color: rgba(255,255,255,0.1); min-height: 140px; background: rgba(255,255,255,0.01);">
                  <div v-if="previewUrl" class="flex flex-col items-center gap-3 p-4 w-full">
                    <img :src="previewUrl" alt="Aperçu" class="w-24 h-24 rounded-full object-cover ring-2 ring-primary/40 bg-[#241e15]" />
                    <span class="text-xs text-slate-400 font-semibold">{{ selectedFile?.name }}</span>
                  </div>
                  <div v-else class="flex flex-col items-center gap-2 p-6">
                    <Upload class="w-8 h-8 text-slate-400 mb-1" />
                    <span class="text-sm font-bold text-slate-300">Cliquez pour choisir une photo</span>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JPEG, PNG, GIF, WebP — max 3 Mo</span>
                  </div>
                </div>

                <div v-if="uploadError" class="text-sm p-3 rounded-xl" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2);">{{ uploadError }}</div>

                <div class="flex gap-3">
                  <Button v-if="previewUrl" @click="previewUrl = null; selectedFile = null"
                    variant="secondary"
                    size="md"
                  >
                    Annuler
                  </Button>
                  <Button v-if="selectedFile" @click="uploadAvatar" :loading="uploadLoading"
                    variant="primary"
                    size="md"
                    full-width
                    :icon="Upload"
                  >
                    Envoyer la photo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Friends List -->
        <div v-if="isMyProfile" class="rounded-2xl p-6 bg-background-2 border" style="border-color: rgba(255,255,255,0.04); backdrop-filter: blur(8px);">
          <div class="flex items-center gap-2 text-slate-200 font-bold mb-5">
            <Users class="w-5 h-5 text-primary" />
            <h2 class="text-lg">Mes Amis</h2>
            <span class="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary-light/20 font-mono">{{ friends.length }}</span>
          </div>
          <div v-if="friends.length === 0" class="text-sm py-8 text-center text-slate-500 font-semibold" style="border: 1px dashed rgba(255,255,255,0.05); border-radius: 16px;">
            Vous n'avez pas encore d'amis.
            <router-link to="/leaderboard" class="text-primary hover:underline font-bold ml-1">Voir le classement</router-link> pour en ajouter !
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="friend in friends" :key="friend.id"
                 @click="router.push(`/profile/${friend.id}`)"
                 class="rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-all group"
                 style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);">
              <div v-if="resolveAvatarUrl(friend.avatarUrl)" class="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <img :src="resolveAvatarUrl(friend.avatarUrl)!" :alt="friend.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
              </div>
              <div v-else class="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold bg-gradient-to-br from-primary/20 to-primary-light/20 text-primary-light border border-primary/15">
                {{ getInitials(friend.username) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-bold truncate group-hover:text-primary-light transition-colors text-slate-200" style="color: #f1f5f9;">{{ friend.username }}</div>
                <div class="font-mono text-xs text-slate-400" style="color: #64748b;">{{ friend.mmr }} <span class="text-[10px] text-slate-500 font-bold uppercase">MMR</span></div>
              </div>
              <ChevronRight class="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20 font-bold text-red-400">Utilisateur introuvable</div>
    </div>
  </div>
</template>

<style scoped>
.edit-panel-enter-active { animation: editIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.edit-panel-leave-active { animation: editOut 0.2s ease-in forwards; }
@keyframes editIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes editOut { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(-6px); } }

.fade-down-enter-active, .fade-down-leave-active { transition: all 0.3s ease; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>


<style scoped>
.edit-panel-enter-active { animation: editIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
.edit-panel-leave-active { animation: editOut 0.2s ease-in forwards; }
@keyframes editIn { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes editOut { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(-6px); } }

.fade-down-enter-active, .fade-down-leave-active { transition: all 0.3s ease; }
.fade-down-enter-from, .fade-down-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
