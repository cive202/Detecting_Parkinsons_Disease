'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Brain, BookOpenText } from 'lucide-react'

import { cn } from '@/lib/utils'

export function SiteNav() {
  const pathname = usePathname()

  const linkClass = (active: boolean) =>
    cn(
      'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
    )

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-2">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">Parkinson&apos;s Detector</p>
            <p className="text-xs text-slate-600">Voice biomarkers (demo)</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/" className={linkClass(pathname === '/')}>
            Home
          </Link>
          <Link href="/docs" className={linkClass(pathname?.startsWith('/docs') ?? false)}>
            <BookOpenText className="h-4 w-4" />
            Docs
          </Link>
        </nav>
      </div>
    </header>
  )
}

