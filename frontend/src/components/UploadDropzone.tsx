import { useRef, useState } from 'react'
import { useT } from '../i18n/useT'

const MAX = 10 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg']

export function validateImage(file: File): string | null {
  if (!TYPES.includes(file.type)) return '지원하지 않는 파일 형식입니다. PNG, JPG, JPEG 파일만 업로드할 수 있습니다.'
  if (file.size > MAX) return '파일 크기가 너무 큽니다. 10MB 이하의 이미지를 업로드해주세요.'
  return null
}

interface Props {
  previewUrl: string | null
  onFile: (file: File) => void
}

export default function UploadDropzone({ previewUrl, onFile }: Props) {
  const t = useT()
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (files.length > 1) return setError('한 번에 하나의 이미지만 업로드할 수 있습니다.')
    const err = validateImage(files[0])
    setError(err)
    if (!err) onFile(files[0])
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files) }}
        className={`grid min-h-64 place-items-center rounded-lg border-2 bg-white p-4 text-center ${
          dragging ? 'border-solid border-ink' : 'border-dashed border-graphite'
        }`}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="업로드한 화면 미리보기" className="max-h-80 max-w-full object-contain" />
        ) : (
          <div>
            <p className="font-medium">{dragging ? '여기에 놓으세요' : t('dropHere')}</p>
            <p className="mt-1 text-sm text-graphite">{t('formats')}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => input.current?.click()} className="rounded border border-ink px-4 py-2 text-sm">
          {t('chooseFile')}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          aria-label={t('chooseFile')}
          onChange={(e) => accept(e.target.files)}
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-800">✕ {error}</p>}
    </div>
  )
}
