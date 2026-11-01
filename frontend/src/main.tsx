// (한국어 요약) 애플리케이션 진입점 — React 앱을 HTML의 #root 요소에 마운트
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css' // Tailwind 및 전역 스타일 로드

// StrictMode: 개발 중 잠재적 문제(부수효과 등)를 미리 경고해주는 React 개발 모드
// BrowserRouter: URL 경로(/user, /developer 등)에 따라 페이지를 바꿔주는 라우터
// document.getElementById('root') - HTML의 <div id="root"></div> 요소를 찾아 React 앱을 마운트
// ! - TypeScript에게 null이 아님을 확신시킴 (실제 HTML에 root div가 존재하므로 안전)
// ReactDOM.createRoot(...).render(...) - React 앱을 root div에 렌더링 마운트
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
