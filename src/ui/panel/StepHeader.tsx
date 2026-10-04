import type { ReactNode } from 'react'
import type { Mark } from '../marks'
import { MarkIcon } from '../MarkIcon'
import { T } from '../strings'

/** 品牌＋章節圖示與編號＋大標題；children（一句話）與標題一起放在 aria-live 外層 */
export function StepHeader({ level, levelCount, title, marks, revealed, children }: {
  level: number
  levelCount: number
  title: string
  /** 這一步的標示（≈ 舉例／✎ 假設的數字／？ 還沒查證），每種在標題旁出現一次 */
  marks: readonly Mark[]
  revealed: boolean
  children?: ReactNode
}) {
  const chapter = T.chapters[level]
  return (
    <header className="step-header">
      <p className="brand">{T.brand}</p>
      <p className="step-counter">
        {chapter && (
          <span className="step-counter__icon" role="img" aria-label={chapter.name} title={chapter.name}>
            {chapter.icon}
          </span>
        )}
        {T.chapterCounter(level, levelCount)}
      </p>
      <div className={revealed ? 'step-reveal is-revealed' : 'step-reveal'} aria-live="polite" aria-atomic="true">
        <h1 className="step-title">
          {title}
          {marks.length > 0 && (
            <span className="step-title__marks">
              {marks.map((k) => (
                <MarkIcon key={k} kind={k} />
              ))}
            </span>
          )}
        </h1>
        {children}
      </div>
    </header>
  )
}
