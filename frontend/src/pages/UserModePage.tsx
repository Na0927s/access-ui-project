// (한국어 요약) 사용자 모드 페이지 — 캡처 이미지 한 장으로 간단히 검사하는 화면.
// 흐름: 이미지 업로드 → 색약 유형 선택 → 검사 버튼 → 원본/시뮬레이션 비교 + 결과 요약 표시
import { useEffect, useState } from 'react'
import { analyzeImage } from '../api/client'
import type { CvdType, ImageAnalysis } from '../api/types'
import CvdSelector from '../components/CvdSelector'
import ResultCompare from '../components/ResultCompare'
import ResultSummary from '../components/ResultSummary'
import UploadDropzone from '../components/UploadDropzone'
import { useT } from '../i18n/useT'
import { useAuthStore } from '../stores/authStore'
import { useResultStore } from '../stores/resultStore'
import { useUiStore } from '../stores/uiStore'

// User mode intentionally has NO "문제 해결 방법 / 요약" section (developer mode only).
// (한국어) 규칙 7번: 사용자 모드에는 문제 해결 방법/요약 영역을 만들지 않음 (개발자 모드 전용)
export default function UserModePage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [file, setFile] = useState<File | null>(null)          // 업로드된 파일
  const [preview, setPreview] = useState<string | null>(null)  // 미리보기용 object URL
  const [cvd, setCvd] = useState<CvdType | null>(null)         // 선택한 색약 유형
  const [loading, setLoading] = useState(false)                // 분석 진행 여부
  const [error, setError] = useState<string | null>(null)       // 에러 메시지
  const [result, setResult] = useState<ImageAnalysis | null>(null) // 분석 결과
  const token = useAuthStore((s) => s.token)                   // 로그인 토큰 (결과 저장용)
  const user = useAuthStore((s) => s.currentUser)
  const addResult = useResultStore((s) => s.add)

  // 컴포넌트가 사라질 때(새 이미지로 교체 시 포함) 미리보기 URL의 메모리 해제
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  // 새 파일이 선택되면: 파일/미리보기 갱신, 이전 분석 결과는 초기화
  const onFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  // "검사" 버튼: 사전 검증 → 백엔드 이미지 분석 요청 → 결과 표시
  const inspect = async () => {
    if (!file) return setError(t('errNoImage'))     // 이미지 필수
    if (!cvd) return setError(t('errNoCvd'))        // 색약 유형 필수
    setError(null)
    setLoading(true)
    try {
      // 로그인 상태면 토큰을 보내 백엔드가 결과를 DB에 저장하도록 함 (규칙 1)
      const data = await analyzeImage(file, cvd, 'user', lang, token) // 사용자 모드로 요청
      setResult(data)
      // 로그인 상태일 때만 결과 내역에 기록 (백엔드에도 저장됨, 메모리는 즉시 표시용)
      if (user) addResult({ fileName: file.name, mode: 'user', cvdType: cvd, score: data.score, data })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t('user')}</h1>
      <div className="flex flex-col gap-6 md:flex-row">
        {/* 좌: 업로드 영역 / 우: 색약 유형 선택 + 원형 검사 버튼 */}
        <UploadDropzone previewUrl={preview} onFile={onFile} />
        <div className="flex flex-col justify-between gap-4 md:w-40">
          <CvdSelector value={cvd} onChange={setCvd} />
          {/* aria-busy: 진행 중임을 스크린리더에 알림 */}
          <button
            type="button"
            onClick={inspect}
            disabled={loading}
            aria-busy={loading}
            className="grid size-20 place-items-center self-end rounded-full bg-ink font-bold text-white"
          >
            {loading ? t('inspecting') : t('inspect')}
          </button>
        </div>
      </div>
      {/* 에러 메시지 (스크린리더 즉시 알림) */}
      {error && <p role="alert" className="font-medium text-red-800">✕ {error}</p>}

      {/* 분석 완료: 원본/시뮬레이션 비교 + 결과 요약 (사용자 모드는 추천 색상 없음) */}
      {result && preview && (
        <div className="flex flex-col gap-6">
          <ResultCompare original={preview} simulated={result.simulated_image} cvdType={result.cvd_type} />
          <ResultSummary data={result} mode="user" />
        </div>
      )}
    </div>
  )
}
