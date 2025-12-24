import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split AWS Amplify into separate chunk
          'aws-amplify': ['aws-amplify', '@aws-amplify/ui-react'],
          // Split React into separate chunk
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit to 1000 KB for AWS Amplify
  },
})
