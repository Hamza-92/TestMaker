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
        // `formVariants: true` tells wayfinder to emit the `.form()` helpers
        // that the starter-kit pages (Login, Register, Profile, etc.) rely on
        // via `<Form {...store.form()}>`. Without it, every Form-using page
        // crashes with `store.form is not a function`, which in turn brings
        // down the Vite dev server and the whole `composer run dev` process.
        //
        // `wayfinder:generate-safe` wraps wayfinder:generate with retries:
        // the vendor command deletes resources/js/actions + routes and
        // instantly recreates them, which races against editor file watchers
        // holding handles on Windows ("Permission denied" build failures).
        wayfinderClientOnly({
            formVariants: true,
            command: 'php artisan wayfinder:generate-safe',
        }),
    ],
});
