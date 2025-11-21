// app/theme-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'
type ColorTheme = 'default' | 'blue' | 'green' | 'purple' | 'custom'

interface ThemeConfig {
  theme: Theme
  colorTheme: ColorTheme
  customColors?: {
    primary: string
    secondary: string
    accent: string
  }
}

interface ThemeContextType {
  config: ThemeConfig
  setTheme: (theme: Theme) => void
  setColorTheme: (colorTheme: ColorTheme) => void
  setCustomColors: (colors: { primary: string; secondary: string; accent: string }) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorTheme = 'default'
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultColorTheme?: ColorTheme
}) {
  const [config, setConfig] = useState<ThemeConfig>({
    theme: defaultTheme,
    colorTheme: defaultColorTheme,
  })

  // Загрузка темы из localStorage при монтировании
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedColorTheme = localStorage.getItem('colorTheme') as ColorTheme
    const savedCustomColors = localStorage.getItem('customColors')
    
    if (savedTheme) {
      setConfig(prev => ({ ...prev, theme: savedTheme }))
    }
    
    if (savedColorTheme) {
      setConfig(prev => ({ ...prev, colorTheme: savedColorTheme }))
    }
    
    if (savedCustomColors) {
      try {
        const customColors = JSON.parse(savedCustomColors)
        setConfig(prev => ({ ...prev, customColors }))
        applyCustomColors(customColors)
      } catch (error) {
        console.error('Error parsing custom colors:', error)
      }
    }
  }, [])

  // Применение темы
  useEffect(() => {
    const root = window.document.documentElement
    
    // Удаляем предыдущие классы тем
    root.classList.remove('light', 'dark')
    
    // Удаляем предыдущие цветовые темы
    root.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-custom')

    let effectiveTheme = config.theme
    
    if (config.theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    root.classList.add(effectiveTheme)
    
    // Применяем цветовую тему
    if (config.colorTheme !== 'default' && config.colorTheme !== 'custom') {
      root.classList.add(`theme-${config.colorTheme}`)
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('theme', config.theme)
    localStorage.setItem('colorTheme', config.colorTheme)
  }, [config.theme, config.colorTheme])

  // Функция для применения кастомных цветов
  const applyCustomColors = (colors: { primary: string; secondary: string; accent: string }) => {
    const root = document.documentElement
    root.style.setProperty('--primary', colors.primary)
    root.style.setProperty('--secondary', colors.secondary)
    root.style.setProperty('--accent', colors.accent)
  }

  const setTheme = (theme: Theme) => {
    setConfig(prev => ({ ...prev, theme }))
  }

  const setColorTheme = (colorTheme: ColorTheme) => {
    setConfig(prev => ({ ...prev, colorTheme }))
    
    // Если переключаемся с кастомной темы, убираем кастомные цвета
    if (colorTheme !== 'custom') {
      const root = document.documentElement
      root.style.removeProperty('--primary')
      root.style.removeProperty('--secondary')
      root.style.removeProperty('--accent')
      localStorage.removeItem('customColors')
    }
  }

  const setCustomColors = (colors: { primary: string; secondary: string; accent: string }) => {
    setConfig(prev => ({ ...prev, customColors: colors, colorTheme: 'custom' }))
    applyCustomColors(colors)
    localStorage.setItem('customColors', JSON.stringify(colors))
    localStorage.setItem('colorTheme', 'custom')
  }

  return (
    <ThemeContext.Provider value={{ config, setTheme, setColorTheme, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}