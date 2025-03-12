import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/app"),
      '@library': "/src/library",
    },
  },
  plugins: [
    react(),
    // scopeTailwind({react: true})
  ],
  base: '/startup-finance/'
})
