<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profileUser = ref<any>(null)
const loading = ref(true)
const friends = ref<any[]>([])
const myFriendsIds = ref<string[]>([])

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
    const res = await fetch('/api/friends', { headers: { 'Authorization': `Bearer ${authStore.token}` } })
    if (res.ok) {
      const data = await res.json()
      if (isMyProfile.value) friends.value = data
      myFriendsIds.value = data.map((f: any) => f.id)
    }
  } catch (e) {}
}

async function toggleFriend() {
  if (!authStore.token || !targetUserId.value) return
  const endpoint = isFriend.value ? '/api/friends/remove' : '/api/friends/add'
  try {
    const res = await fetch(endpoint, {
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
  if (mmr >= 500) return { label: 'Légende', color: '#fbbf24', icon: '🏆' }
  if (mmr >= 300) return { label: 'Maître', color: '#a855f7', icon: '💎' }
  if (mmr >= 150) return { label: 'Expert', color: '#3b82f6', icon: '⭐' }
  if (mmr >= 50) return { label: 'Initié', color: '#10b981', icon: '🌿' }
  if (mmr > 0) return { label: 'Novice', color: '#64748b', icon: '🌱' }
  return { label: 'Débutant', color: '#475569', icon: '🎮' }
}
</script>

<template>
  <div class="min-h-screen" style="background: linear-gradient(135deg, #0f0f1a 0%, #1a1030 100%);">
    <!-- Decorative blobs -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none opacity-30">
      <div class="absolute w-96 h-96 rounded-full" style="background: radial-gradient(circle, #7c3aed 0%, transparent 70%); top: -10%; right: -5%; filter: blur(80px);"></div>
      <div class="absolute w-72 h-72 rounded-full" style="background: radial-gradient(circle, #ec4899 0%, transparent 70%); bottom: 10%; left: -5%; filter: blur(80px);"></div>
    </div>

    <nav class="flex items-center justify-between px-8 py-4 relative z-10" style="border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(15,15,26,0.6); backdrop-filter: blur(12px);">
      <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/')">
        <span class="text-2xl">🃏</span>
        <span class="font-bold text-lg" style="color: #f1f5f9;">Président</span>
      </div>
      <button @click="router.push('/')" class="text-sm px-4 py-2 rounded-lg transition-all hover:bg-white/5" style="color: #64748b; border: 1px solid rgba(255,255,255,0.08);">← Retour</button>
    </nav>

    <div class="max-w-3xl mx-auto px-6 py-12 relative z-10">
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
      </div>

      <div v-else-if="profileUser" class="space-y-6">
        <!-- Profile Header -->
        <div class="rounded-2xl p-8 relative overflow-hidden"
             style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px);">
          <div class="absolute inset-0 opacity-10 pointer-events-none" style="background: linear-gradient(135deg, #7c3aed 0%, transparent 60%);"></div>
          <div class="flex items-start justify-between relative gap-4 flex-wrap">
            <div class="flex items-center gap-6">
              <!-- Avatar display -->
              <div class="relative">
                <div v-if="resolveAvatarUrl(profileUser.avatarUrl)"
                  class="w-24 h-24 rounded-full overflow-hidden ring-2 ring-purple-500/50 ring-offset-2"
                  style="ring-offset-color: transparent; background: #1e1b4b;">
                  <img :src="resolveAvatarUrl(profileUser.avatarUrl)!" :alt="profileUser.username"
                    class="w-full h-full object-cover"
                    @error="(e: any) => { e.target.style.display='none' }" />
                </div>
                <div v-else
                  class="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-black ring-2 ring-purple-500/30"
                  style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white;">
                  {{ getInitials(profileUser.username) }}
                </div>
                <!-- Camera icon for own profile -->
                <button v-if="isMyProfile" @click="openEditPanel"
                  class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                  style="background: linear-gradient(135deg, #7c3aed, #a855f7); box-shadow: 0 2px 8px rgba(124,58,237,0.5);">
                  <span class="text-sm">✏️</span>
                </button>
              </div>

              <div>
                <h1 class="text-3xl font-black" style="color: #f1f5f9;">{{ profileUser.username }}</h1>
                <p class="text-sm mt-1" style="color: #475569;">
                  Membre depuis {{ new Date(profileUser.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span>{{ getMmrRank(profileUser.mmr).icon }}</span>
                  <span class="text-sm font-semibold px-2.5 py-0.5 rounded-full"
                    :style="{ background: getMmrRank(profileUser.mmr).color + '22', color: getMmrRank(profileUser.mmr).color, border: `1px solid ${getMmrRank(profileUser.mmr).color}44` }">
                    {{ getMmrRank(profileUser.mmr).label }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex flex-col items-end gap-3">
              <div class="text-right">
                <div class="text-4xl font-mono font-black" style="color: #a855f7;">{{ profileUser.mmr }}</div>
                <div class="text-xs font-semibold uppercase tracking-widest mt-0.5" style="color: #64748b;">Points MMR</div>
              </div>
              <button v-if="isMyProfile" @click="openEditPanel"
                class="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                style="background: rgba(139,92,246,0.15); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.35); cursor: pointer;">
                ✏️ Modifier le profil
              </button>
              <button v-if="!isMyProfile" @click="toggleFriend"
                class="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105"
                :style="isFriend
                  ? 'background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); cursor: pointer;'
                  : 'background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.3); cursor: pointer;'">
                {{ isFriend ? '💔 Retirer' : '➕ Ajouter' }}
              </button>
            </div>
          </div>

          <!-- Success toast inside card -->
          <Transition name="fade-down">
            <div v-if="editSuccess"
              class="mt-4 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
              style="background: rgba(16,185,129,0.1); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.2);">
              ✅ {{ editSuccess }}
            </div>
          </Transition>
        </div>

        <!-- ── Edit Panel ──────────────────────────────────────────────────── -->
        <Transition name="edit-panel">
          <div v-if="showEditPanel && isMyProfile"
            class="rounded-2xl overflow-hidden"
            style="background: rgba(15,15,26,0.9); border: 1px solid rgba(139,92,246,0.3); backdrop-filter: blur(16px);">

            <!-- Panel header -->
            <div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <h2 class="text-base font-bold" style="color: #c4b5fd;">✏️ Modifier le profil</h2>
              <button @click="showEditPanel = false" class="text-slate-500 hover:text-white transition-colors cursor-pointer text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-white/10">✕</button>
            </div>

            <!-- Username section -->
            <div class="px-6 py-5" style="border-bottom: 1px solid rgba(255,255,255,0.05);">
              <label class="block text-xs font-bold uppercase tracking-wider mb-2" style="color: #64748b;">Pseudo</label>
              <div class="flex gap-3">
                <input v-model="editUsername" type="text" placeholder="Nouveau pseudo"
                  class="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #f1f5f9;"
                  @keyup.enter="saveUsername"
                />
                <button @click="saveUsername" :disabled="editLoading"
                  class="px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 flex-shrink-0"
                  style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer;"
                  :style="editLoading ? 'opacity:0.7' : ''">
                  {{ editLoading ? '...' : 'Sauvegarder' }}
                </button>
              </div>
              <div v-if="editError" class="mt-2 text-xs text-red-400">{{ editError }}</div>
            </div>

            <!-- Avatar section -->
            <div class="px-6 py-5">
              <label class="block text-xs font-bold uppercase tracking-wider mb-3" style="color: #64748b;">Photo de profil</label>

              <!-- Tabs -->
              <div class="flex gap-1 p-1 rounded-lg mb-5" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);">
                <button @click="avatarTab = 'defaults'"
                  class="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
                  :style="avatarTab === 'defaults'
                    ? 'background: rgba(139,92,246,0.3); color: #c4b5fd;'
                    : 'color: #64748b; cursor: pointer;'">
                  🎨 Avatars par défaut
                </button>
                <button @click="avatarTab = 'upload'"
                  class="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
                  :style="avatarTab === 'upload'
                    ? 'background: rgba(139,92,246,0.3); color: #c4b5fd;'
                    : 'color: #64748b; cursor: pointer;'">
                  📷 Importer une photo
                </button>
              </div>

              <!-- Default avatars grid -->
              <div v-if="avatarTab === 'defaults'">
                <div class="grid grid-cols-6 gap-3">
                  <button v-for="avatar in defaultAvatars" :key="avatar.url"
                    @click="applyDefaultAvatar(avatar.url)"
                    class="group relative rounded-xl overflow-hidden transition-all hover:scale-110 cursor-pointer"
                    :style="profileUser.avatarUrl === avatar.url
                      ? 'ring: 2px; box-shadow: 0 0 0 2px #a855f7, 0 0 16px rgba(168,85,247,0.4); border-radius: 12px;'
                      : 'box-shadow: 0 2px 8px rgba(0,0,0,0.3);'"
                    :title="avatar.label">
                    <div class="w-full aspect-square flex items-center justify-center"
                      style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);">
                      <img :src="avatar.url" :alt="avatar.label" class="w-12 h-12 object-contain" loading="lazy" />
                    </div>
                    <!-- Selected indicator -->
                    <div v-if="profileUser.avatarUrl === avatar.url"
                      class="absolute inset-0 flex items-center justify-center"
                      style="background: rgba(168,85,247,0.15);">
                      <span class="text-lg">✓</span>
                    </div>
                    <!-- Hover overlay -->
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      style="background: rgba(139,92,246,0.2);">
                    </div>
                  </button>
                </div>
                <p class="text-xs mt-3" style="color: #334155;">Cliquez sur un avatar pour l'appliquer immédiatement.</p>
              </div>

              <!-- File upload -->
              <div v-if="avatarTab === 'upload'" class="space-y-4">
                <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp" class="hidden" @change="onFileChange" />
                
                <!-- Drop zone / preview -->
                <div @click="triggerFileInput"
                  class="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:border-purple-500/60 hover:bg-purple-500/5"
                  style="border-color: rgba(255,255,255,0.12); min-height: 140px; background: rgba(255,255,255,0.02);">
                  <div v-if="previewUrl" class="flex flex-col items-center gap-3 p-4 w-full">
                    <img :src="previewUrl" alt="Aperçu" class="w-24 h-24 rounded-full object-cover ring-2 ring-purple-500/50" />
                    <span class="text-xs" style="color: #64748b;">{{ selectedFile?.name }}</span>
                  </div>
                  <div v-else class="flex flex-col items-center gap-2 p-6">
                    <span class="text-3xl">📷</span>
                    <span class="text-sm font-semibold" style="color: #94a3b8;">Cliquez pour choisir une photo</span>
                    <span class="text-xs" style="color: #475569;">JPEG, PNG, GIF, WebP — max 3 Mo</span>
                  </div>
                </div>

                <div v-if="uploadError" class="text-sm p-3 rounded-lg" style="background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2);">{{ uploadError }}</div>

                <div class="flex gap-3">
                  <button v-if="previewUrl" @click="previewUrl = null; selectedFile = null"
                    class="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style="background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;">
                    Annuler
                  </button>
                  <button v-if="selectedFile" @click="uploadAvatar" :disabled="uploadLoading"
                    class="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-[1.02]"
                    style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; cursor: pointer; box-shadow: 0 4px 15px rgba(124,58,237,0.3);"
                    :style="uploadLoading ? 'opacity:0.7' : ''">
                    {{ uploadLoading ? 'Upload en cours...' : '⬆️ Envoyer la photo' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Friends List -->
        <div v-if="isMyProfile" class="rounded-2xl p-6" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(8px);">
          <h2 class="text-lg font-bold mb-4" style="color: #f1f5f9;">👥 Mes Amis</h2>
          <div v-if="friends.length === 0" class="text-sm py-4 text-center" style="color: #475569;">
            Vous n'avez pas encore d'amis.
            <router-link to="/leaderboard" style="color: #a855f7;" class="hover:underline ml-1">Voir le classement</router-link> pour en ajouter !
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div v-for="friend in friends" :key="friend.id"
                 @click="router.push(`/profile/${friend.id}`)"
                 class="rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-all group"
                 style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);">
              <div v-if="resolveAvatarUrl(friend.avatarUrl)" class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img :src="resolveAvatarUrl(friend.avatarUrl)!" :alt="friend.username" class="w-full h-full object-cover" @error="(e: any) => e.target.style.display='none'" />
              </div>
              <div v-else class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                   style="background: linear-gradient(135deg, #7c3aed44, #a855f744); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.2);">
                {{ getInitials(friend.username) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate group-hover:text-purple-300 transition-colors" style="color: #f1f5f9;">{{ friend.username }}</div>
                <div class="font-mono text-xs" style="color: #64748b;">{{ friend.mmr }} MMR</div>
              </div>
              <span class="text-slate-600 group-hover:text-purple-400 transition-colors">→</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20" style="color: #ef4444;">Utilisateur introuvable</div>
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
