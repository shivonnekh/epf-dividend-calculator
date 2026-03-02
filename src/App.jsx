import { AppProvider, useApp } from './context/AppContext'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import PersonDetail from './components/PersonDetail'
import YearView from './components/YearView'

function AppContent() {
  const { view } = useApp()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <main className="pb-12">
        {view === 'dashboard' && <Dashboard />}
        {view === 'person'    && <PersonDetail />}
        {view === 'year'      && <YearView />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
