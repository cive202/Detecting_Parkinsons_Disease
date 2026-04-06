import modelPlots from '@/data/model-plots.json'

export type ModelPlotEntry = {
  model: string
  slug: string
  plots: { filename: string; cell_index?: number; output_index?: number; kind?: string }[]
}

const models = modelPlots.models as ModelPlotEntry[]

/** Map API / artifact classifier name to docs anchor slug for `model-plots.json`. */
export function resolvePlotSlug(apiModelName: string): string | undefined {
  const t = apiModelName.trim()
  const tl = t.toLowerCase()

  for (const m of models) {
    if (m.model === t || m.model.toLowerCase() === tl) {
      return m.slug
    }
  }

  if (tl.includes('knn') && (tl.includes('k=3') || tl.includes('k = 3'))) return 'knn-k-3'
  if (tl.includes('knn') || tl.includes('k-nearest')) return 'knn'
  if (tl.includes('xgboost')) return 'xgboost'
  if (tl.includes('svm') || tl.includes('support vector')) return 'svm'
  if (tl.includes('random forest') && tl.includes('entropy')) return 'random-forest-entropy'
  if (tl.includes('random forest') && tl.includes('gini')) return 'random-forest-gini'
  if (tl.includes('random forest')) return 'random-forest'
  if (tl.includes('bernoulli')) return 'bernoulli-nb'
  if (tl.includes('gaussian') && tl.includes('nb')) return 'gaussian-nb'
  if (tl.includes('decision tree')) return 'decision-tree'
  if (tl.includes('logistic')) return 'logistic-regression'
  if (tl.includes('naive bayes')) return 'naive-bayes'
  if (tl.includes('voting')) return 'voting-ensemble'

  return undefined
}

export function getModelPlotsBySlug(slug: string): ModelPlotEntry | undefined {
  return models.find((m) => m.slug === slug)
}

export function getModelPlotsPublicBase(): string {
  return modelPlots.public_base
}
