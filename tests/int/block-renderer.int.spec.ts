import { createElement } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlockRenderer } from '../../src/components/block-renderer'

describe('BlockRenderer', () => {
  it('keeps the page alive when the block type is unknown', () => {
    const { container } = render(
      createElement(BlockRenderer, {
        siteId: 1,
        projects: [],
        blocks: [{ blockType: 'legacyHtml', html: '<script>alert(1)</script>' }],
      }),
    )
    expect(container.querySelector('[data-unknown-block="legacyHtml"]')).toBeTruthy()
    expect(container.querySelector('script')).toBeNull()
  })
})
