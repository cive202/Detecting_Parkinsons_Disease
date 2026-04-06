import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Model documentation',
  description: 'Performance metrics, ROC curves, and notebook plots for the Parkinson voice demo models.',
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return children
}
