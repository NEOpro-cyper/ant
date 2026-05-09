import { NextRequest, NextResponse } from 'next/server'

const V17_GATE = 'https://gate.flicky.host/v17'
const V4_GATE = 'https://gate.flicky.host/v4'
const SUB_API = 'https://sub.vdrk.site/v1'

interface StreamSource {
  server: string
  language?: string
  url: string
  headers?: Record<string, string>
  qualities?: string[]
}

interface SubtitleTrack {
  label: string
  file: string
}

interface MovieResponse {
  type: 'movie'
  tmdb_id: string
  servers: {
    tik: StreamSource | null
    v4: StreamSource[]
  }
  subtitles: SubtitleTrack[]
}

async function fetchV17(id: string): Promise<StreamSource | null> {
  try {
    const res = await fetch(`${V17_GATE}/movie/${id}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.stream?.url) return null
    return {
      server: 'Tik',
      url: data.stream.url,
      headers: { Referer: 'https://meowtv.ru/' },
      qualities: ['720p', '1080p'],
    }
  } catch {
    return null
  }
}

async function fetchV4(id: string): Promise<StreamSource[]> {
  try {
    const res = await fetch(`${V4_GATE}/movie/${id}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    if (!data?.streams || !Array.isArray(data.streams)) return []
    return data.streams.map((s: { language?: string; url: string; headers?: Record<string, string> }) => ({
      server: 'V4',
      language: s.language || 'Unknown',
      url: s.url,
      headers: s.headers || {},
      qualities: ['360p', '480p', '720p', '1080p'],
    }))
  } catch {
    return []
  }
}

async function fetchSubtitles(id: string): Promise<SubtitleTrack[]> {
  try {
    const res = await fetch(`${SUB_API}/movie/${id}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data
      .filter((s: { label?: string; file?: string }) => s.label && s.file)
      .map((s: { label: string; file: string }) => ({ label: s.label, file: s.file }))
  } catch {
    return []
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid TMDB ID. Must be a number.' }, { status: 400 })
  }

  const [tik, v4, subtitles] = await Promise.all([
    fetchV17(id),
    fetchV4(id),
    fetchSubtitles(id),
  ])

  const response: MovieResponse = {
    type: 'movie',
    tmdb_id: id,
    servers: {
      tik,
      v4,
    },
    subtitles,
  }

  return NextResponse.json(response)
}
