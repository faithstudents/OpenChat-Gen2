import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    base: '/OpenChat-Gen2/',  // replace with your actual repo name
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                login: resolve(__dirname, 'public/login.html')
            }
        }
    }
});
