import { useQuality } from '../store/quality'
import { T } from './strings'

export function QualityNotice() {
  const degraded = useQuality((s) => s.degraded)
  const dismiss = useQuality((s) => s.dismissNotice)
  return (
    <div role="status" aria-live="polite" className={degraded ? 'notice' : 'notice notice--hidden'}>
      {degraded && (
        <>
          {T.qualityNotice}
          <button className="link" onClick={dismiss}>
            {T.dismiss}
          </button>
        </>
      )}
    </div>
  )
}
