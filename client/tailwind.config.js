/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
        "./node_modules/react-tailwindcss-datepicker/dist/index.mjs",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    blue: '#0284c7',
                    teal: '#0ea5e9',
                    green: '#10b981',
                    orange: '#f59e0b',
                    deep: '#0f172a',
                },
                primary: {
                    DEFAULT: '#0ea5e9',
                    hover: '#0284c7',
                },
                secondary: '#10b981',
                accent: '#f59e0b',
                background: '#0f172a',
                surface: '#1e293b',
                'surface-hover': '#334155',
                danger: '#ef4444',
                warning: '#f59e0b',
            }
        },
    },
    plugins: [],
}
