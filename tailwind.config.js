/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}'
  ],
  presets: [require("nativewind/preset")],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#60A5FA',
        danger: '#FF4C4C',
        success: '#4ADE80',
        card: '#1E1E1E',
        surface: '#0b0b0b'
      },
      screens: {
        tablet: '768px',
        monitor: '1024px'
      }
    }
  },
  plugins: []
};
