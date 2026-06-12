// vite.config.ts
import { defineConfig } from "file:///C:/Users/caune/OneDrive/Documents/detrones/front/node_modules/.pnpm/vite@5.4.21_@types+node@25.9.3/node_modules/vite/dist/node/index.js";
import { configDefaults } from "file:///C:/Users/caune/OneDrive/Documents/detrones/front/node_modules/.pnpm/vitest@2.1.9_@types+node@25.9.3_happy-dom@20.10.2/node_modules/vitest/dist/config.js";
import vue from "file:///C:/Users/caune/OneDrive/Documents/detrones/front/node_modules/.pnpm/@vitejs+plugin-vue@5.2.4_vite@5.4.21_@types+node@25.9.3__vue@3.5.29_typescript@5.9.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    globals: true,
    exclude: [...configDefaults.exclude, "**/e2e/**"]
  },
  server: {
    allowedHosts: true,
    proxy: {
      // Backend Nuxt API
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      // ── Colyseus game server ─────────────────────────────────────────
      // All Colyseus traffic goes through the /colyseus prefix.
      // Vite strips the prefix and forwards to the game server.
      //
      //   HTTP matchmake : /colyseus/matchmake/… → localhost:2567/matchmake/…
      //   Room WebSocket : /colyseus/<roomId>?…  → localhost:2567/<roomId>?…
      //   Local rooms    : /rooms, /roomByCode   → localhost:2567/…
      "/colyseus": {
        target: "http://localhost:2567",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/colyseus/, "")
      },
      // Custom REST endpoints (room list & code lookup)
      "/rooms": {
        target: "http://localhost:2567",
        changeOrigin: true
      },
      "/roomByCode": {
        target: "http://localhost:2567",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjYXVuZVxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcZGV0cm9uZXNcXFxcZnJvbnRcXFxcd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxjYXVuZVxcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcZGV0cm9uZXNcXFxcZnJvbnRcXFxcd2ViXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9jYXVuZS9PbmVEcml2ZS9Eb2N1bWVudHMvZGV0cm9uZXMvZnJvbnQvd2ViL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9XCJ2aXRlc3RcIiAvPlxyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xyXG5pbXBvcnQgeyBjb25maWdEZWZhdWx0cyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXHJcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAgIHBsdWdpbnM6IFt2dWUoKV0sXHJcbiAgICB0ZXN0OiB7XHJcbiAgICAgICAgZW52aXJvbm1lbnQ6ICdoYXBweS1kb20nLFxyXG4gICAgICAgIGdsb2JhbHM6IHRydWUsXHJcbiAgICAgICAgZXhjbHVkZTogWy4uLmNvbmZpZ0RlZmF1bHRzLmV4Y2x1ZGUsICcqKi9lMmUvKionXSxcclxuICAgIH0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgICBhbGxvd2VkSG9zdHM6IHRydWUsXHJcbiAgICAgICAgcHJveHk6IHtcclxuICAgICAgICAgICAgLy8gQmFja2VuZCBOdXh0IEFQSVxyXG4gICAgICAgICAgICAnL2FwaSc6IHtcclxuICAgICAgICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvLyBcdTI1MDBcdTI1MDAgQ29seXNldXMgZ2FtZSBzZXJ2ZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHJcbiAgICAgICAgICAgIC8vIEFsbCBDb2x5c2V1cyB0cmFmZmljIGdvZXMgdGhyb3VnaCB0aGUgL2NvbHlzZXVzIHByZWZpeC5cclxuICAgICAgICAgICAgLy8gVml0ZSBzdHJpcHMgdGhlIHByZWZpeCBhbmQgZm9yd2FyZHMgdG8gdGhlIGdhbWUgc2VydmVyLlxyXG4gICAgICAgICAgICAvL1xyXG4gICAgICAgICAgICAvLyAgIEhUVFAgbWF0Y2htYWtlIDogL2NvbHlzZXVzL21hdGNobWFrZS9cdTIwMjYgXHUyMTkyIGxvY2FsaG9zdDoyNTY3L21hdGNobWFrZS9cdTIwMjZcclxuICAgICAgICAgICAgLy8gICBSb29tIFdlYlNvY2tldCA6IC9jb2x5c2V1cy88cm9vbUlkPj9cdTIwMjYgIFx1MjE5MiBsb2NhbGhvc3Q6MjU2Ny88cm9vbUlkPj9cdTIwMjZcclxuICAgICAgICAgICAgLy8gICBMb2NhbCByb29tcyAgICA6IC9yb29tcywgL3Jvb21CeUNvZGUgICBcdTIxOTIgbG9jYWxob3N0OjI1NjcvXHUyMDI2XHJcbiAgICAgICAgICAgICcvY29seXNldXMnOiB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjI1NjcnLFxyXG4gICAgICAgICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgd3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvY29seXNldXMvLCAnJyksXHJcbiAgICAgICAgICAgIH0sXHJcblxyXG4gICAgICAgICAgICAvLyBDdXN0b20gUkVTVCBlbmRwb2ludHMgKHJvb20gbGlzdCAmIGNvZGUgbG9va3VwKVxyXG4gICAgICAgICAgICAnL3Jvb21zJzoge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDoyNTY3JyxcclxuICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJy9yb29tQnlDb2RlJzoge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDoyNTY3JyxcclxuICAgICAgICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgfSxcclxufSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLFNBQVMsc0JBQXNCO0FBQy9CLE9BQU8sU0FBUztBQUVoQixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUN4QixTQUFTLENBQUMsSUFBSSxDQUFDO0FBQUEsRUFDZixNQUFNO0FBQUEsSUFDRixhQUFhO0FBQUEsSUFDYixTQUFTO0FBQUEsSUFDVCxTQUFTLENBQUMsR0FBRyxlQUFlLFNBQVMsV0FBVztBQUFBLEVBQ3BEO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDSixjQUFjO0FBQUEsSUFDZCxPQUFPO0FBQUE7QUFBQSxNQUVILFFBQVE7QUFBQSxRQUNKLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNsQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFTQSxhQUFhO0FBQUEsUUFDVCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsUUFDZCxJQUFJO0FBQUEsUUFDSixTQUFTLENBQUMsU0FBUyxLQUFLLFFBQVEsZUFBZSxFQUFFO0FBQUEsTUFDckQ7QUFBQTtBQUFBLE1BR0EsVUFBVTtBQUFBLFFBQ04sUUFBUTtBQUFBLFFBQ1IsY0FBYztBQUFBLE1BQ2xCO0FBQUEsTUFDQSxlQUFlO0FBQUEsUUFDWCxRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDbEI7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
