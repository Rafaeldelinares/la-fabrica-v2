/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            animation: {
                'in': 'fadeIn 0.5s ease-in',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            colors: {
                slate: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    400: '#94a3b8',
                    900: '#0f172a',
                },
                blue: {
                    50: '#eff6ff',
                    600: '#2563eb',
                },
                yellow: {
                    400: '#facc15',
                }
            }
        },
    },
    plugins: [],
}
