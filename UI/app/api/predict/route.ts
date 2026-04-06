import { NextRequest, NextResponse } from 'next/server'

interface FlaskPredictResponse {
  prediction?: string
  classifier_votes?: Record<string, string>
  probabilities?: Record<string, number>
  primary?: { model: string; prediction: string }
  error?: string
  detail?: string
}

function mockPredict(features: Record<string, number>) {
  const featureValues = Object.values(features)
  const sum = featureValues.reduce((a, b) => a + b, 0)
  const avg = sum / featureValues.length
  const isParkinsons = avg > 0.3
  const classifiers = {
    'K-Nearest Neighbors': isParkinsons ? 'Parkinsons' : 'Healthy',
    XGBoost: isParkinsons ? 'Parkinsons' : 'Healthy',
    'Support Vector Machine': isParkinsons ? 'Parkinsons' : 'Healthy',
    'Random Forest': !isParkinsons ? 'Parkinsons' : 'Healthy',
  }
  const parkinsonsVotes = Object.values(classifiers).filter((v) => v === 'Parkinsons').length
  const confidence = Math.abs(parkinsonsVotes - 2) / 4 + 0.3
  return {
    prediction: isParkinsons ? 'Parkinsons' : 'Healthy',
    confidence: Math.min(0.99, Math.max(0.5, confidence)),
    classifier_votes: classifiers,
    probabilities: {
      Parkinsons: isParkinsons ? 0.65 + Math.random() * 0.25 : 0.2 + Math.random() * 0.2,
      Healthy: isParkinsons ? 0.2 + Math.random() * 0.2 : 0.65 + Math.random() * 0.25,
    },
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const flaskUrl = process.env.FLASK_API_URL?.replace(/\/$/, '')
    if (flaskUrl) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15_000)
      try {
        const res = await fetch(`${flaskUrl}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        })
        const data = (await res.json()) as FlaskPredictResponse
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error ?? 'Flask prediction failed', detail: data.detail },
            { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
          )
        }
        if (!data.prediction) {
          return NextResponse.json({ error: 'Invalid response from model service' }, { status: 502 })
        }
        return NextResponse.json({
          prediction: data.prediction,
          classifier_votes: data.classifier_votes ?? { XGBoost: data.prediction },
          probabilities: data.probabilities ?? {},
          primary: data.primary,
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        const aborted = e instanceof Error && e.name === 'AbortError'
        return NextResponse.json(
          {
            error: aborted ? 'Model service timeout' : 'Model service unreachable',
            detail: message,
          },
          { status: 502 }
        )
      } finally {
        clearTimeout(timeout)
      }
    }

    return NextResponse.json(mockPredict(body as Record<string, number>))
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 })
  }
}
