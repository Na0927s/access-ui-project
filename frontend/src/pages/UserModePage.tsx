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
export default function UserModePage() {
  const t = useT()
  const lang = useUiStore((s) => s.lang)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [cvd, setCvd] = useState<CvdType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImageAnalysis | null>(null)
  const user = useAuthStore((s) => s.currentUser)
  const addResult = useResultStore((s) => s.add)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const onFile = (f: File) => {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
  }

  const inspect = async () => {
    if (!file) return setError(t('errNoImage'))
    if (!cvd) return setError(t('errNoCvd'))
    setError(null)
    setLoading(true)
    try {
      const data = await analyzeImage(file, cvd, 'user', lang)
      setResult(data)
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
        <UploadDropzone previewUrl={preview} onFile={onFile} />
        <div className="flex flex-col justify-between gap-4 md:w-40">
          <CvdSelector value={cvd} onChange={setCvd} />
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
      {error && <p role="alert" className="font-medium text-red-800">✕ {error}</p>}

      {result && preview && (
        <div className="flex flex-col gap-6">
          <ResultCompare original={preview} simulated={result.simulated_image} cvdType={result.cvd_type} />
          <ResultSummary data={result} mode="user" />
        </div>
      )}
    </div>
  )
}
