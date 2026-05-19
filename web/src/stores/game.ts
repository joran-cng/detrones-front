import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import * as Colyseus from 'colyseus.js'
import { useAuthStore } from './auth'

function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
    return code
}

const SESSION_KEY = 'game_session'

export const useGameStore = defineStore('game', () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const gameServerUrl = `${protocol}//${window.location.host}/colyseus`
    const gameApiBase = ''
    const client = new Colyseus.Client(gameServerUrl)

    const room = shallowRef<Colyseus.Room | null>(null)

    // ─── Reactive game state ─────────────────────────────────────────────────
    const gamePhase = ref('')
    const gamePlayers = ref<any[]>([])
    const gameCurrentTurnPlayerId = ref('')
    const gameCurrentTrick = ref<any[]>([])
    const gameMyHand = ref<any[]>([])

    // Extra game rules values
    const gameReversed = ref<boolean>(false)
    const gameIsForcedRank = ref<string>('')
    const gameConfig = ref<any>(null)
    const gameCurrentTrickType = ref<string>('')
    const gameActiveConsecutiveCards = ref<number>(0)

    const currentRoomId = ref<string | null>(null)
    const lobbyRooms = ref<any[]>([])
    const chatMessages = ref<any[]>([])
    const gameErrorMessage = ref<string>('')
    const isHost = ref(false)
    const authStore = useAuthStore()

    // ─── Session persistence ─────────────────────────────────────────────────
    function saveSession(r: Colyseus.Room, code: string, host: boolean) {
        const token = (r as any).reconnectionToken || (r as any).reconnection_token || ''
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            reconnectionToken: token,
            roomId: r.id,
            sessionId: r.sessionId,
            code,
            host,
        }))
        console.log('[session] saved, token:', token ? 'yes' : 'no', 'roomId:', r.id)
    }
    function clearSession() {
        localStorage.removeItem(SESSION_KEY)
    }
    function getSavedSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY)
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    }

    // ─── Lobby ───────────────────────────────────────────────────────────────
    async function fetchRooms() {
        try {
            const res = await fetch(`${gameApiBase}/rooms`)
            const rooms = await res.json()
            lobbyRooms.value = [...rooms]
            console.log('[rooms] fetched:', rooms.length, 'rooms')
        } catch (e) {
            console.error('[rooms] fetch error', e)
        }
    }

    async function findRoomByCode(code: string): Promise<string | null> {
        try {
            const res = await fetch(`${gameApiBase}/roomByCode/${code.toUpperCase()}`)
            if (!res.ok) return null
            const data = await res.json()
            return data.found ? data.roomId : null
        } catch { return null }
    }

    async function joinLobby() {
        // Try reconnection first
        const saved = getSavedSession()
        if (saved) {
            console.log('[reconnect] Attempting...', saved)
            try {
                let r: Colyseus.Room
                if (saved.reconnectionToken) {
                    r = await client.reconnect(saved.reconnectionToken)
                } else {
                    // Fallback: try joinById with same username
                    r = await client.joinById(saved.roomId, {
                        username: authStore.user?.username,
                    })
                }
                currentRoomId.value = saved.code
                isHost.value = saved.host
                setupRoomListeners(r)
                room.value = r
                saveSession(r, saved.code, saved.host)
                console.log('[reconnect] Success! Room:', r.id, 'Session:', r.sessionId)
                return
            } catch (e) {
                console.log('[reconnect] Failed:', e)
                clearSession()
            }
        }

        await fetchRooms()
        try {
            const lobby = await client.joinOrCreate('lobby')
            lobby.onMessage('rooms', (rooms) => {
                lobbyRooms.value = [...rooms]
            })
            lobby.onMessage('+', ([roomId, roomData]: [string, any]) => {
                const index = lobbyRooms.value.findIndex((r) => r.roomId === roomId)
                if (index !== -1) {
                    const updated = [...lobbyRooms.value]
                    updated[index] = roomData
                    lobbyRooms.value = updated
                } else {
                    lobbyRooms.value = [...lobbyRooms.value, roomData]
                }
            })
            lobby.onMessage('-', (roomId) => {
                lobbyRooms.value = lobbyRooms.value.filter((r) => r.roomId !== roomId)
            })
        } catch (e) {
            console.error('[lobby] error', e)
        }
    }

    // ─── Room listeners ──────────────────────────────────────────────────────
    function setupRoomListeners(r: Colyseus.Room) {
        r.onMessage('state_update', (data: any) => {
            console.log('[state_update]', data.phase, 'players:', data.players?.length, 'turn:', data.currentTurnPlayerId)
            gamePhase.value = data.phase || ''
            gameCurrentTurnPlayerId.value = data.currentTurnPlayerId || ''
            gameCurrentTrick.value = data.currentTrick || []
            gamePlayers.value = (data.players || []).map((p: any) => ({
                ...p,
                isMe: p.sessionId === r.sessionId,
            }))
            gameReversed.value = !!data.reversed
            gameIsForcedRank.value = data.isForcedRank || ''
            gameCurrentTrickType.value = data.currentTrickType || ''
            gameActiveConsecutiveCards.value = data.activeConsecutiveCards || 0
            if (data.config) gameConfig.value = data.config
            if (data.code) currentRoomId.value = data.code
        })

        r.onMessage('my_hand', (hand: any[]) => {
            console.log('[my_hand]', hand.length, 'cards')
            gameMyHand.value = hand
        })

        r.onMessage('error', (err: any) => {
            console.error('[game error]', err)
            gameErrorMessage.value = err.message
            setTimeout(() => {
                if (gameErrorMessage.value === err.message) {
                    gameErrorMessage.value = ''
                }
            }, 4000)
        })

        r.onMessage('chat_message', (message) => {
            chatMessages.value = [...chatMessages.value, message]
        })

        r.onLeave((code) => {
            console.log('[room] Left, code:', code)
            if (code === 1000) {
                // Consented leave — clean up
                clearSession()
                resetState()
            }
            // Abnormal close (1006) — session stays saved for reconnection
        })
    }

    function resetState() {
        room.value = null
        gamePhase.value = ''
        gamePlayers.value = []
        gameMyHand.value = []
        gameCurrentTrick.value = []
        gameCurrentTurnPlayerId.value = ''
        gameReversed.value = false
        gameIsForcedRank.value = ''
        gameCurrentTrickType.value = ''
        gameActiveConsecutiveCards.value = 0
        gameConfig.value = null
        chatMessages.value = []
        isHost.value = false
        currentRoomId.value = null
    }

    // ─── Actions ─────────────────────────────────────────────────────────────
    async function createGame(config?: any) {
        try {
            const code = generateCode()
            const r = await client.create('match', {
                username: authStore.user?.username,
                code,
                config,
            })
            currentRoomId.value = code
            isHost.value = true
            setupRoomListeners(r)
            room.value = r
            saveSession(r, code, true)
            console.log('[game] Created room', r.id, 'code:', code)
        } catch (e) {
            console.error('[game] Create error', e)
        }
    }

    async function joinGame(input: string) {
        try {
            let realRoomId = input
            if (input.length === 4) {
                const found = await findRoomByCode(input)
                if (found) {
                    realRoomId = found
                } else {
                    const inLobby = lobbyRooms.value.find(
                        (r) => (r.metadata as any)?.code === input.toUpperCase() || (r as any).code === input.toUpperCase()
                    )
                    if (inLobby) realRoomId = inLobby.roomId
                }
            }

            const r = await client.joinById(realRoomId, {
                username: authStore.user?.username,
            })
            currentRoomId.value = input
            isHost.value = false
            setupRoomListeners(r)
            room.value = r
            saveSession(r, input, false)
            console.log('[game] Joined room', r.id)
        } catch (e) {
            console.error('[game] Join error', e)
        }
    }

    function sendChat(text: string) {
        room.value?.send('chat_message', { text })
    }

    function leaveGame() {
        if (room.value) {
            room.value.leave(true)
            clearSession()
            resetState()
        }
    }

    return {
        client, room, currentRoomId, isHost, lobbyRooms, chatMessages, gameErrorMessage,
        gamePhase, gamePlayers, gameCurrentTurnPlayerId, gameCurrentTrick, gameMyHand,
        gameReversed, gameIsForcedRank, gameConfig, gameCurrentTrickType, gameActiveConsecutiveCards,
        joinLobby, fetchRooms, createGame, joinGame, leaveGame, sendChat,
    }
})
