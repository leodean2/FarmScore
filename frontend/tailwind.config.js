/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest:   '#1B4332',
        leaf:     '#2D6A4F',
        moss:     '#52B788',
        'moss-lt':'#D8F3DC',
        gold:     '#D4A017',
        'gold-lt':'#FFF3CD',
        danger:   '#B91C1C',
        'danger-lt':'#FEE2E2',
        cream:    '#F8F4EC',
        bg:       '#0D1117',
        surface:  '#161B22',
        input:    '#1C2128',
        border:   '#30363D',
      }
    }
  },
  plugins: []
}
