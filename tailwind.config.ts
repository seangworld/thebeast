import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        beast: {
          background: 'var(--beast-background)',
          deep: 'var(--beast-background-deep)',
          surface: 'var(--beast-surface)',
          raised: 'var(--beast-surface-raised)',
          inset: 'var(--beast-surface-inset)',
          overlay: 'var(--beast-surface-overlay)',
          border: 'var(--beast-border)',
          text: 'var(--beast-text)',
          secondary: 'var(--beast-text-secondary)',
          muted: 'var(--beast-text-muted)',
          subtle: 'var(--beast-text-subtle)',
          primary: 'var(--beast-primary)',
          accent: 'var(--beast-accent)',
          success: 'var(--beast-success)',
          warning: 'var(--beast-warning)',
          danger: 'var(--beast-danger)',
        },
      },
      borderRadius: {
        'beast-sm': 'var(--beast-radius-sm)',
        'beast-md': 'var(--beast-radius-md)',
        'beast-lg': 'var(--beast-radius-lg)',
        'beast-xl': 'var(--beast-radius-xl)',
      },
      boxShadow: {
        'beast-sm': 'var(--beast-shadow-sm)',
        'beast-md': 'var(--beast-shadow-md)',
        'beast-overlay': 'var(--beast-shadow-overlay)',
      },
      transitionDuration: {
        beast: '200ms',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
