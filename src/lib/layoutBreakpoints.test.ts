import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('mobile-first layout contract', () => {
  it('documents 320 / 375 / 430 breakpoints and 44px targets', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    expect(css).toContain('min-height: 44px')
    expect(css).toContain('320px')
    expect(css).toContain('375px')
    expect(css).toContain('430px')
  })
})
