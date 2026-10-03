import { useQuality } from '../store/quality'
import { T } from './strings'

export function QualityNotice() {
  const degraded = useQuality((s) => s.degraded)
  const dismiss = useQuality((s) => s.dismissNotice)
  if (!degraded) return null
  return (
    <div className="notice" role="status">
      {T.qualityNotice}
      <button className="link" onClick={dismiss}>
        {T.dismiss}
      </button>
    </div>
  )
}
