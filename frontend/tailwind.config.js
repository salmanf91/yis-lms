/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F89A20',
          50:  '#FEF6E8',
          100: '#FDEBD1',
          200: '#FBD6A3',
          300: '#F9C275',
          400: '#F8AD47',
          500: '#F89A20',
          600: '#D97D08',
          700: '#A85F06',
          800: '#774304',
          900: '#462802',
        },
        danger: {
          DEFAULT: '#EE2726',
          50:  '#FDE8E8',
          100: '#FAD1D1',
          500: '#EE2726',
          600: '#C41F1F',
          700: '#9A1818',
        },
        neutral: {
          DEFAULT: '#676767',
          50:  '#F5F5F5',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#BABABA',
          400: '#9A9A9A',
          500: '#676767',
          600: '#4D4D4D',
          700: '#333333',
          800: '#1A1A1A',
          900: '#0D0D0D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
