const semanticColors = [
    'background',
    'foreground',
    'card',
    'card-foreground',
    'popover',
    'popover-foreground',
    'primary',
    'primary-foreground',
    'secondary',
    'secondary-foreground',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'destructive',
    'destructive-foreground',
    'border',
    'input',
    'ring',
    'sidebar',
    'sidebar-foreground',
    'sidebar-primary',
    'sidebar-primary-foreground',
    'sidebar-accent',
    'sidebar-accent-foreground',
    'sidebar-border',
    'sidebar-ring',
    'chart-1',
    'chart-2',
    'chart-3',
    'chart-4',
    'chart-5',
];

module.exports = {
    darkMode: 'class',
    content: [
        './resources/views/**/*.blade.php',
        './resources/js/**/*.{js,ts,jsx,tsx}',
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
    ],
    theme: {
        extend: {
            colors: {
                ...Object.fromEntries(
                    semanticColors.map((name) => [
                        name,
                        `rgb(var(--${name}) / <alpha-value>)`,
                    ]),
                ),
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bedbff',
                    300: '#90c5ff',
                    400: '#54a2ff',
                    500: '#3080ff',
                    600: '#155dfc',
                    700: '#1447e6',
                    800: '#193cb8',
                    900: '#1c398e',
                    950: '#162456',
                },
            },
            fontFamily: {
                sans: [
                    'Montserrat',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                ],
                display: [
                    'Montserrat',
                    'ui-sans-serif',
                    'system-ui',
                    'sans-serif',
                ],
            },
            borderRadius: {
                xs: '0.125rem',
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            boxShadow: {
                xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
            },
            ringWidth: {
                DEFAULT: '1px',
            },
        },
    },
    plugins: [
        require('tailwindcss-animate'),
        ({ addUtilities }) => {
            addUtilities({
                '.outline-hidden': {
                    outline: '2px solid transparent',
                    outlineOffset: '2px',
                },
            });
        },
    ],
};
