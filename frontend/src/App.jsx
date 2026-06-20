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
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/runs"      element={<RunsList />} />
          <Route path="/runs/:id"  element={<RunDetail />} />
          <Route path="/sleep"     element={<SleepHistory />} />
          <Route path="/notes"     element={<Notes />} />
          <Route path="/pain-log"  element={<PainLog />} />
          <Route path="/import"    element={<Import />} />
          <Route path="/settings"  element={<Settings />} />
          <Route path="/ai"        element={<AIChat />} />
        </Routes>
      </main>
    </div>
  )
}
