/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        bikOrange: '#FF6838',
        bikOrangeDark: '#E04A1B',
        bikDark: '#121624',
        bikBg: '#FFF9F6',
        brandGold: '#E5A93C',
        slateText: '#4E5A71',
        waGreen: '#25D366',
        waDarkGreen: '#128C7E',
        metaBlue: '#0866FF',
        igPink: '#E1306C',
        igPurple: '#C13584',
        aiViolet: '#7C3AED',
        cdpIndigo: '#4338CA',
        emeraldNeon: '#10B981',
        telcoBlue: '#0284C7'
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Outfit"', 'sans-serif'],
        outfit: ['"Outfit"', 'sans-serif'],
        tech: ['"Space Grotesk"', 'monospace'],
        mono: ['"Space Grotesk"', '"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
