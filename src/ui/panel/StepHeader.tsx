import type { ReactNode } from 'react'
import type { Mark } from '../marks'
import { MarkIcon } from '../MarkIcon'
import { T } from '../strings'

/** 品牌＋章節圖示與編號＋大標題；children（一句話）與標題一起放在 aria-live 外層 */
export function StepHeader({ level, levelCount, title, mark, revealed, children }: {
  level: number
  levelCount: number
  title: string
  mark?: Mark
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
      <div className={revealed ? 'step-reveal is-revealed' : 'step-reveal'} aria-live="polite">
        <h1 className="step-title">
          {title}
          {mark && <MarkIcon kind={mark} />}
        </h1>
        {children}
      </div>
    </header>
  )
}
