'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import VideoPlayer from '@/components/player/video-player'

interface MovieData {
  title: string
  overview?: string
  backdrop_path?: string | null
}

export default function MoviePlayPage() {
  const params = useParams()
  const id = params.id as string

  const [movieData, setMovieData] = useState<MovieData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=adc48d20c0956934fb224de5c40bb85d&language=en-US`
        )
        if (res.ok) {
          const data = await res.json()
          setMovieData(data)
        }
      } catch {}
      setLoading(false)
    }
    fetchMovie()
  }, [id])

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
        type="movie"
        tmdbId={id}
        title={movieData?.title || `Movie ${id}`}
        poster={movieData?.backdrop_path ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}` : undefined}
        overview={movieData?.overview}
      />
    </div>
  )
}
