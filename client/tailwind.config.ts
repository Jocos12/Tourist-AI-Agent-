import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS vars — supports opacity modifiers (bg-bg/50, etc.)
        bg:       'rgb(var(--color-bg)       / <alpha-value>)',
        surface:  'rgb(var(--color-surface)  / <alpha-value>)',
        surface2: 'rgb(var(--color-surface2) / <alpha-value>)',
        surface3: 'rgb(var(--color-surface3) / <alpha-value>)',
        text:     'rgb(var(--color-text)     / <alpha-value>)',
        text2:    'rgb(var(--color-text2)    / <alpha-value>)',
        text3:    'rgb(var(--color-text3)    / <alpha-value>)',
        border:   'rgb(var(--color-border)   / <alpha-value>)',
        // Fixed accent colors — same in both themes
        gold:       { DEFAULT: '#F56A00', light: '#FF8C2F', dim: '#7A3500' },
        green:      { DEFAULT: '#00C47A', dim: '#0A4A36' },
        danger:     { DEFAULT: '#FF5A57', dim: '#7A1F1D' },
        brand:      { DEFAULT: '#F56A00', dark: '#C44A00' },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"DM Mono"', 'Menlo', 'monospace'],
        sans:    ['Outfit', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        'fade-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        pulse_dot: {
          '0%, 80%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '40%':            { opacity: '1',   transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
        'fade-up':        'fade-up 0.4s ease forwards',
        pulse_dot:        'pulse_dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
