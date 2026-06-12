// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      // In local dev, proxy all /api requests to your Railway backend
      // This avoids CORS entirely — the browser thinks it's calling localhost
      '/api': {
        target: 'https://sendarc-backend-production.up.railway.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})