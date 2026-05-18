import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig, type Plugin } from 'vite';

// Vite 8 runs buildStart once per environment (client + ssr).
// The wayfinder plugin uses a shared module-level context and calls
// deleteDirectory before writing, so two simultaneous PHP processes
// collide. Wrapping it to only run in the client environment fixes this.
function wayfinderClientOnly(options?: Parameters<typeof wayfinder>[0]): Plugin {
    const plugin = wayfinder(options) as Plugin & { buildStart?: (...args: unknown[]) => unknown };
    return {
        ...plugin,
        buildStart(this: { environment?: { name: string } }, ...args: unknown[]) {
            if (this.environment?.name !== 'client') return;
            return plugin.buildStart?.call(this, ...args);
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
