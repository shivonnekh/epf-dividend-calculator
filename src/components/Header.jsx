import { Moon, Sun, TrendingUp, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Header() {
  const {
    darkMode, setDarkMode,
    view, currentPerson, selectedYear,
    navigateToDashboard, navigateToPerson, selectedPersonId,
  } = useApp()

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <button
            onClick={navigateToDashboard}
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-blue-200 dark:group-hover:shadow-blue-900 transition-shadow">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white hidden sm:block text-sm tracking-tight">
              EPF Calculator
            </span>
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-sm flex-1 px-4 min-w-0" aria-label="Breadcrumb">
            {view !== 'dashboard' && (
              <>
                <button
                  onClick={navigateToDashboard}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium shrink-0 transition-colors"
                >
                  Dashboard
                </button>
                {currentPerson && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <button
                      onClick={() => navigateToPerson(selectedPersonId)}
                      className={`font-medium truncate transition-colors ${
                        view === 'year'
                          ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 cursor-default'
                      }`}
                    >
                      {currentPerson.name}
                    </button>
                  </>
                )}
                {selectedYear && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300 font-medium shrink-0">
                      {selectedYear}
                    </span>
                  </>
                )}
              </>
            )}
          </nav>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>
        </div>
      </div>
    </header>
  )
}
