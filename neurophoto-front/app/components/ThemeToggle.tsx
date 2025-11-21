// components/theme-toggle.tsx
'use client'

import { useTheme } from '../theme-provider'

export function ThemeToggle() {
  const { config, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(config.theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg bg-muted hover:bg-accent transition-colors"
    >
      {config.theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}