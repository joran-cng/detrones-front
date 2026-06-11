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
    const isProd = import.meta.env.PROD || window.location.hostname !== 'localhost'
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    
    const gameServerUrl = isProd
        ? 'wss://president-game-server.onrender.com'
        : `${protocol}//${window.location.host}/colyseus`
        
    const gameApiBase = isProd
        ? 'https://president-game-server.onrender.com'
        : ''
        
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

    // Exchange phase
    const gamePendingExchanges = ref<any[]>([])
    const gameExchangeRequest = ref<{ count: number; received: any[] } | null>(null)
    const exchangeSubmitted = ref(false) // guard: prevent double-submit
    const cardPlayedAnimation = ref<{ sessionId: string; username: string; cards: any[]; timestamp: number } | null>(null)

    // Game events for cinematic overlay
    const gameEvent = ref<{ type: string; text: string; icon: string } | null>(null)


    const currentRoomId = ref<string | null>(null)
    const lobbyRooms = ref<any[]>([])
    const chatMessages = ref<any[]>([])
    const gameErrorMessage = ref<string>('')
    const systemNotifications = ref<any[]>([])
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

        // Initial REST fetch to populate rooms immediately
        await fetchRooms()
        try {
            const lobby = await client.joinOrCreate('lobby')
            lobby.onMessage('rooms', (rooms) => {
                // Only overwrite if Colyseus has real data — avoid clearing REST data
                // when Colyseus sends an empty list before metadata propagates
                if (rooms && rooms.length > 0) {
                    lobbyRooms.value = [...rooms]
                } else {
                    // Re-fetch REST so player data is always up to date
                    fetchRooms()
                }
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
            gamePendingExchanges.value = data.pendingExchanges || []

            // Fix exchange sync: clear gameExchangeRequest when server removes us from pendingExchanges
            const mySessionId = r.sessionId
            const stillPending = (data.pendingExchanges || []).some((ex: any) => ex.sessionId === mySessionId)
            if (!stillPending && gameExchangeRequest.value !== null) {
                gameExchangeRequest.value = null
                exchangeSubmitted.value = false
            }
        })

        r.onMessage('exchange_request', (data: { count: number; received: any[] }) => {
            console.log('[exchange_request]', data)
            gameExchangeRequest.value = data
            exchangeSubmitted.value = false
        })

        r.onMessage('card_played', (data: { sessionId: string; username: string; cards: any[]; timestamp: number }) => {
            cardPlayedAnimation.value = data
            // Auto-clear after animation duration
            setTimeout(() => {
                if (cardPlayedAnimation.value?.timestamp === data.timestamp) {
                    cardPlayedAnimation.value = null
                }
            }, 1200)
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
            const text: string = message.text || ''
            
            if (message.sender === "🎮 Système" || message.sender === "👑 Président") {
                const isJoinLeave = text.includes('rejoint') || text.includes('quitté') || text.includes('revenu') || text.includes('déconnecté')
                if (isJoinLeave) {
                    const id = Date.now() + Math.random().toString(36).substring(2, 9);
                    systemNotifications.value = [...systemNotifications.value, { id, ...message }];
                    setTimeout(() => {
                        systemNotifications.value = systemNotifications.value.filter((n: any) => n.id !== id);
                    }, 4500);
                }
            } else {
                chatMessages.value = [...chatMessages.value, message]
            }

            // Detect special game events for cinematic overlay
            let event: { type: string; text: string; icon: string } | null = null

            if (text.includes('carré') || text.includes('Carré')) {
                event = { type: 'quad', text: 'CARRÉ !', icon: '🔥' }
            } else if (text.includes('RÉVOLUTION') || text.includes('CONTRE-RÉVOLUTION')) {
                const isCounter = text.includes('CONTRE')
                event = { type: 'revolution', text: isCounter ? 'CONTRE-RÉVOLUTION !' : 'RÉVOLUTION !', icon: '🌪️' }
            } else if (text.includes('Président') && text.includes('premier')) {
                event = { type: 'president', text: 'PRÉSIDENT !', icon: '👑' }
            } else if (text.includes('Trou du Cul') || text.includes('TDC')) {
                event = { type: 'tdc', text: 'TROU DU CUL !', icon: '💩' }
            }

            if (event) {
                const ev = event
                setTimeout(() => {
                    gameEvent.value = ev
                    setTimeout(() => {
                        gameEvent.value = null
                    }, 2200)
                }, 600)
            }
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
        systemNotifications.value = []
        isHost.value = false
        currentRoomId.value = null
        gamePendingExchanges.value = []
        gameExchangeRequest.value = null
        exchangeSubmitted.value = false
        cardPlayedAnimation.value = null
        gameEvent.value = null
    }

    // ─── Actions ─────────────────────────────────────────────────────────────
    async function createGame(config?: any) {
        try {
            const code = generateCode()
            const r = await client.create('match', {
                username: authStore.user?.username,
                avatarUrl: authStore.user?.avatarUrl,
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
                avatarUrl: authStore.user?.avatarUrl,
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
        client, room, currentRoomId, isHost, lobbyRooms, chatMessages, gameErrorMessage, systemNotifications,
        gamePhase, gamePlayers, gameCurrentTurnPlayerId, gameCurrentTrick, gameMyHand,
        gameReversed, gameIsForcedRank, gameConfig, gameCurrentTrickType, gameActiveConsecutiveCards,
        gamePendingExchanges, gameExchangeRequest, exchangeSubmitted, cardPlayedAnimation, gameEvent,
        joinLobby, fetchRooms, createGame, joinGame, leaveGame, sendChat,
    }
})
