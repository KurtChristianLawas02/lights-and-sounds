/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#071a33',
        ink: '#0b2447'
      },
      boxShadow: {
        glow: '0 20px 60px rgba(0, 212, 255, 0.22)'
      }
    }
  },
  plugins: []
};
