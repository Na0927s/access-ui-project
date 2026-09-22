export default function TermsPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 leading-relaxed">
      <h1 className="text-2xl font-bold">사이트 설명 · 약관</h1>
      <p>Access UI는 웹 화면의 색상이 색각이상 사용자에게도 구분되는지 분석하고 개선 방법을 제안하는 학교 팀 프로젝트입니다.</p>
      <h2 className="text-lg font-bold">분석 방식</h2>
      <p>색각이상 시뮬레이션은 Machado(2009) 모델을, 색상 거리는 OKLab을, 대비 판정은 WCAG 2 AA 기준을 사용합니다. 접근성 점수는 자체 평가 지표이며 공식 WCAG 인증 점수가 아닙니다.</p>
      <h2 className="text-lg font-bold">개인정보</h2>
      <p>계정 정보와 분석 결과는 서버나 데이터베이스에 저장되지 않고 브라우저 메모리에만 임시로 보관됩니다. 새로고침하거나 로그아웃하면 사라집니다. 업로드한 이미지는 분석 직후 서버에서 폐기됩니다.</p>
      <h2 className="text-lg font-bold">한계</h2>
      <p>이미지 분석은 압축과 안티앨리어싱의 영향을 받으며, 실제 CSS 값이 아닌 화면에 보이는 색을 기준으로 합니다. 동적으로 생성되는 UI는 정확히 분석하지 못할 수 있습니다.</p>
    </article>
  )
}
