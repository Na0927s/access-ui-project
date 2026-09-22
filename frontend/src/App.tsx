import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollTopButton from './components/ScrollTopButton'
import MainPage from './pages/MainPage'
import UserModePage from './pages/UserModePage'
import DeveloperModePage from './pages/DeveloperModePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import MyInfoPage from './pages/MyInfoPage'
import ResultHistoryPage from './pages/ResultHistoryPage'
import TermsPage from './pages/TermsPage'
import { useAuthStore } from './stores/authStore'

function RequireLogin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.currentUser)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/user" element={<UserModePage />} />
          <Route path="/developer" element={<DeveloperModePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mypage/info" element={<RequireLogin><MyInfoPage /></RequireLogin>} />
          <Route path="/mypage/results" element={<RequireLogin><ResultHistoryPage /></RequireLogin>} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ScrollTopButton />
    </div>
  )
}
