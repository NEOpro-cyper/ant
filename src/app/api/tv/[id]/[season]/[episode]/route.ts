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

interface TVResponse {
  type: 'tv'
  tmdb_id: string
  season: number
  episode: number
  servers: {
    tik: StreamSource | null
    v4: StreamSource[]
  }
  subtitles: SubtitleTrack[]
}

async function fetchV17(id: string, season: string, episode: string): Promise<StreamSource | null> {
  try {
    const res = await fetch(`${V17_GATE}/tv/${id}/${season}/${episode}`, { signal: AbortSignal.timeout(8000) })
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

async function fetchV4(id: string, season: string, episode: string): Promise<StreamSource[]> {
  try {
    const res = await fetch(`${V4_GATE}/tv/${id}/${season}/${episode}`, { signal: AbortSignal.timeout(8000) })
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

async function fetchSubtitles(id: string, season: string, episode: string): Promise<SubtitleTrack[]> {
  try {
    const res = await fetch(`${SUB_API}/tv/${id}/${season}/${episode}`, { signal: AbortSignal.timeout(8000) })
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
  { params }: { params: Promise<{ id: string; season: string; episode: string }> }
) {
  const { id, season, episode } = await params

  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: 'Invalid TMDB ID. Must be a number.' }, { status: 400 })
  }
  if (!season || !/^\d+$/.test(season)) {
    return NextResponse.json({ error: 'Invalid season number.' }, { status: 400 })
  }
  if (!episode || !/^\d+$/.test(episode)) {
    return NextResponse.json({ error: 'Invalid episode number.' }, { status: 400 })
  }

  const [tik, v4, subtitles] = await Promise.all([
    fetchV17(id, season, episode),
    fetchV4(id, season, episode),
    fetchSubtitles(id, season, episode),
  ])

  const response: TVResponse = {
    type: 'tv',
    tmdb_id: id,
    season: Number(season),
    episode: Number(episode),
    servers: {
      tik,
      v4,
    },
    subtitles,
  }

  return NextResponse.json(response)
}
