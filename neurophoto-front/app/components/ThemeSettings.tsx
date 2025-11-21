// components/theme-settings.tsx
'use client'

import { useTheme } from '../theme-provider'
import { useState } from 'react'

export function ThemeSettings() {
  const { config, setTheme, setColorTheme, setCustomColors } = useTheme()
  
  // Локальное состояние для кастомных цветов
  const [customColors, setLocalCustomColors] = useState({
    primary: config.customColors?.primary || '#3b82f6',
    secondary: config.customColors?.secondary || '#64748b',
    accent: config.customColors?.accent || '#8b5cf6'
  })

  const handleCustomColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    const newColors = {
      ...customColors,
      [colorType]: value
    }
    setLocalCustomColors(newColors)
    
    // Сохраняем только когда все цвета заполнены
    if (newColors.primary && newColors.secondary && newColors.accent) {
      setCustomColors(newColors)
    }
  }

  const applyCustomColors = () => {
    if (customColors.primary && customColors.secondary && customColors.accent) {
      setCustomColors(customColors)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-card border rounded-lg">
      <h3 className="text-lg font-semibold">Настройки темы</h3>
      
      {/* Выбор светлой/тёмной темы */}
      <div>
        <label className="block text-sm font-medium mb-2">Тема</label>
        <select 
          value={config.theme}
          onChange={(e) => setTheme(e.target.value as any)}
          className="w-full p-2 border rounded bg-background text-foreground"
        >
          <option value="system">Системная</option>
          <option value="light">Светлая</option>
          <option value="dark">Тёмная</option>
        </select>
      </div>

      {/* Выбор цветовой схемы */}
      <div>
        <label className="block text-sm font-medium mb-2">Цветовая схема</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'default', label: 'По умолчанию', color: 'bg-gradient-to-r from-gray-500 to-gray-700' },
            { value: 'blue', label: 'Синяя', color: 'bg-gradient-to-r from-blue-500 to-blue-700' },
            { value: 'green', label: 'Зелёная', color: 'bg-gradient-to-r from-green-500 to-green-700' },
            { value: 'purple', label: 'Фиолетовая', color: 'bg-gradient-to-r from-purple-500 to-purple-700' },
          ].map(({ value, label, color }) => (
            <button
              key={value}
              onClick={() => setColorTheme(value as any)}
              className={`p-3 rounded border text-white font-medium text-sm ${
                config.colorTheme === value 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'hover:opacity-90'
              } ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Кастомные цвета */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium mb-3">Свои цвета</label>
        <div className="space-y-4">
          {([
            { type: 'primary', label: 'Основной цвет', description: 'Для кнопок и акцентных элементов' },
            { type: 'secondary', label: 'Вторичный цвет', description: 'Для фонов и второстепенных элементов' },
            { type: 'accent', label: 'Акцентный цвет', description: 'Для выделения особых элементов' },
          ] as const).map(({ type, label, description }) => (
            <div key={type} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1">
                <label className="block text-sm font-medium capitalize mb-1">{label}</label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors[type]}
                  onChange={(e) => handleCustomColorChange(type, e.target.value)}
                  className="w-12 h-12 cursor-pointer rounded border"
                />
                <input
                  type="text"
                  value={customColors[type]}
                  onChange={(e) => handleCustomColorChange(type, e.target.value)}
                  className="w-24 p-2 border rounded bg-background text-foreground text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
        
        <button
          onClick={applyCustomColors}
          disabled={!customColors.primary || !customColors.secondary || !customColors.accent}
          className="mt-4 w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Применить свои цвета
        </button>
        
        {config.colorTheme === 'custom' && (
          <p className="mt-2 text-sm text-green-600">✓ Кастомные цвета применены</p>
        )}
      </div>
    </div>
  )
}