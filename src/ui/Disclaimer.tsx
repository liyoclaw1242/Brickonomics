import { SNAPSHOT_DATE } from '../data'
import { T } from './strings'

export function Disclaimer() {
  return <div className="disclaimer">{T.disclaimer(SNAPSHOT_DATE)}</div>
}
