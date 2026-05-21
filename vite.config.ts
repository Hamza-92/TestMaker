import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, type Plugin } from 'vite';

// Vite 8 runs buildStart once per environment (client + ssr).
// The wayfinder plugin uses a shared module-level context and calls
// deleteDirectory before writing, so two simultaneous PHP processes
// collide. applyToEnvironment restricts the plugin to client only.
function wayfinderClientOnly(options?: Parameters<typeof wayfinder>[0]): Plugin {
    return {
        ...(wayfinder(options) as Plugin),
        applyToEnvironment(environment: { name: string }) {
            return environment.name === 'client';
        },
    };
}

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        inertia(),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinderClientOnly(),
    ],
});
