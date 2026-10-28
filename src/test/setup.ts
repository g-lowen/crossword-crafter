import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  // The editor autosaves, so each test starts from an empty browser. Tests that run in Node, like
  // the feedback worker's, have no localStorage.
  globalThis.localStorage?.clear()
  vi.restoreAllMocks()
})
