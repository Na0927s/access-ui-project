// (한국어 요약) 사이트 하단 푸터 — 서비스명·팀명·소속 대학 표시.
// 사이트 소개/약관 링크는 홈과 소개 페이지에서만 노출 (푸터에는 팀 정보만).
export default function Footer() {
  return (
    <footer className="border-t border-rule bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-graphite">
        <span className="font-semibold text-ink">CVDS</span>
        <span>30조</span>
        <span>이름: 서나임</span>
        <span>주소: 원광대학교 창의공과대학 컴퓨터소프트웨어공학과</span>
      </div>
    </footer>
  )
}
