/** @type {import('tailwindcss').Config} */
const { colors, colorGroups } = require('./theme/colors.js');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: colors.brand,
          muted: colors.brandMuted,
        },
        accent: colors.accent,
        bg: colors.bg,
        surface: colors.surface,
        border: colors.border,
        overlay: colors.overlay,
        hud: colors.hud,
        ink: colors.ink,
        muted: colors.muted,
        'on-brand': colors.onBrand,
        'on-accent': colors.onAccent,
        money: colors.money,
        danger: colors.danger,
        warn: colors.warn,
        info: colors.info,
        success: colors.success,
        group: colorGroups,
      },
      fontFamily: {
        display: ['Fraunces'],
        'display-semibold': ['Fraunces-SemiBold'],
        'display-bold': ['Fraunces-Bold'],
        sans: ['Figtree'],
        'sans-medium': ['Figtree-Medium'],
        'sans-semibold': ['Figtree-SemiBold'],
        'sans-bold': ['Figtree-Bold'],
      },
    },
  },
  plugins: [],
};
