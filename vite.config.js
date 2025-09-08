// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    host: "127.0.0.1", // or "0.0.0.0" to expose to network
    port: 5173,
    strictPort: true,   // fail if 5173 is taken
    open: true,         // auto-open browser on dev start
    cors: true          // allow API calls across origins
  },
  preview: {
    port: 5173,
    strictPort: true,
  }
})