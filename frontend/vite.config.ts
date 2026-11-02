// (한국어 요약) Vite 빌드 도구 설정
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()], // React 지원 + Tailwind CSS 통합
  server: {
    port: 5176, // 개발 서버 포트 (백엔드 CORS 허용 목록과 일치해야 함)
    proxy: { '/api': 'http://localhost:8002' }, // /api 요청을 백엔드(8002)로 전달 — CORS 회피
  },
})
