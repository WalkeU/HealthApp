import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import RunsList from './pages/RunsList.jsx'
import RunDetail from './pages/RunDetail.jsx'
import Notes from './pages/Notes.jsx'
import PainLog from './pages/PainLog.jsx'
import Import from './pages/Import.jsx'
import Settings from './pages/Settings.jsx'
import AIChat from './pages/AIChat.jsx'
import SleepHistory from './pages/SleepHistory.jsx'

export default function App() {
  return (
    <div className="flex min-h-screen bg-surface text-ink font-mono">
      <Sidebar />
      <main className="flex-1 md:ml-sidebar min-h-screen overflow-x-hidden pb-16 md:pb-0">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/runs"      element={<RunsList />} />
          <Route path="/runs/:id"  element={<RunDetail />} />
          <Route path="/sleep"     element={<SleepHistory />} />
          <Route path="/notes"     element={<Notes />} />
          <Route path="/pain-log"  element={<PainLog />} />
          <Route path="/import"    element={<Import />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/insights"  element={<AIChat />} />
        </Routes>
      </main>
    </div>
  )
}
