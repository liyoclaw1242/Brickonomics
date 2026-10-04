import { describe, it, expect } from 'vitest'
import { parseEmphasis, stripMarkup, visibleLength } from './emphasis'

describe('parseEmphasis', () => {
  it('splits **keywords** into emphasised segments', () => {
    expect(parseEmphasis('樓越**高**，公司越**大**')).toEqual([
      { text: '樓越', em: false },
      { text: '高', em: true },
      { text: '，公司越', em: false },
      { text: '大', em: true },
    ])
  })
  it('handles text without markers', () => {
    expect(parseEmphasis('拿起雷射刀')).toEqual([{ text: '拿起雷射刀', em: false }])
  })
  it('reads a colour key after |', () => {
    expect(parseEmphasis('**台積電|2330**佔了')).toEqual([
      { text: '台積電', em: true, key: '2330' },
      { text: '佔了', em: false },
    ])
  })
})

describe('stripMarkup', () => {
  it('removes markers and colour keys', () => {
    expect(stripMarkup('**台積電|2330**佔了約 **56%**')).toBe('台積電佔了約 56%')
  })
})

describe('visibleLength', () => {
  it('ignores markers and counts characters', () => {
    expect(visibleLength('樓越**高**，公司越**大**')).toBe(8) // 樓越高，公司越大 = 8 字
    expect(visibleLength('**台積電|2330**佔了')).toBe(5)
    expect(visibleLength('把 **0050** 切開')).toBe(9)
  })
})
