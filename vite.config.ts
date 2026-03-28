import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  
  resolve: {
    alias: { 
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    }
  },

  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk — rarely changes, cached by browser
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['framer-motion', 'lucide-react', 'sonner'],
          'vendor-charts':   ['recharts'],
          'vendor-map':      ['leaflet', 'react-leaflet'],
          'vendor-forms':    ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-utils':    ['date-fns', 'zustand'],
        }
      }
    },
    chunkSizeWarningLimit: 600,
  },

  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@supabase/supabase-js', 'framer-motion',
      'lucide-react', 'zustand', 'date-fns', 'sonner'
    ]
  },

  server: {
    port: 3000,
    hmr: { overlay: true }
  }
})
