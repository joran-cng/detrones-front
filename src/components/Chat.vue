<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useGameStore } from '../stores/game'
import Button from './Button.vue'
import Input from './Input.vue'
import { Send } from '@lucide/vue'

const gameStore = useGameStore()
const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

function sendMessage() {
  if (!messageInput.value.trim()) return
  gameStore.sendChat(messageInput.value)
  messageInput.value = ''
}

watch(() => gameStore.chatMessages.length, () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
        }
    })
})
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <div ref="messagesContainer" class="flex-1 overflow-y-auto p-3 space-y-2">
      <div v-if="gameStore.chatMessages.length === 0" class="text-center text-sm py-4" style="color: #475569;">
        Aucun message pour l'instant...
      </div>
      <div v-for="(msg, idx) in gameStore.chatMessages" :key="idx" class="text-sm">
        <span class="font-bold text-primary">{{ msg.sender }}:</span>
        <span class="ml-1" style="color: #e2e8f0;">{{ msg.text }}</span>
      </div>
    </div>

    <div class="p-3 flex gap-2 items-center" style="border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0, 0, 0, 0.1);">
      <Input
        v-model="messageInput"
        @keyup.enter="sendMessage"
        placeholder="Message..."
        class="flex-1"
      />
      <Button
        @click="sendMessage"
        variant="primary"
        size="md"
        :icon="Send"
        class="flex-shrink-0"
      />
    </div>
  </div>
</template>
