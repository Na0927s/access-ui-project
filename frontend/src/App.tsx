// (한국어 요약) 앱의 뼈대 — 전체 페이지 레이아웃(헤더/본문/푸터)과 URL 경로별 페이지 연결
import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import ScrollTopButton from './components/ScrollTopButton'
import MainPage from './pages/MainPage'
import AboutPage from './pages/AboutPage'
import UserModePage from './pages/UserModePage'
import DeveloperModePage from './pages/DeveloperModePage'
import SignupPage from './pages/SignupPage'
import LoginPage from './pages/LoginPage'
import MyInfoPage from './pages/MyInfoPage'
import ResultHistoryPage from './pages/ResultHistoryPage'
import TermsPage from './pages/TermsPage'
import { useAuthStore } from './stores/authStore'

// 로그인이 필요한 페이지를 감싸는 보호 컴포넌트:
// 로그인 상태가 아니면 해당 페이지 대신 /login 으로 강제 이동시킴
function RequireLogin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.currentUser)
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    // min-h-screen + flex-col: 푸터가 화면 하단에 붙도록 하는 세로 레이아웃
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* 본문: 최대 폭 제한 + 중앙 정렬. id="main"은 "본문 바로가기" 링크의 이동 지점 */}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/user" element={<UserModePage />} />
          <Route path="/developer" element={<DeveloperModePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* 마이페이지 두 개는 RequireLogin으로 감싸 로그인 필수로 만듦 */}
          <Route
            path="/mypage/info"
            element={
              <RequireLogin>
                <MyInfoPage />
              </RequireLogin>
            }
          />
          <Route
            path="/mypage/results"
            element={
              <RequireLogin>
                <ResultHistoryPage />
              </RequireLogin>
            }
          />
          <Route path="/terms" element={<TermsPage />} />
          {/* 정의되지 않은 모든 경로는 홈으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ScrollTopButton />
    </div>
  )
}
