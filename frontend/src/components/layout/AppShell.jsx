import { Outlet } from 'react-router-dom'
import Header from './Header'
import NavBar from './NavBar'

export default function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Header />
      <NavBar />
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
