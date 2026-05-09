'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import VideoPlayer from '@/components/player/video-player'

interface EpisodeItem {
  episode_number: number
  name: string
  overview?: string
  still_path?: string | null
  runtime?: number
}

interface ShowData {
  name: string
  overview?: string
  backdrop_path?: string | null
  seasons?: { season_number: number; episode_count: number }[]
}

interface ImagesData {
  logos?: { file_path: string; vote_average: number }[]
}

interface SeasonData {
  episodes: EpisodeItem[]
}

export default function TVPlayPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const season = Number(params.season)
  const episode = Number(params.episode)

  const [showData, setShowData] = useState<ShowData | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([])
  const [logoUrl, setLogoUrl] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${id}?api_key=adc48d20c0956934fb224de5c40bb85d&language=en-US`
        )
        if (res.ok) {
          const data = await res.json()
          setShowData(data)
        }
      } catch {}
    }
    const fetchSeason = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${id}/season/${season}?api_key=adc48d20c0956934fb224de5c40bb85d&language=en-US`
        )
        if (res.ok) {
          const data: SeasonData = await res.json()
          setEpisodes(data.episodes || [])
        }
      } catch {}
    }
    const fetchLogo = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/tv/${id}/images?api_key=adc48d20c0956934fb224de5c40bb85d&language=en-US&include_image_language=en,null`
        )
        if (res.ok) {
          const data: ImagesData = await res.json()
          const enLogos = data.logos?.filter(l => l.vote_average > 0) || []
          const best = enLogos.length ? enLogos[0] : data.logos?.[0]
          if (best) setLogoUrl(`https://image.tmdb.org/t/p/w500${best.file_path}`)
        }
      } catch {}
    }

    Promise.all([fetchShow(), fetchSeason(), fetchLogo()]).finally(() => setLoading(false))
  }, [id, season])

  const handleEpisodeChange = (newSeason: number, newEpisode: number) => {
    router.push(`/play/tv/${id}/${newSeason}/${newEpisode}`)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <VideoPlayer
        type="tv"
        tmdbId={id}
        title={showData?.name || `TV Show ${id}`}
        poster={showData?.backdrop_path ? `https://image.tmdb.org/t/p/original${showData.backdrop_path}` : undefined}
        overview={showData?.overview}
        logoUrl={logoUrl}
        season={season}
        episode={episode}
        totalEpisodes={episodes.length}
        episodes={episodes}
        onEpisodeChange={handleEpisodeChange}
      />
    </div>
  )
}
