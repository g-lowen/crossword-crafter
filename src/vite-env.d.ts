/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where the feedback worker runs (see feedback/README.md). Without it there's no Feedback button. */
  readonly VITE_FEEDBACK_URL?: string
}
