/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#1b1a1e',
        paper: '#faf8f4',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(24,24,27,0.04), 0 8px 30px rgba(24,24,27,0.06)',
        ring: '0 0 0 1px rgba(24,24,27,0.06)',
      },
    },
  },
  plugins: [],
};
