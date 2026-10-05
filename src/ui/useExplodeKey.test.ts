// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { spaceExplodes } from './useExplodeKey'

const el = (html: string) => {
  document.body.innerHTML = html
  return document.body.firstElementChild!
}

describe('spaceExplodes', () => {
  it('never steals Space from text entry, whatever the last input was', () => {
    expect(spaceExplodes(el('<input type="text">'), true)).toBe(false)
    expect(spaceExplodes(el('<input>'), false)).toBe(false)
    expect(spaceExplodes(el('<textarea></textarea>'), true)).toBe(false)
    expect(spaceExplodes(el('<select><option>a</option></select>'), true)).toBe(false)
    expect(spaceExplodes(el('<div contenteditable="true"><span>x</span></div>').firstElementChild, true)).toBe(false)
  })

  it('never steals Space from a menu, even a mouse-opened one', () => {
    const menu = el('<div role="menu"><button role="menuitemradio">x</button></div>')
    expect(spaceExplodes(menu.firstElementChild, true)).toBe(false)
    expect(spaceExplodes(menu, true)).toBe(false)
  })

  it('explodes on range sliders, plain elements and mouse-focused buttons', () => {
    expect(spaceExplodes(el('<input type="range">'), false)).toBe(true)
    expect(spaceExplodes(el('<div></div>'), false)).toBe(true)
    expect(spaceExplodes(el('<button>x</button>'), true)).toBe(true)
    expect(spaceExplodes(null, false)).toBe(true)
  })
})
