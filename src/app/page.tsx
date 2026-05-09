'use client'

import { useState } from 'react'
import Link from 'next/link'

type MediaType = 'movie' | 'tv'

export default function Home() {
  const [mediaType, setMediaType] = useState<MediaType>('tv')
  const [tmdbId, setTmdbId] = useState('202555')
  const [season, setSeason] = useState('1')
  const [episode, setEpisode] = useState('1')

  const playUrl = mediaType === 'movie'
    ? `/play/movie/${tmdbId}`
    : `/play/tv/${tmdbId}/${season}/${episode}`

  const apiPreviewUrl = mediaType === 'movie'
    ? `/api/movie/${tmdbId}`
    : `/api/tv/${tmdbId}/${season}/${episode}`

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-bold text-white text-sm">M</div>
          <div>
            <h1 className="text-lg font-bold text-white">MeowTV Stream</h1>
            <p className="text-xs text-zinc-400">Video player + streaming API</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero / Player Launch */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white mb-2">Watch Now</h2>
          <p className="text-zinc-400 text-sm mb-6">Enter a TMDB ID and jump straight into the full-featured video player.</p>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMediaType('movie')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mediaType === 'movie' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Movie
            </button>
            <button
              onClick={() => setMediaType('tv')}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mediaType === 'tv' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              TV Show
            </button>
          </div>

          {/* Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">TMDB ID</label>
              <input
                type="text"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 202555"
                className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
              />
            </div>
            {mediaType === 'tv' && (
              <>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Season</label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value.replace(/\D/g, ''))}
                    placeholder="1"
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Episode</label>
                  <input
                    type="text"
                    value={episode}
                    onChange={(e) => setEpisode(e.target.value.replace(/\D/g, ''))}
                    placeholder="1"
                    className="w-full px-4 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition"
                  />
                </div>
              </>
            )}
          </div>

          {/* Quick Picks */}
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-xs text-zinc-500 self-center">Quick:</span>
            <button onClick={() => { setMediaType('tv'); setTmdbId('202555'); setSeason('1'); setEpisode('1') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition border border-zinc-700/50">
              Daredevil: Born Again S1E1
            </button>
            <button onClick={() => { setMediaType('tv'); setTmdbId('1396'); setSeason('1'); setEpisode('1') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition border border-zinc-700/50">
              Breaking Bad S1E1
            </button>
            <button onClick={() => { setMediaType('tv'); setTmdbId('1399'); setSeason('1'); setEpisode('1') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition border border-zinc-700/50">
              Game of Thrones S1E1
            </button>
            <button onClick={() => { setMediaType('movie'); setTmdbId('572802') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition border border-zinc-700/50">
              Aquaman
            </button>
            <button onClick={() => { setMediaType('tv'); setTmdbId('76479'); setSeason('1'); setEpisode('1') }}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-orange-400 hover:bg-zinc-700 transition border border-zinc-700/50">
              The Boys S1E1
            </button>
          </div>

          {/* Launch Buttons */}
          <div className="flex gap-3 flex-wrap">
            <Link
              href={playUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/20"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
              Open Player
            </Link>
            <a
              href={apiPreviewUrl}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm border border-zinc-700/50 transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5"><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              View JSON API
            </a>
          </div>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: '🎬', title: 'HLS.js Playback', desc: 'Full HLS m3u8 support with adaptive bitrate streaming and quality selection' },
            { icon: '🔀', title: 'Server Switching', desc: 'Switch between Tik (V17) and V4 multi-language servers on the fly' },
            { icon: '💬', title: '60+ Subtitles', desc: 'VTT subtitle tracks in 60+ languages loaded dynamically' },
            { icon: '📺', title: 'Episode Picker', desc: 'Sidebar with episode thumbnails, titles, and runtime from TMDB' },
            { icon: '⌨️', title: 'Keyboard Shortcuts', desc: 'Space/K=play, F=fullscreen, M=mute, arrows=seek/volume, L=lock, C=captions' },
            { icon: '📱', title: 'Mobile Gestures', desc: 'Double-tap to skip, swipe controls, touch-friendly UI' },
            { icon: '🔒', title: 'Lock Mode', desc: 'Lock controls to prevent accidental touches during playback' },
            { icon: '🖼️', title: 'Picture-in-Picture', desc: 'Pop out the video into a floating window while browsing' },
            { icon: '⚡', title: 'Speed Control', desc: '0.5x to 2x playback speed adjustment' },
          ].map(f => (
            <div key={f.title} className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* API Reference */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-orange-400 mb-4">API Reference</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="shrink-0 px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">GET</span>
              <div>
                <code className="text-sm text-zinc-200">/api/movie/<span className="text-orange-400">{'{tmdb_id}'}</span></code>
                <p className="text-xs text-zinc-500 mt-1">Movie streams + subtitles</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="shrink-0 px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">GET</span>
              <div>
                <code className="text-sm text-zinc-200">/api/tv/<span className="text-orange-400">{'{tmdb_id}'}</span>/<span className="text-orange-400">{'{season}'}</span>/<span className="text-orange-400">{'{episode}'}</span></code>
                <p className="text-xs text-zinc-500 mt-1">TV episode streams + subtitles</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 mt-8">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-xs text-zinc-600">
          Sources: gate.flicky.host (V17 + V4) &middot; sub.vdrk.site &middot; cdn.1shows.app &middot; TMDB
        </div>
      </footer>
    </div>
  )
}
