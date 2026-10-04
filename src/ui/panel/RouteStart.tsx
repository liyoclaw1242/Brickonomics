import { routeLength } from '../../tour/levels'
import type { Route } from '../../tour/types'
import { T } from '../strings'

/** 第一次來：先選路線。兩顆大按鈕，各配一句白話 */
export function RouteStart({ onChoose }: { onChoose: (r: Route) => void }) {
  return (
    <section className="route-start" aria-labelledby="route-start-title">
      <h1 className="step-title" id="route-start-title">
        {T.route.startTitle}
      </h1>
      <button className="route-start__choice route-start__choice--simple" onClick={() => onChoose('simple')}>
        <span className="route-start__name">{T.route.simple(routeLength('simple'))}</span>
        <span className="route-start__note">{T.route.simpleNote}</span>
      </button>
      <button className="route-start__choice" onClick={() => onChoose('full')}>
        <span className="route-start__name">{T.route.full(routeLength('full'))}</span>
        <span className="route-start__note">{T.route.fullNote}</span>
      </button>
      <p className="hint">{T.route.later}</p>
    </section>
  )
}
