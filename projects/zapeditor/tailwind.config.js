 /** @type {import('tailwindcss').Config} */
 export default {
    content: ["./src/**/*.{html,js}"],
    theme: {
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
        icon: ['"Font Awesome 7 Pro"'],
      },
      keyframes: {
        'slide-from-t-to-b': {
          '0%': { transform: 'translateY(-2%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-from-t-to-b': 'slide-from-t-to-b 0.3s ease-in-out',
      },
    },
    plugins: [],
  }