'use client'

import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Brain, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

import { DocsNotebookPlots } from '@/components/docs-notebook-plots'
import notebookDocs from '@/data/notebook-docs-metrics.json'

const docMeta = notebookDocs.meta as {
  pipeline?: {
    pca_variance_ratio?: number
    pca_n_components?: number
    train_test_split?: { test_size?: number; random_state?: number }
  }
}

type NotebookModel = {
  slug: string
  name: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  roc_auc: number
  roc_curve: { fpr: number[]; tpr: number[] }
}

const models = notebookDocs.models as NotebookModel[]

function shortChartLabel(name: string): string {
  const map: Record<string, string> = {
    'Logistic Regression': 'LogReg',
    'Decision Tree': 'DT',
    'Random Forest (gini)': 'RF (gini)',
    'Random Forest (entropy)': 'RF (ent)',
    SVM: 'SVM',
    'KNN (k=3)': 'KNN',
    'Gaussian NB': 'GauNB',
    'Bernoulli NB': 'BerNB',
    'Voting ensemble': 'Voting',
    XGBoost: 'XGB',
  }
  return map[name] ?? name.slice(0, 12)
}

function tabTriggerLabel(name: string): string {
  if (name.length <= 14) return name
  return `${name.slice(0, 12)}…`
}

function toRocChartData(m: NotebookModel): { fpr: number; tpr: number }[] {
  const { fpr, tpr } = m.roc_curve
  return fpr.map((f, i) => ({ fpr: f, tpr: tpr[i] ?? 0 }))
}

export default function Documentation() {
  const defaultSlug = models[0]?.slug ?? ''
  const [selectedSlug, setSelectedSlug] = useState(defaultSlug)

  const barData = useMemo(
    () =>
      models.map((m) => ({
        model: shortChartLabel(m.name),
        fullName: m.name,
        accuracy: Math.round(m.accuracy * 10000) / 100,
        precision: Math.round(m.precision * 10000) / 100,
        recall: Math.round(m.recall * 10000) / 100,
        f1: Math.round(m.f1 * 10000) / 100,
      })),
    []
  )

  const bestAcc = useMemo(() => models.reduce((a, b) => (a.accuracy >= b.accuracy ? a : b)), [])
  const bestAuc = useMemo(() => models.reduce((a, b) => (a.roc_auc >= b.roc_auc ? a : b)), [])

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 p-2">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Model Documentation</h1>
                <p className="text-sm text-slate-600">Metrics and ROC from the analysis notebook pipeline</p>
              </div>
            </div>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Detector
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mb-6 border-slate-200 bg-white/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Notebook pipeline (documented metrics)</CardTitle>
            <CardDescription>
              PCA retains {docMeta.pipeline?.pca_variance_ratio ?? 0.95} variance ({docMeta.pipeline?.pca_n_components ?? '—'}{' '}
              components), hold-out test_size {docMeta.pipeline?.train_test_split?.test_size ?? 0.2}, random_state{' '}
              {docMeta.pipeline?.train_test_split?.random_state ?? 7}. Charts and tables below use committed{' '}
              <code className="rounded bg-slate-100 px-1">notebook-docs-metrics.json</code> (see{' '}
              <code className="rounded bg-slate-100 px-1">meta.deviations_from_notebook</code> for notes vs a given notebook run).
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall model performance (test set)</CardTitle>
            <CardDescription>Binary classification metrics (Parkinson&apos;s vs healthy), scaled to percent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(640, barData.length * 72) }}>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="model" stroke="#64748b" interval={0} angle={-35} textAnchor="end" height={72} />
                    <YAxis stroke="#64748b" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
                      formatter={(value: number) => `${Number(value).toFixed(1)}%`}
                      labelFormatter={(_, payload) => {
                        const p = payload?.[0]?.payload as { fullName?: string } | undefined
                        return p?.fullName ?? ''
                      }}
                    />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#8b5cf6" name="Accuracy" />
                    <Bar dataKey="precision" fill="#06b6d4" name="Precision" />
                    <Bar dataKey="recall" fill="#10b981" name="Recall" />
                    <Bar dataKey="f1" fill="#f59e0b" name="F1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div>
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Per-model metrics and ROC</h2>
            <Tabs value={selectedSlug} onValueChange={setSelectedSlug} className="space-y-4">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {models.map((m) => (
                  <TabsTrigger key={m.slug} value={m.slug} className="text-xs sm:text-sm">
                    {tabTriggerLabel(m.name)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {models.map((m) => (
                <TabsContent key={m.slug} value={m.slug} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">{m.name}</CardTitle>
                        <CardDescription>
                          Notebook figures:{' '}
                          <Link href={`/docs#${m.slug}`} className="text-purple-700 underline">
                            Jump to exported plots
                          </Link>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600">
                          Metrics below are computed on the same PCA-transformed hold-out split as in the export script,
                          using scikit-learn classification metrics (binary positive class = Parkinson&apos;s).
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-xl">Performance metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 p-4">
                            <p className="text-xs font-medium text-purple-700">ROC AUC</p>
                            <p className="text-3xl font-bold text-purple-900">{m.roc_auc.toFixed(3)}</p>
                          </div>
                          <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-4">
                            <p className="text-xs font-medium text-blue-700">Accuracy</p>
                            <p className="text-3xl font-bold text-blue-900">{(m.accuracy * 100).toFixed(1)}%</p>
                          </div>
                          <div className="rounded-lg bg-gradient-to-br from-green-50 to-green-100 p-4">
                            <p className="text-xs font-medium text-green-700">Precision</p>
                            <p className="text-3xl font-bold text-green-900">{(m.precision * 100).toFixed(1)}%</p>
                          </div>
                          <div className="rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 p-4">
                            <p className="text-xs font-medium text-amber-700">Recall</p>
                            <p className="text-3xl font-bold text-amber-900">{(m.recall * 100).toFixed(1)}%</p>
                          </div>
                          <div className="col-span-2 rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 p-4">
                            <p className="text-xs font-medium text-cyan-700">F1 score</p>
                            <p className="text-3xl font-bold text-cyan-900">{(m.f1 * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>ROC curve</CardTitle>
                      <CardDescription>
                        Points downsampled for the chart; AUC = {m.roc_auc.toFixed(4)} (from{' '}
                        <code className="rounded bg-slate-100 px-1">roc_auc_score</code> on the same score vector as{' '}
                        <code className="rounded bg-slate-100 px-1">roc_curve</code>)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={toRocChartData(m)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            dataKey="fpr"
                            label={{ value: 'False positive rate', position: 'insideBottomRight', offset: -5 }}
                            stroke="#64748b"
                            domain={[0, 1]}
                          />
                          <YAxis
                            label={{ value: 'True positive rate', angle: -90, position: 'insideLeft' }}
                            stroke="#64748b"
                            domain={[0, 1]}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }}
                            formatter={(value: number) => (typeof value === 'number' ? value.toFixed(3) : String(value))}
                          />
                          <Line
                            type="monotone"
                            dataKey="tpr"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            dot={false}
                            name={`${m.name} (AUC = ${m.roc_auc.toFixed(3)})`}
                          />
                          <ReferenceLine
                            segment={[
                              { x: 0, y: 0 },
                              { x: 1, y: 1 },
                            ]}
                            stroke="#cbd5e1"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                      <p className="mt-4 text-sm text-slate-600">
                        The dashed diagonal is chance performance. Curves closer to the upper-left indicate better separation
                        between classes on the held-out test set.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <Card className="border-l-4 border-l-purple-600">
            <CardHeader>
              <CardTitle>Which model scores highest here?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Highest test accuracy:</span>{' '}
                {bestAcc.name} ({(bestAcc.accuracy * 100).toFixed(2)}%).
              </p>
              <p>
                <span className="font-semibold text-slate-900">Highest ROC AUC:</span>{' '}
                {bestAuc.name} ({bestAuc.roc_auc.toFixed(4)}).
              </p>
              <p className="text-slate-600">
                Your deployed API may use a different training bundle (e.g. scaler + PCA + joblib models). Treat this page
                as documentation of the notebook-style pipeline export, not necessarily the live endpoint weights.
              </p>
            </CardContent>
          </Card>
        </div>

        <DocsNotebookPlots />
      </div>
    </main>
  )
}
