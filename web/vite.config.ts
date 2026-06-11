/// <reference types="vitest" />
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
    plugins: [vue()],
    test: {
        environment: 'happy-dom',
        globals: true,
    },
    server: {
        allowedHosts: true,
        proxy: {
            // Backend Nuxt API
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },

            // ── Colyseus game server ─────────────────────────────────────────
            // All Colyseus traffic goes through the /colyseus prefix.
            // Vite strips the prefix and forwards to the game server.
            //
            //   HTTP matchmake : /colyseus/matchmake/… → localhost:2567/matchmake/…
            //   Room WebSocket : /colyseus/<roomId>?…  → localhost:2567/<roomId>?…
            //   Local rooms    : /rooms, /roomByCode   → localhost:2567/…
            '/colyseus': {
                target: 'http://localhost:2567',
                changeOrigin: true,
                ws: true,
                rewrite: (path) => path.replace(/^\/colyseus/, ''),
            },

            // Custom REST endpoints (room list & code lookup)
            '/rooms': {
                target: 'http://localhost:2567',
                changeOrigin: true,
            },
            '/roomByCode': {
                target: 'http://localhost:2567',
                changeOrigin: true,
            },
        },
    },
})
