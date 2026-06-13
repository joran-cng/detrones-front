<script setup lang="ts">
import { computed } from 'vue'
import * as Icons from '@lucide/vue'

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  shade?: 'default' | 'dark'
  icon?: string | any
  iconPosition?: 'left' | 'right'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  fullWidth?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  shade: 'default',
  iconPosition: 'left',
  loading: false,
  disabled: false,
  type: 'button',
  fullWidth: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

// Resolve the Lucide icon component if a string is provided
const resolvedIcon = computed(() => {
  if (!props.icon) return null
  if (typeof props.icon === 'string') {
    // Dynamically retrieve the component from lucide-vue-next
    return (Icons as any)[props.icon] || null
  }
  return props.icon
})

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}

// Styling classes
const classes = computed(() => {
  const base = 'inline-flex items-center justify-center font-semibold select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 relative overflow-hidden transition-all duration-300'
  
  const variants = {
    primary: props.shade === 'dark'
      ? 'bg-gradient-to-r from-primary-dark/60 to-transparent text-white border-0 hover:from-primary-dark/80 hover:to-transparent'
      : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-lg hover:shadow-primary/20 shadow-primary/10 hover:from-primary-light hover:to-primary border border-primary-light/20 active:from-primary-dark active:to-primary',
    secondary: 'bg-[#0b0e14] hover:bg-[#0f131c] text-slate-300 border border-white/[0.08] hover:border-white/[0.16] active:bg-[#080a0f]',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-red-600/20 shadow-red-600/10 hover:from-red-500 hover:to-rose-500 border border-red-500/20 active:from-red-700 active:to-rose-700',
    ghost: 'text-[#9496a8] hover:text-white hover:bg-white/[0.02] border-0'
  }
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    md: 'px-4 py-3 text-sm gap-2 rounded-xl',
    lg: 'px-6 py-3.5 text-base gap-2.5 rounded-2xl'
  }
  
  let variantClass = variants[props.variant]
  if (props.disabled) {
    variantClass = 'border border-white/[0.02] bg-[#181824]/40 text-slate-500 shadow-none pointer-events-none'
  }

  const width = props.fullWidth ? 'w-full' : ''
  const state = (props.disabled || props.loading) ? 'opacity-50 cursor-not-allowed pointer-events-none scale-100' : 'cursor-pointer active:scale-[0.98]'

  return `${base} ${variantClass} ${sizes[props.size]} ${width} ${state}`
})
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Background Shimmer effect for default primary button -->
    <span 
      v-if="variant === 'primary' && shade !== 'dark' && !disabled" 
      class="absolute w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite] pointer-events-none"
    ></span>

    <!-- Loader icon -->
    <span v-if="loading" class="animate-spin mr-1">
      <component :is="Icons.Loader2" class="w-4 h-4" />
    </span>

    <!-- Left Icon -->
    <component 
      v-else-if="resolvedIcon && iconPosition === 'left'" 
      :is="resolvedIcon" 
      :class="[size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4']"
      class="flex-shrink-0"
    />

    <!-- Button label slot -->
    <span class="relative z-10 flex items-center gap-1.5">
      <slot />
    </span>

    <!-- Right Icon -->
    <component 
      v-if="!loading && resolvedIcon && iconPosition === 'right'" 
      :is="resolvedIcon" 
      :class="[size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4']"
      class="flex-shrink-0"
    />
  </button>
</template>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
