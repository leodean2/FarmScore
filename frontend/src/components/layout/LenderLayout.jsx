import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function LenderLayout() {
  return (
    <div className="flex min-h-screen bg-[#F1F5F0]">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden min-w-0 pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  )
}