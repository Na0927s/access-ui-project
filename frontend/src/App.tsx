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

// 홈 이외 페이지용 폭 제한 래퍼 — 홈은 전체 폭 띠를 쓰므로 main에 폭 제한을 두지 않고,
// 각 페이지 안쪽에서 기존과 동일한 폭·패딩을 유지하도록 감싼다.
function PageWrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-8">{children}</div>
}

export default function App() {
  return (
    // min-h-screen + flex-col: 푸터가 화면 하단에 붙도록 하는 세로 레이아웃
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* 본문: 홈은 전체 폭(섹션마다 안쪽에서 폭 제한), 다른 페이지는 PageWrap으로 폭 제한.
          id="main"은 "본문 바로가기" 링크의 이동 지점. */}
      <main id="main" className="w-full flex-1">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route
            path="/about"
            element={
              <PageWrap>
                <AboutPage />
              </PageWrap>
            }
          />
          <Route
            path="/user"
            element={
              <PageWrap>
                <UserModePage />
              </PageWrap>
            }
          />
          <Route
            path="/developer"
            element={
              <PageWrap>
                <DeveloperModePage />
              </PageWrap>
            }
          />
          <Route
            path="/signup"
            element={
              <PageWrap>
                <SignupPage />
              </PageWrap>
            }
          />
          <Route
            path="/login"
            element={
              <PageWrap>
                <LoginPage />
              </PageWrap>
            }
          />
          {/* 마이페이지 두 개는 RequireLogin으로 감싸 로그인 필수로 만듦 */}
          <Route
            path="/mypage/info"
            element={
              <RequireLogin>
                <PageWrap>
                  <MyInfoPage />
                </PageWrap>
              </RequireLogin>
            }
          />
          <Route
            path="/mypage/results"
            element={
              <RequireLogin>
                <PageWrap>
                  <ResultHistoryPage />
                </PageWrap>
              </RequireLogin>
            }
          />
          <Route
            path="/terms"
            element={
              <PageWrap>
                <TermsPage />
              </PageWrap>
            }
          />
          {/* 정의되지 않은 모든 경로는 홈으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ScrollTopButton />
    </div>
  )
}
