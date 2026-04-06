'use client'

import { useState } from 'react'
import { ParkinsonsForm } from '@/components/parkinsons-form'
import { ResultsDisplay } from '@/components/results-display'
import { Brain } from 'lucide-react'

export default function Home() {
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const handleSubmit = async (formData: Record<string, number>) => {
    setLoading(true)
    setRequestError(null)
    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok || (data && typeof data === 'object' && 'error' in data && !('prediction' in data))) {
        const msg =
          typeof data?.error === 'string'
            ? data.error
            : typeof data?.detail === 'string'
              ? data.detail
              : `Request failed (${response.status})`
        setRequestError(msg)
        setResults(null)
        return
      }
      setResults(data)
    } catch (error) {
      console.error('Error:', error)
      setRequestError(error instanceof Error ? error.message : 'Network error')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong>Demo only.</strong> This tool is not a medical device and does not diagnose disease. Do not use
            it for clinical decisions.
          </p>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-2">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Parkinson&apos;s Detector</h1>
              <p className="text-sm text-slate-600">ML-powered voice biomarker analysis</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <ParkinsonsForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Results Section */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            {requestError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                <p className="font-semibold">Could not get a prediction</p>
                <p className="mt-1">{requestError}</p>
              </div>
            ) : null}
            {results ? (
              <ResultsDisplay
                results={results}
                onReset={() => {
                  setResults(null)
                  setRequestError(null)
                }}
              />
            ) : !requestError ? (
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-white p-6 text-center">
                <Brain className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-4 text-sm font-medium text-slate-600">Results will appear here</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
