'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, CheckCircle2, ExternalLink, TrendingUp } from 'lucide-react'

import { getModelPlotsBySlug, getModelPlotsPublicBase, resolvePlotSlug } from '@/lib/model-plot-slug'

interface PredictionResult {
  prediction: string
  classifier_votes: Record<string, string>
  probabilities?: Record<string, number>
  primary?: {
    model: string
    prediction: string
  }
}

interface ResultsDisplayProps {
  results: PredictionResult
  onReset: () => void
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const [voteDialogModel, setVoteDialogModel] = useState<string | null>(null)

  const primaryFromApi = results.primary?.prediction
  const primaryModelFromApi = results.primary?.model

  const votes = results.classifier_votes ?? {}
  const fallbackPrimaryKey =
    Object.keys(votes).find((k) => k.toLowerCase().includes('knn') || k.toLowerCase().includes('k-nearest')) ??
    Object.keys(votes)[0]
  const fallbackPrimaryPrediction = fallbackPrimaryKey ? votes[fallbackPrimaryKey] : undefined

  const primaryPrediction = primaryFromApi ?? fallbackPrimaryPrediction
  const primaryModel = primaryModelFromApi ?? fallbackPrimaryKey ?? 'Primary'

  const isPrimaryParkinsons = (primaryPrediction ?? '').toLowerCase() === 'parkinsons'
  const parkinsonsCount = Object.values(results.classifier_votes ?? {}).filter(
    (v) => v.toLowerCase() === 'parkinsons'
  ).length
  const healthyCount = Object.values(results.classifier_votes ?? {}).filter((v) => v.toLowerCase() === 'healthy')
    .length

  const dialogSlug = voteDialogModel ? resolvePlotSlug(voteDialogModel) : undefined
  const dialogPlots = dialogSlug ? getModelPlotsBySlug(dialogSlug) : undefined
  const plotBase = getModelPlotsPublicBase()
  const previewPlots = dialogPlots?.plots.slice(0, 4) ?? []

  return (
    <div className="space-y-4">
      {/* Primary Result (KNN) */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div
          className={`bg-gradient-to-br p-6 text-white ${
            isPrimaryParkinsons ? 'from-red-600 to-red-700' : 'from-green-600 to-green-700'
          }`}
        >
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-90">{primaryModel}</p>
              <h3 className="text-2xl font-bold">{primaryPrediction ?? '—'}</h3>
            </div>
            {isPrimaryParkinsons ? (
              <AlertCircle className="h-8 w-8" />
            ) : (
              <CheckCircle2 className="h-8 w-8" />
            )}
          </div>
          <p className="text-sm opacity-90">
            Total votes — Parkinsons: {parkinsonsCount}, Healthy: {healthyCount}
          </p>
        </div>
      </Card>

      {/* Summary box */}
      <Card className="border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-700">PREDICTION SUMMARY</p>
        <p className="mt-2 text-sm text-slate-700">{results.prediction}</p>
      </Card>

      {/* Classifier Votes */}
      {results.classifier_votes && Object.keys(results.classifier_votes).length > 0 && (
        <Card className="border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-slate-600" />
            <p className="text-xs font-semibold text-slate-700">CLASSIFIER VOTES</p>
          </div>
          <div className="space-y-2">
            {Object.entries(results.classifier_votes).map(([classifier, vote]) => (
              <button
                key={classifier}
                type="button"
                className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100"
                onClick={() => setVoteDialogModel(classifier)}
              >
                <span className="text-xs font-medium text-slate-600">{classifier}</span>
                <Badge variant={vote.toLowerCase() === 'parkinsons' ? 'destructive' : 'default'}>
                  {vote}
                </Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={voteDialogModel !== null} onOpenChange={(open) => !open && setVoteDialogModel(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{voteDialogModel ?? 'Classifier'}</DialogTitle>
            <DialogDescription>
              Notebook plots linked to this model (when a match exists in the docs manifest).
            </DialogDescription>
          </DialogHeader>
          {previewPlots.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {previewPlots.map((p) => (
                <div key={p.filename} className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <Image
                    src={`${plotBase}/${p.filename}`}
                    alt={p.kind ?? p.filename}
                    fill
                    className="object-contain p-1"
                    sizes="200px"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              No notebook plots matched this classifier name. Open the full docs to browse all figures.
            </p>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setVoteDialogModel(null)}>
              Close
            </Button>
            <Button asChild>
              <Link href={dialogSlug ? `/docs#${dialogSlug}` : '/docs'}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Docs
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Probabilities */}
      {results.probabilities && (
        <Card className="border-slate-200 bg-white p-4">
          <p className="mb-3 text-xs font-semibold text-slate-700">PROBABILITIES</p>
          <div className="space-y-3">
            {Object.entries(results.probabilities).map(([label, prob]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{label}</span>
                  <span className="text-xs font-bold text-slate-900">{Math.round(prob * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${
                      label === 'Parkinsons' ? 'bg-red-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${prob * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reset Button */}
      <Button
        onClick={onReset}
        variant="outline"
        className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        Clear Results
      </Button>
    </div>
  )
}
