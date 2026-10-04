import { describe, it, expect } from 'vitest'
import { forbiddenWordsIn, sentences } from './glossary'

describe('sentences', () => {
  it('splits on full stops and drops emphasis markers', () => {
    expect(sentences('拖**時間軸**。看**配息**那一刻')).toEqual(['拖時間軸', '看配息那一刻'])
    expect(sentences('塔變矮！因為發的是本金。')).toEqual(['塔變矮', '因為發的是本金'])
  })
})

describe('forbiddenWordsIn', () => {
  it('finds synonyms that the glossary bans', () => {
    expect(forbiddenWordsIn('看發股利那一刻')).toEqual(['股利'])
    expect(forbiddenWordsIn('管理費每天磨掉一點')).toEqual(['管理費'])
    expect(forbiddenWordsIn('要看方塊＋金幣的總和')).toEqual(['總和'])
  })
  it('allows proper names such as 高股息', () => {
    expect(forbiddenWordsIn('高股息：專挑冒金幣的')).toEqual([])
  })
})
