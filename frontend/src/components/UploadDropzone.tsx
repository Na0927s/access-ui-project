// (한국어 요약) 이미지 업로드 드래그앤드롭 영역 — 파일을 끌어다 놓거나 버튼으로 선택.
// 프론트엔드에서 1차 검증(형식/크기/1개만)을 하고 통과한 파일만 부모로 전달
import { useRef, useState } from 'react'
import { useT } from '../i18n/useT'

const MAX = 10 * 1024 * 1024          // 10MB (백엔드 제한과 동일)
const TYPES = ['image/png', 'image/jpeg'] // 허용 형식

// 업로드된 파일 검증: 문제가 있으면 에러 문구, 없으면 null 반환
function validateImage(file: File, t: ReturnType<typeof useT>): string | null {
  if (!TYPES.includes(file.type)) return t('errFileType')
  if (file.size > MAX) return t('errFileSize')
  return null
}

interface Props {
  previewUrl: string | null       // 업로드된 이미지 미리보기 URL (없으면 안내 문구 표시)
  onFile: (file: File) => void    // 검증을 통과한 파일을 부모에게 전달하는 콜백
}

export default function UploadDropzone({ previewUrl, onFile }: Props) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)  // 숨겨진 file input을 버튼으로 열기 위한 참조
  const [dragging, setDragging] = useState(false) // 드래그 중 여부 (테두리 강조용)
  const [error, setError] = useState<string | null>(null)

  // 드롭/선택된 파일 처리: 여러 개면 에러, 1개면 검증 후 전달
  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (files.length > 1) return setError(t('errMultipleFiles'))
    const err = validateImage(files[0], t)
    setError(err)
    if (!err) onFile(files[0])
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* 드래그앤드롭 영역: 드래그 중이면 실선 테두리로 반응 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files) }}
        className={`grid min-h-64 place-items-center rounded-lg border-2 bg-white p-4 text-center ${
          dragging ? 'border-solid border-ink' : 'border-dashed border-graphite'
        }`}
      >
        {previewUrl ? (
          // 업로드된 이미지 미리보기 (대체 텍스트 포함 — 접근성)
          <img src={previewUrl} alt={t('uploadPreviewAlt')} className="max-h-80 max-w-full object-contain" />
        ) : (
          <div>
            <p className="font-medium">{dragging ? t('dropNow') : t('dropHere')}</p>
            <p className="mt-1 text-sm text-graphite">{t('formats')}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        {/* 숨겨진 input을 대신 열어주는 "파일 업로드" 버튼 */}
        <button type="button" onClick={() => input.current?.click()} className="rounded border border-ink px-4 py-2 text-sm">
          {t('chooseFile')}
        </button>
        {/* 실제 파일 선택 input — 화면에서는 숨김(sr-only), 키보드 접근 가능 */}
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          aria-label={t('chooseFile')}
          onChange={(e) => accept(e.target.files)}
        />
      </div>
      {/* 검증 에러 메시지 — role="alert"로 스크린리더가 즉시 알림 */}
      {error && <p role="alert" className="text-sm font-medium text-red-800">✕ {error}</p>}
    </div>
  )
}
