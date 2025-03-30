import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  build: {
    outDir: './public',  // Builds to client/public
    emptyOutDir: true,   // Clears folder on rebuild
    sourcemap: true      // Helps with debugging
  }
})
