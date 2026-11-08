import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Moon, Sun } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border text-xs font-semibold transition-all hover:scale-105 active:scale-95"
      aria-label="Cambiar tema"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      <div className="flex items-center gap-2">
        {isDark ? (
          <>
            <Moon className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-300">Oscuro</span>
          </>
        ) : (
          <>
            <Sun className="w-4 h-4 text-orange-500" />
            <span className="text-slate-600">Claro</span>
          </>
        )}
      </div>
    </button>
  );
};
