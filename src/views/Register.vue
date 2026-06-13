<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppInput from '../components/Input.vue'
import Button from '../components/Button.vue'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const error = ref('')
const usernameSuggestion = ref('')

// Field-level validation
const passwordError = computed(() => {
  if (!form.value.password) return ''
  if (form.value.password.length < 6) return 'Minimum 6 caractères'
  return ''
})

const confirmError = computed(() => {
  if (!form.value.confirmPassword) return ''
  if (form.value.confirmPassword !== form.value.password) return 'Les mots de passe ne correspondent pas'
  return ''
})

const isValid = computed(() =>
  form.value.email &&
  form.value.username &&
  form.value.password.length >= 6 &&
  form.value.password === form.value.confirmPassword
)

async function handleRegister() {
  if (!isValid.value) return
  loading.value = true
  error.value = ''
  usernameSuggestion.value = ''
  try {
    const { confirmPassword, ...payload } = form.value
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok) {
      // Check for username suggestion
      if (res.status === 409 && data.data?.suggestion) {
        usernameSuggestion.value = data.data.suggestion
        error.value = `Le pseudo "${form.value.username}" est déjà pris.`
      } else {
        const msg = data.statusMessage || ''
        if (msg === 'Email already in use') {
          error.value = 'Cette adresse email est déjà utilisée.'
        } else {
          error.value = msg || 'Erreur lors de la création du compte.'
        }
      }
      return
    }
    authStore.setAuth(data.token, data.user)
    router.push('/')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function useSuggestion() {
  form.value.username = usernameSuggestion.value
  usernameSuggestion.value = ''
  error.value = ''
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden bg-background-1">
    <!-- Ambient glow -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-[0.07]"
           style="background: radial-gradient(circle, #9b7134, transparent); filter: blur(80px);"></div>
      <div class="absolute bottom-1/3 left-1/4 w-72 h-72 rounded-full opacity-[0.04]"
           style="background: radial-gradient(circle, #b8935c, transparent); filter: blur(60px);"></div>
    </div>

    <div class="w-full max-w-[420px] relative z-10">
      <!-- Logo -->
      <div class="text-center mb-8 flex flex-col items-center">
        <div class="mb-3 flex justify-center">
          <img 
            src="/logo.png" 
            alt="Président Logo" 
            class="w-14 h-auto object-contain"
          />
        </div>
        <div>
          <h1 class="font-extrabold text-3xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary-light via-primary to-primary-dark uppercase leading-none font-cinzel" style="filter: drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.45));">Président</h1>
          <div class="flex items-center justify-center gap-2.5 mt-3 w-full">
            <span class="h-[1px] w-5 bg-primary/50"></span>
            <span class="text-[9px] font-bold text-primary-light tracking-[0.25em] uppercase">Online Arena</span>
            <span class="h-[1px] w-5 bg-primary/50"></span>
          </div>
        </div>
      </div>

      <!-- Card -->
      <div class="rounded-2xl p-8 border bg-background-2/95"
           style="border-color: rgba(255, 255, 255, 0.08); backdrop-filter: blur(16px);">

        <h2 class="text-lg font-bold text-white mb-1">Créer un compte</h2>
        <p class="text-xs text-slate-500 mb-7">Rejoins la table et prouve qui est le vrai Président !</p>

        <form class="space-y-4" @submit.prevent="handleRegister">
          <AppInput
            v-model="form.email"
            label="Adresse email"
            type="email"
            placeholder="ton@email.com"
            :required="true"
            autocomplete="email"
          />

          <AppInput
            v-model="form.username"
            label="Pseudo"
            type="text"
            placeholder="TonPseudo"
            :required="true"
            hint="Visible par tous les joueurs"
            autocomplete="username"
          />

          <AppInput
            v-model="form.password"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            :required="true"
            :error="passwordError"
            hint="Minimum 6 caractères"
            autocomplete="new-password"
          />

          <AppInput
            v-model="form.confirmPassword"
            label="Confirmer le mot de passe"
            type="password"
            placeholder="••••••••"
            :required="true"
            :error="confirmError"
            autocomplete="new-password"
          />

          <!-- Error global -->
          <div v-if="error"
               class="flex items-start gap-2.5 text-sm p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
            </svg>
            {{ error }}
          </div>

          <!-- Username suggestion -->
          <div v-if="usernameSuggestion"
               class="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
            <span class="text-sm text-primary-light">
              💡 Essayez : <strong>{{ usernameSuggestion }}</strong>
            </span>
            <Button
              @click="useSuggestion"
              size="sm"
              variant="secondary"
            >
              Utiliser
            </Button>
          </div>

          <!-- Password match indicator -->
          <div v-if="form.password && form.confirmPassword && !confirmError"
               class="flex items-center gap-2 text-xs text-emerald-400 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Les mots de passe correspondent
          </div>

          <!-- Submit -->
          <Button
            type="submit"
            :loading="loading"
            :disabled="!isValid"
            variant="primary"
            full-width
            size="md"
            class="mt-2"
          >
            Créer mon compte
          </Button>
        </form>
      </div>

      <!-- Footer link -->
      <p class="text-center text-sm mt-6 text-slate-500">
        Déjà un compte ?
        <router-link to="/login" class="text-primary font-semibold hover:text-primary-light transition-colors ml-1">
          Se connecter
        </router-link>
      </p>
    </div>
  </div>
</template>
