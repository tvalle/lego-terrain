import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    rollupOptions: {
      output: { manualChunks: { 'three-engine': ['three'], 'three-controls': ['three/addons/controls/OrbitControls.js'] } },
    },
  },
});
