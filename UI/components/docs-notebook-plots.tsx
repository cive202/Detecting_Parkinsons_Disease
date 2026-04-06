'use client'

import { useEffect } from 'react'
import Image from 'next/image'

import modelPlots from '@/data/model-plots.json'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

type PlotItem = {
  filename: string
  cell_index?: number
  output_index?: number
  kind?: string
}

type ModelEntry = {
  model: string
  slug: string
  plots: PlotItem[]
}

const general = modelPlots.general as PlotItem[]
const models = modelPlots.models as ModelEntry[]
const base = modelPlots.public_base

function scrollToHash() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
  if (!hash) return
  requestAnimationFrame(() => {
    const el = document.getElementById(hash)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

export function DocsNotebookPlots() {
  useEffect(() => {
    scrollToHash()
    window.addEventListener('hashchange', scrollToHash)
    return () => window.removeEventListener('hashchange', scrollToHash)
  }, [])

  return (
    <section className="mt-12 space-y-10 border-t border-slate-200 pt-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Notebook figures</h2>
        <p className="mt-1 text-sm text-slate-600">
          Plots exported from the analysis notebook (see <code className="rounded bg-slate-100 px-1">model-plots.json</code>
          ). Click a classifier in results to jump here when available.
        </p>
      </div>

      <Card id="notebook-general" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Exploratory &amp; general</CardTitle>
          <CardDescription>Distribution and preprocessing visuals from the notebook</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[min(420px,50vh)] w-full rounded-md border border-slate-200 p-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {general.map((p) => (
                <figure key={p.filename} className="overflow-hidden rounded-md border border-slate-100 bg-white">
                  <div className="relative aspect-[4/3] w-full">
                    <Image
                      src={`${base}/${p.filename}`}
                      alt={p.kind ?? p.filename}
                      fill
                      className="object-contain p-1"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                  <figcaption className="truncate px-1 pb-1 text-center text-[10px] text-slate-500">{p.filename}</figcaption>
                </figure>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="space-y-8">
        <h3 className="text-xl font-semibold text-slate-900">By model</h3>
        {models.map((m) => (
          <Card key={m.slug} id={m.slug} className="scroll-mt-24">
            <CardHeader>
              <CardTitle>{m.model}</CardTitle>
              <CardDescription>
                Anchor: <code className="rounded bg-slate-100 px-1">/docs#{m.slug}</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {m.plots.map((p) => (
                  <figure key={`${m.slug}-${p.filename}`} className="overflow-hidden rounded-md border border-slate-100 bg-white">
                    <div className="relative aspect-[4/3] w-full">
                      <Image
                        src={`${base}/${p.filename}`}
                        alt={`${m.model} — ${p.kind ?? 'plot'}`}
                        fill
                        className="object-contain p-1"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    </div>
                    <figcaption className="truncate px-2 pb-2 text-center text-xs text-slate-500">
                      {p.kind ? `${p.kind} · ` : ''}
                      {p.filename}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
