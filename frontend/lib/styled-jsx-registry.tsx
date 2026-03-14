'use client'

import React, { useState } from 'react'
import { useServerInsertedHTML } from 'next/navigation'
import { StyleRegistry, createStyleRegistry } from 'styled-jsx'

/**
 * styled-jsx SSR Registry for Next.js App Router.
 *
 * Collects <style jsx> tags during server rendering and flushes them
 * into the HTML so the client sees the same styles → no hydration mismatch.
 *
 * @see https://nextjs.org/docs/app/guides/css-in-js
 */
export function StyledJsxRegistry({ children }: { children: React.ReactNode }) {
  const [jsxStyleRegistry] = useState(() => createStyleRegistry())

  useServerInsertedHTML(() => {
    const styles = jsxStyleRegistry.styles()
    jsxStyleRegistry.flush()
    return <>{styles}</>
  })

  return <StyleRegistry registry={jsxStyleRegistry}>{children}</StyleRegistry>
}
