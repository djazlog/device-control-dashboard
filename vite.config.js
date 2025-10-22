import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
    plugins: [
        vue()
    ],
    resolve: {
        preserveSymlinks: true,
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    server: {

    },
    define: {
        'process.env': {},
        global: 'globalThis'
    },

    esbuild: {
        define: {
            global: 'globalThis'
        }
    },
    commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
    },
    // Добавляем поддержку SPA для Vue Router
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    }
})