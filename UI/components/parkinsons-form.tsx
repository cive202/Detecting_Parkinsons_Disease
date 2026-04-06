'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import datasetExamples from '@/data/val.json'
import {
  FIELD_GROUPS,
  HEALTHY_EXAMPLE,
  HEALTHY_SAMPLES,
  PARKINSONS_EXAMPLE,
  PARKINSONS_SAMPLES,
  type VoiceFormValues,
} from '@/data/form-presets'

interface ParkinsonsFormProps {
  onSubmit: (data: VoiceFormValues) => void
  loading: boolean
}

function emptyFormState(): VoiceFormValues {
  return FIELD_GROUPS.reduce<VoiceFormValues>(
    (acc, group) => ({
      ...acc,
      ...group.fields.reduce<VoiceFormValues>(
        (fieldAcc, field) => ({ ...fieldAcc, [field.name]: 0 }),
        {}
      ),
    }),
    {}
  )
}

export function ParkinsonsForm({ onSubmit, loading }: ParkinsonsFormProps) {
  const [formData, setFormData] = useState<VoiceFormValues>(emptyFormState)
  const [lastExampleIndex, setLastExampleIndex] = useState<number | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([FIELD_GROUPS[0].group]))

  const nDatasetExamples = Array.isArray(datasetExamples) ? datasetExamples.length : 0

  const handleChange = (fieldName: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setFormData((prev) => ({ ...prev, [fieldName]: numValue }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  function pickExampleIndex(): number | null {
    if (nDatasetExamples === 0) return null
    if (nDatasetExamples === 1) return 0
    let idx = Math.floor(Math.random() * nDatasetExamples)
    if (lastExampleIndex !== null && idx === lastExampleIndex) {
      idx = (idx + 1) % nDatasetExamples
    }
    return idx
  }

  const applyExample = (idx: number) => {
    const ex = datasetExamples[idx] as VoiceFormValues
    setFormData((prev) => ({ ...prev, ...ex }))
    setLastExampleIndex(idx)
  }

  const applyPreset = (preset: VoiceFormValues) => {
    setFormData((prev) => ({ ...prev, ...preset }))
  }

  const runPreset = (preset: VoiceFormValues) => {
    setFormData((prev) => ({ ...prev, ...preset }))
    onSubmit({ ...formData, ...preset })
  }

  function pickRandom(arr: VoiceFormValues[]) {
    if (!arr.length) return null
    return arr[Math.floor(Math.random() * arr.length)]
  }

  const handleRunRandomHealthy = () => {
    const ex = pickRandom(HEALTHY_SAMPLES)
    if (!ex) return
    runPreset(ex)
  }

  const handleRunRandomParkinsons = () => {
    const ex = pickRandom(PARKINSONS_SAMPLES)
    if (!ex) return
    runPreset(ex)
  }

  const handleRunRandomAny = () => {
    const pool = [...HEALTHY_SAMPLES, ...PARKINSONS_SAMPLES]
    const ex = pickRandom(pool)
    if (!ex) return
    runPreset(ex)
  }

  const handleGenerateExample = () => {
    const idx = pickExampleIndex()
    if (idx === null) return
    applyExample(idx)
  }

  const handleRunExample = () => {
    const idx = pickExampleIndex()
    if (idx === null) return
    const ex = datasetExamples[idx] as VoiceFormValues
    setFormData((prev) => ({ ...prev, ...ex }))
    setLastExampleIndex(idx)
    onSubmit({ ...formData, ...ex })
  }

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <Card className="bg-white p-6 shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate autoComplete="off">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Voice Biomarker Analysis</h2>
          <p className="mt-1 text-sm text-slate-600">Enter the voice measurements to analyze for Parkinson&apos;s Disease indicators</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Examples</p>
              <p className="text-xs text-slate-600">Quickly fill or run a known sample.</p>
            </div>
            {nDatasetExamples > 0 ? (
              <p className="text-xs font-medium text-slate-600">Dataset examples loaded: {nDatasetExamples}</p>
            ) : null}
          </div>

          {nDatasetExamples > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Dataset</span>
              <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={handleGenerateExample}>
                Pick another
              </Button>
              <Button type="button" size="sm" disabled={loading} onClick={handleRunExample}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner />
                    Running...
                  </span>
                ) : (
                  'Run dataset sample'
                )}
              </Button>
            </div>
          ) : null}

          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Presets</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => applyPreset(HEALTHY_EXAMPLE)}
                >
                  Fill Healthy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => applyPreset(PARKINSONS_EXAMPLE)}
                >
                  Fill Parkinsons
                </Button>
                <Button type="button" size="sm" disabled={loading} onClick={() => runPreset(HEALTHY_EXAMPLE)}>
                  Run Healthy
                </Button>
                <Button type="button" size="sm" disabled={loading} onClick={() => runPreset(PARKINSONS_EXAMPLE)}>
                  Run Parkinsons
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-700">Random picks</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={handleRunRandomAny}>
                  Run Random (Any)
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={handleRunRandomHealthy}>
                  Run Random Healthy
                </Button>
                <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={handleRunRandomParkinsons}>
                  Run Random Parkinsons
                </Button>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">
                Random picks are drawn from real samples (some may still be misclassified by the model).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {FIELD_GROUPS.map((group) => (
            <Collapsible
              key={group.group}
              open={openGroups.has(group.group)}
              onOpenChange={() => toggleGroup(group.group)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-slate-100 px-4 py-3 font-medium text-slate-900 hover:bg-slate-200">
                <span>{group.group}</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${openGroups.has(group.group) ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 border-l-2 border-slate-200 bg-slate-50 px-4 py-4">
                {group.fields.map((field) => (
                  <div key={field.name} className="flex flex-col">
                    <Label htmlFor={field.name} className="mb-2 text-sm font-medium text-slate-700">
                      {field.label}
                    </Label>
                    <Input
                      id={field.name}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min={field.min}
                      max={field.max}
                      value={formData[field.name]}
                      onChange={(e) => handleChange(field.name, e.target.value)}
                      onInvalid={(e) => e.preventDefault()}
                      className="h-9 border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                      placeholder={`Min: ${field.min}, Max: ${field.max}`}
                    />
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 py-2 font-semibold text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Spinner />
              Analyzing...
            </div>
          ) : (
            'Analyze Voice Data'
          )}
        </Button>
      </form>
    </Card>
  )
}
