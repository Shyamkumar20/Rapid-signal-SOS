/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gov: {
          navy: '#1a4d8f',
          'navy-dark': '#0d2d52',
          'navy-light': '#2a6ab0',
          blue: '#0066cc',
          'blue-light': '#3399ff',
          saffron: '#ff9933',
          'saffron-dark': '#e67e22',
          green: '#138808',
          'green-dark': '#0a5d05',
          cream: '#f5f1e8',
          'cream-dark': '#e8e0d0',
          white: '#ffffff',
          gray: '#6b7280',
          'gray-light': '#f3f4f6',
          'gray-dark': '#374151',
          error: '#c81e1e',
          'error-light': '#f8d7da',
          success: '#138808',
          'success-light': '#d4edda',
          warning: '#e67e22',
          'warning-light': '#fff3cd',
        },
      },
      fontFamily: {
        serif: ['"Tiro Devanagari Sanskrit"', 'Georgia', 'serif'],
        sans: ['"Noto Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'pulse-ring-delayed': 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) 0.5s infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'blink': 'blink 1s step-end infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.7' },
          '50%': { transform: 'scale(1.1)', opacity: '0.3' },
          '100%': { transform: 'scale(0.95)', opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
