<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  modelValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  hint?: string
  id?: string
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  modelValue: '',
  required: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const inputId = computed(() => props.id || `input-${props.label.toLowerCase().replace(/\s+/g, '-')}`)
const showPassword = ref(false)
const isFocused = ref(false)

const resolvedType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <!-- Label -->
    <label
      :for="inputId"
      class="text-sm font-semibold tracking-wide select-none transition-colors duration-200"
      :class="isFocused ? 'text-slate-200' : 'text-slate-400'"
    >
      {{ label }}
      <span v-if="required" class="text-rose-500 ml-0.5">*</span>
    </label>

    <!-- Input wrapper -->
    <div class="relative">
      <input
        :id="inputId"
        :type="resolvedType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autocomplete="autocomplete"
        class="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 text-slate-100 placeholder-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
        :class="[
          type === 'password' ? 'pr-11' : '',
          error
            ? 'bg-red-500/5 border border-red-500/40 focus:border-red-400'
            : isFocused
              ? 'bg-white/[0.07] border border-[#9b7134]/60 shadow-[0_0_0_3px_rgba(155,113,52,0.12)]'
              : 'bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.14]'
        ]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />

      <!-- Toggle password visibility -->
      <button
        v-if="type === 'password'"
        type="button"
        tabindex="-1"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150 p-0.5 cursor-pointer"
        @click="showPassword = !showPassword"
      >
        <!-- Eye open -->
        <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        <!-- Eye off -->
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>
      </button>
    </div>

    <!-- Error message -->
    <p v-if="error" class="text-xs font-medium text-red-400 flex items-center gap-1 mt-0.5">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
      </svg>
      {{ error }}
    </p>

    <!-- Hint -->
    <p v-else-if="hint" class="text-xs text-slate-500 mt-0.5">{{ hint }}</p>
  </div>
</template>
