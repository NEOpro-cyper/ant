'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import Hls from 'hls.js'

/* ───── Types ───── */
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

interface EpisodeItem {
  episode_number: number
  name: string
  overview?: string
  still_path?: string | null
  runtime?: number
}

interface VideoPlayerProps {
  type: 'movie' | 'tv'
  tmdbId: string
  title: string
  poster?: string
  overview?: string
  logoUrl?: string
  season?: number
  episode?: number
  totalEpisodes?: number
  episodes?: EpisodeItem[]
  onEpisodeChange?: (season: number, episode: number) => void
  startAt?: number
}

/* ───── Language to ISO code mapping ───── */
const LANG_CODE_MAP: Record<string, string> = {
  english: 'en', arabic: 'ar', french: 'fr', spanish: 'es', german: 'de',
  italian: 'it', portuguese: 'pt', russian: 'ru', japanese: 'ja', korean: 'ko',
  chinese: 'zh', hindi: 'hi', turkish: 'tr', thai: 'th', vietnamese: 'vi',
  indonesian: 'id', malay: 'ms', polish: 'pl', dutch: 'nl', swedish: 'sv',
  norwegian: 'no', danish: 'da', finnish: 'fi', greek: 'el', czech: 'cs',
  romanian: 'ro', hungarian: 'hu', ukrainian: 'uk', hebrew: 'he', bengali: 'bn',
  tamil: 'ta', telugu: 'te', malayalam: 'ml', kannada: 'kn', filipino: 'ph',
  persian: 'ir', urdu: 'pk', swahili: 'ke', bulgarian: 'bg', croatian: 'hr',
  serbian: 'rs', slovak: 'sk', slovenian: 'si', lithuanian: 'lt', latvian: 'lv',
  estonian: 'ee', catalan: 'ca', basque: 'eu', galician: 'gl', welsh: 'gb',
  irish: 'ie', icelandic: 'is', albanian: 'al', macedonian: 'mk', georgian: 'ge',
  armenian: 'am', azerbaijani: 'az', kazakh: 'kz', mongolian: 'mn', nepali: 'np',
  sinhala: 'lk', khmer: 'kh', lao: 'la', burmese: 'mm', javanese: 'jv',
}

function getLangCode(label: string): string {
  const lower = label.toLowerCase().trim()
  for (const [name, code] of Object.entries(LANG_CODE_MAP)) {
    if (lower.includes(name)) return code
  }
  return lower.substring(0, 2).toLowerCase()
}

/* ───── Multi-style Icon Factory ───── */
type IconName = 'ArrowLeft'|'Play'|'Pause'|'Rewind10'|'Forward10'|'Volume'|'VolumeMute'|'Episodes'|'Subtitles'|'Pip'|'Settings'|'Fullscreen'|'Minimize'|'Lock'|'Unlock'|'Check'|'Image'|'PlayCircle'|'Cloud'|'Pen'|'ZoomIn'|'Refresh'|'Palette'|'CircleX'|'ChevronLeft'|'ChevronRight'|'ChevronDown'|'UsersGroup'|'Cast'

const S = (d: string, cls: string) => <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24"><path fill="currentColor" d={d}/></svg>
const O = (d: string, cls: string, sw = 1.5) => <svg xmlns="http://www.w3.org/2000/svg" className={cls} viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={d}/></svg>

/* Solar Filled (current default) */
const SF: Record<IconName, string> = {
  ArrowLeft:'M20 12H4m0 0l6-6m-6 6l6 6', Play:'M21.409 9.353a2.998 2.998 0 0 1 0 5.294L8.597 21.614C6.534 22.737 4 21.277 4 18.968V5.033c0-2.31 2.534-3.769 4.597-2.648z',
  Pause:'M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm6 0a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  Rewind10:'M1 4v16l7-8zm10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Forward10:'M23 4v16l-7-8zm-10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Volume:'M3 9v6h4l5 5V4L7 9zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z',
  VolumeMute:'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9zM12 4l-2.1 2.1L12 8.2z',
  Episodes:'M4 6h16M4 12h16M4 18h8', Subtitles:'M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm-9 9H6v-2h5zm7 0h-5v-2h5zm0 4H6v-2h12z',
  Pip:'M19 11h-8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z M21 3H3a2 2 0 0 0-2 2v3h2V5h18v14h-7v2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z',
  Settings:'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
  Fullscreen:'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  Minimize:'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z',
  Lock:'M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9zm3 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  Unlock:'M18 8h-1V6A5 5 0 0 0 7.22 4.72l1.42 1.42A3 3 0 0 1 11 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-6 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  Check:'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  Image:'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5zM8.5 8.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z',
  PlayCircle:'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z',
  Cloud:'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
  Pen:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z',
  ZoomIn:'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM12 10h-2v2h-1v-2H7V9h2V7h1v2h2z',
  Refresh:'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z',
  Palette:'M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2.5 2.5 0 0 0 2.18-3.71 2.5 2.5 0 0 1 2.17-3.64h1.15A4.5 4.5 0 0 0 22 10.15C22 5.59 17.52 2.13 12 2zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  CircleX:'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.59-13L12 10.59 8.41 7 7 8.41 10.59 12 7 15.59 8.41 17 12 13.41 15.59 17 17 15.59 13.41 12 17 8.41z',
  ChevronLeft:'M15 19l-7-7 7-7', ChevronRight:'M9 4l8 8-8 8', ChevronDown:'M7 10l5 5 5-5',
  UsersGroup:'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  Cast:'M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z',
}

/* Solar Outline */
const SO: Record<IconName, string> = {
  ArrowLeft:'M20 12H4m0 0l6-6m-6 6l6 6', Play:'M6 4l15 8-15 8z', Pause:'M6 4h4v16H6zM14 4h4v16h-4z',
  Rewind10:'M1 4v16l7-8zm10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Forward10:'M23 4v16l-7-8zm-10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Volume:'M3 9v6h4l5 5V4L7 9zm10 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z',
  VolumeMute:'M3 9v6h4l5 5V4L7 9zm12.5 3l4-4m0 0l4 4m-4-4v8',
  Episodes:'M4 6h16M4 12h16M4 18h8', Subtitles:'M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM6 16h5M15 16h3M6 12h12',
  Pip:'M19 11h-8a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3M3 19a2 2 0 0 0 2 2h5',
  Settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  Fullscreen:'M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z',
  Minimize:'M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z',
  Lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4m-4 4v2', Unlock:'M8 11V7a4 4 0 0 1 7.45-2M5 11h14v10H5zM12 15v2',
  Check:'M5 13l4 4L19 7', Image:'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2.5 9 3.5-4.5 2.5 3L14.5 9l4 7',
  PlayCircle:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM10 8l6 4-6 4z',
  Cloud:'M6.5 19a4.5 4.5 0 1 1 .43-8.97A5.5 5.5 0 0 1 17.5 10h.5a3.5 3.5 0 0 1 0 7h-1',
  Pen:'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5zM15 5l4 4', ZoomIn:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6',
  Refresh:'M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15',
  Palette:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm3-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm5 2a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm2 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  CircleX:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 8l8 8M16 8l-8 8',
  ChevronLeft:'M15 19l-7-7 7-7', ChevronRight:'M9 4l8 8-8 8', ChevronDown:'M7 10l5 5 5-5',
  UsersGroup:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  Cast:'M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M2 20h.01',
}

/* Lucide (thin stroke) */
const LC: Record<IconName, string> = {
  ArrowLeft:'M19 12H5m0 0l7-7m-7 7l7 7', Play:'M5 3l14 9-14 9z', Pause:'M6 4v16M18 4v16',
  Rewind10:'M1 4v16l7-8zm10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Forward10:'M23 4v16l-7-8zm-10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Volume:'M11 5L6 9H2v6h4l5 4zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07',
  VolumeMute:'M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6',
  Episodes:'M3 12h18M3 6h18M3 18h12', Subtitles:'M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM7 16h4M15 16h2M7 12h10',
  Pip:'M8 4H6a2 2 0 0 0-2 2v2m0 8v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2M12 11h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
  Settings:'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  Fullscreen:'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  Minimize:'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3',
  Lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', Unlock:'M8 11V7a4 4 0 0 1 8 0',
  Check:'M20 6L9 17l-5-5', Image:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm9 9l-3 4-2-2-4 5h14z',
  PlayCircle:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM10 8l6 4-6 4V8z',
  Cloud:'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
  Pen:'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z', ZoomIn:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6',
  Refresh:'M1 4v6h6M23 20v-6h-6', Palette:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 9h.01M11 5h.01M16 7h.01M18 11h.01',
  CircleX:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6',
  ChevronLeft:'M15 18l-6-6 6-6', ChevronRight:'M9 18l6-6-6-6', ChevronDown:'M6 9l6 6 6-6',
  UsersGroup:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  Cast:'M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M2 20h.01',
}

/* Phosphor (medium-weight stroke) */
const PH: Record<IconName, string> = {
  ArrowLeft:'M20 12H4m0 0l6-6m-6 6l6 6', Play:'M6 3l15 9-15 9z', Pause:'M8 4v16M16 4v16',
  Rewind10:'M1 4v16l7-8zm10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Forward10:'M23 4v16l-7-8zm-10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Volume:'M2 10v4h4l5 5V5L6 10zm12-2.5a5.5 5.5 0 0 1 0 9M16.5 5a9 9 0 0 1 0 14',
  VolumeMute:'M2 10v4h4l5 5V5L6 10zm14.5 2l4 4m0-4l-4 4',
  Episodes:'M3 6h18M3 12h18M3 18h10', Subtitles:'M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM6 16h5M16 16h2M6 12h12',
  Pip:'M8 4H6a2 2 0 0 0-2 2v2m0 8v2a2 2 0 0 0 2 2h2m8-16h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2M11 11h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z',
  Settings:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  Fullscreen:'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  Minimize:'M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3',
  Lock:'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4', Unlock:'M8 11V7a4 4 0 0 1 8 0M5 11h14v10H5z',
  Check:'M4 12l5 5L20 7', Image:'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2.5 9 3.5-4.5 2.5 3L14.5 9l4 7',
  PlayCircle:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM10 8l6 4-6 4V8z',
  Cloud:'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
  Pen:'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z', ZoomIn:'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6',
  Refresh:'M1 4v6h6M23 20v-6h-6', Palette:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM8 9h.01M11 5h.01M16 7h.01M18 11h.01',
  CircleX:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM15 9l-6 6M9 9l6 6',
  ChevronLeft:'M15 18l-6-6 6-6', ChevronRight:'M9 18l6-6-6-6', ChevronDown:'M6 9l6 6 6-6',
  UsersGroup:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  Cast:'M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2M2 20h.01',
}

/* Heroicons (outline, round) */
const HI: Record<IconName, string> = {
  ArrowLeft:'M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18', Play:'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653z',
  Pause:'M15.75 5.25v13.5m-7.5-13.5v13.5',
  Rewind10:'M1 4v16l7-8zm10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Forward10:'M23 4v16l-7-8zm-10 5v6h1v-6zm2.5 1a2.5 2.5 0 0 1 5 0v4a2.5 2.5 0 0 1-5 0z',
  Volume:'M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
  VolumeMute:'M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z',
  Episodes:'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12', Subtitles:'M7.5 8.25h9m-9 3H12m-7.5 6h12a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5h-12A1.5 1.5 0 0 0 3 6v9.75a1.5 1.5 0 0 0 1.5 1.5z',
  Pip:'M3.75 3.75v4.5m0 8.25v4.5h4.5m8.25 0h4.5v-4.5m0-8.25v-4.5h-4.5m-3.75 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-1.5 1.5h-4.5a1.5 1.5 0 0 1-1.5-1.5v-4.5a1.5 1.5 0 0 1 1.5-1.5z',
  Settings:'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  Fullscreen:'M3.75 3.75v4.5m0 8.25v4.5h4.5m8.25 0h4.5v-4.5m0-8.25v-4.5h-4.5',
  Minimize:'M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25',
  Lock:'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z',
  Unlock:'M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z',
  Check:'M4.5 12.75l6 6 9-13.5', Image:'M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M2.25 18.75a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V5.25a2.25 2.25 0 0 0-2.25-2.25h-15a2.25 2.25 0 0 0-2.25 2.25z',
  PlayCircle:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z',
  Cloud:'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 .75-7.425A5.25 5.25 0 0 0 7.5 9.375 4.5 4.5 0 0 0 2.25 15z',
  Pen:'M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
  ZoomIn:'M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607zM10.5 7.5v6m3-3h-6',
  Refresh:'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182',
  Palette:'M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z',
  CircleX:'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  ChevronLeft:'M15.75 19.5L8.25 12l7.5-7.5', ChevronRight:'M8.25 4.5l7.5 7.5-7.5 7.5', ChevronDown:'M19.5 8.25l-7.5 7.5-7.5-7.5',
  UsersGroup:'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0z',
  Cast:'M3.75 3.75v4.5m0 8.25v4.5h4.5m8.25-17.25h4.5v4.5m-4.5 8.25h2.25a2.25 2.25 0 0 0 2.25-2.25v-2.25M3.75 12h2.25a2.25 2.25 0 0 0 2.25-2.25V7.5',
}

const ICON_DATA: Record<IconSetType, Record<IconName, string>> = {
  'solar-filled': SF, 'solar-outline': SO, 'lucide': LC, 'phosphor': PH, 'heroicons': HI,
}

function I(name: IconName, iconSet: IconSetType, className: string) {
  const data = ICON_DATA[iconSet]?.[name]
  if (!data) return null
  // solar-filled uses fill, the rest use stroke
  if (iconSet === 'solar-filled') return S(data, className)
  const sw = iconSet === 'phosphor' ? 2.5 : iconSet === 'lucide' ? 2 : 1.5
  return O(data, className, sw)
}

/* ───── Helper: format time ───── */

/* ───── Helper: format time ───── */
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ───── Icon Set Type ───── */
type IconSetType = 'solar-filled' | 'solar-outline' | 'lucide' | 'phosphor' | 'heroicons'

const ICON_SET_LABELS: Record<IconSetType, string> = {
  'solar-filled': 'Solar (Filled)',
  'solar-outline': 'Solar (Outline)',
  'lucide': 'Lucide',
  'phosphor': 'Phosphor',
  'heroicons': 'Heroicons',
}

const ALL_ICON_SETS: IconSetType[] = ['solar-filled', 'solar-outline', 'lucide', 'phosphor', 'heroicons']

/* ───── Settings sub-menu type ───── */
type SettingsSubMenu = null | 'quality' | 'speed' | 'server' | 'zoom' | 'boost' | 'icons'

/* ───── Main Component ───── */
export default function VideoPlayer({
  type, tmdbId, title, poster, overview, logoUrl,
  season, episode, episodes = [], onEpisodeChange, startAt,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>()
  const seekBarRef = useRef<HTMLDivElement>(null)
  const episodeScrollRef = useRef<HTMLDivElement>(null)
  const isSeeking = useRef(false)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [locked, setLocked] = useState(false)
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showEpisodeSidebar, setShowEpisodeSidebar] = useState(false)
  const [seekFeedback, setSeekFeedback] = useState<{ dir: number; amount: number } | null>(null)
  const [settingsSubMenu, setSettingsSubMenu] = useState<SettingsSubMenu>(null)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState<number>(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [videoZoom, setVideoZoom] = useState(100)
  const [volumeBoost, setVolumeBoost] = useState(100)
  const [autoPlay, setAutoPlay] = useState(true)
  const [showNextEpNotif, setShowNextEpNotif] = useState(false)
  const [nextEpCountdown, setNextEpCountdown] = useState(30)
  const [doubleTapRipple, setDoubleTapRipple] = useState<{ side: 'left' | 'right'; amount: number } | null>(null)
  const [iconSet, setIconSet] = useState<IconSetType>('solar-filled')

  const [tikStream, setTikStream] = useState<StreamSource | null>(null)
  const [v4Streams, setV4Streams] = useState<StreamSource[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([])
  const [activeServer, setActiveServer] = useState<string>('tik')
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1)
  const [activeQuality, setActiveQuality] = useState<number>(-1)
  const [availableQualities, setAvailableQualities] = useState<{ height: number; bitrate: number; label: string }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')
  const [fallbackToast, setFallbackToast] = useState<string | null>(null)
  const [activeCue, setActiveCue] = useState<string>('')
  const failedServersRef = useRef<Set<string>>(new Set())
  const subtitleCuesRef = useRef<{ start: number; end: number; text: string }[]>([])
  const hlsErrorCountRef = useRef(0)

  const allServers = useMemo(() => [
    ...(tikStream ? [{ id: 'tik', label: 'Tik' }] : []),
    ...v4Streams.map((s, i) => ({ id: `v4-${i}`, label: `V4 \u2022 ${s.language}` })),
  ], [tikStream, v4Streams])

  const currentStreamUrl = activeServer === 'tik'
    ? tikStream?.url : v4Streams[parseInt(activeServer.split('-')[1])]?.url
  const currentHeaders = activeServer === 'tik'
    ? tikStream?.headers : v4Streams[parseInt(activeServer.split('-')[1])]?.headers

  /* ── Fetch stream data ── */
  useEffect(() => {
    let cancelled = false
    setDataLoading(true); setError('')
    fetch(type === 'tv' ? `/api/tv/${tmdbId}/${season || 1}/${episode || 1}` : `/api/movie/${tmdbId}`)
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json() })
      .then(data => {
        if (cancelled) return
        setTikStream(data.servers?.tik || null)
        setV4Streams(data.servers?.v4 || [])
        setSubtitles(data.subtitles || [])
        setActiveServer(data.servers?.tik ? 'tik' : (data.servers?.v4?.length ? 'v4-0' : 'tik'))
        setDataLoading(false)
      })
      .catch(err => { if (!cancelled) { setError(err.message); setDataLoading(false) } })
    return () => { cancelled = true }
  }, [type, tmdbId, season, episode])

  /* ── Initialize HLS ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video || !currentStreamUrl) return
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    const isM3u8 = currentStreamUrl.includes('.m3u8')
    if (isM3u8 && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          if (currentHeaders) {
            Object.entries(currentHeaders).forEach(([k, v]) => {
              try { xhr.setRequestHeader(k, v) } catch {}
            })
          }
        },
        startLevel: -1,
        capLevelToPlayerSize: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hls.loadSource(currentStreamUrl)
      hls.attachMedia(video)
      hlsRef.current = hls
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setAvailableQualities(data.levels.map((l, i) => ({
          height: l.height, bitrate: l.bitrate,
          label: l.height ? `${l.height}p` : `Level ${i}`,
        })))
        setLoading(false)
      })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          hlsErrorCountRef.current++
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && hlsErrorCountRef.current <= 3) {
            hls.startLoad()
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
          } else {
            // Fatal error - try fallback server
            failedServersRef.current.add(activeServer)
            const nextServer = allServers.find(s => !failedServersRef.current.has(s.id))
            if (nextServer) {
              setFallbackToast(`Server down, switching to ${nextServer.label}...`)
              setTimeout(() => setFallbackToast(null), 3000)
              switchServer(nextServer.id)
            } else {
              setError('All servers failed. Please try again later.')
              hls.destroy()
            }
          }
        }
      })
    } else if (isM3u8 && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = currentStreamUrl
      setLoading(false)
    } else if (!isM3u8) {
      video.src = currentStreamUrl
      setLoading(false)
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null } }
  }, [currentStreamUrl, currentHeaders])

  /* ── Subtitles (custom renderer: fetch VTT, parse cues, render as HTML overlay) ── */
  useEffect(() => {
    if (activeSubtitle < 0 || !subtitles[activeSubtitle]) {
      subtitleCuesRef.current = []
      setActiveCue('')
      return
    }
    const url = subtitles[activeSubtitle].file
    let cancelled = false
    fetch(url)
      .then(r => r.text())
      .then(vtt => {
        if (cancelled) return
        const cues: { start: number; end: number; text: string }[] = []
        const lines = vtt.split('\n')
        let i = 0
        while (i < lines.length) {
          const line = lines[i].trim()
          // Match timestamp line: 00:01:23.456 --> 00:01:25.789
          const tsMatch = line.match(/(\d{0,2}:?\d{2}:\d{2})\.?\d*\s*-->\s*(\d{0,2}:?\d{2}:\d{2})\.?\d*/)
          if (tsMatch) {
            const start = parseVttTime(tsMatch[1])
            const end = parseVttTime(tsMatch[2])
            const textLines: string[] = []
            i++
            while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
              textLines.push(lines[i].trim())
              i++
            }
            if (textLines.length > 0) {
              cues.push({ start, end, text: textLines.join('\n') })
            }
            continue
          }
          i++
        }
        subtitleCuesRef.current = cues
      })
      .catch(() => {
        subtitleCuesRef.current = []
      })
    return () => { cancelled = true }
  }, [activeSubtitle, subtitles])

  /* Update active subtitle cue based on currentTime */
  useEffect(() => {
    if (activeSubtitle < 0 || subtitleCuesRef.current.length === 0) {
      if (activeCue) setActiveCue('')
      return
    }
    const t = currentTime
    const cue = subtitleCuesRef.current.find(c => t >= c.start && t <= c.end)
    const text = cue ? cue.text : ''
    if (text !== activeCue) setActiveCue(text)
  }, [currentTime, activeSubtitle])

function parseVttTime(s: string): number {
  const parts = s.split(':')
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])
  }
  return Number(parts[0]) * 60 + Number(parts[1])
}

  /* ── Start at position ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video || !startAt || startAt <= 5) return
    const h = () => { video.currentTime = startAt; video.removeEventListener('loadedmetadata', h) }
    video.addEventListener('loadedmetadata', h)
    return () => video.removeEventListener('loadedmetadata', h)
  }, [startAt])

  /* ── Quality ── */
  useEffect(() => {
    if (!hlsRef.current) return
    hlsRef.current.currentLevel = activeQuality
  }, [activeQuality])

  /* ── Volume boost via Web Audio API ── */
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (volumeBoost > 100) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext()
          const source = audioCtxRef.current.createMediaElementSource(video)
          gainNodeRef.current = audioCtxRef.current.createGain()
          source.connect(gainNodeRef.current)
          gainNodeRef.current.connect(audioCtxRef.current.destination)
        }
        if (gainNodeRef.current) gainNodeRef.current.gain.value = volumeBoost / 100
      } catch {}
    } else {
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1
    }
  }, [volumeBoost])

  /* ── Video events ── */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const on = (e: string, fn: () => void) => v.addEventListener(e, fn)
    const off = (e: string, fn: () => void) => v.removeEventListener(e, fn)
    const playFn = () => setPlaying(true)
    const pauseFn = () => setPlaying(false)
    const timeFn = () => {
      if (!isSeeking.current) setCurrentTime(v.currentTime)
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    const durFn = () => setDuration(v.duration)
    const waitFn = () => setLoading(true)
    const canFn = () => setLoading(false)
    const volFn = () => { setVolume(v.volume); setMuted(v.muted) }
    on('play', playFn); on('pause', pauseFn); on('timeupdate', timeFn)
    on('durationchange', durFn); on('waiting', waitFn); on('canplay', canFn); on('volumechange', volFn)
    return () => {
      off('play', playFn); off('pause', pauseFn); off('timeupdate', timeFn)
      off('durationchange', durFn); off('waiting', waitFn); off('canplay', canFn); off('volumechange', volFn)
    }
  }, [])

  /* ── Auto-play next episode countdown ── */
  useEffect(() => {
    if (!autoPlay || type !== 'tv' || !playing) { setShowNextEpNotif(false); return }
    const remaining = duration - currentTime
    if (remaining > 0 && remaining <= 30 && duration > 60) {
      setShowNextEpNotif(true)
      setNextEpCountdown(Math.ceil(remaining))
    } else {
      setShowNextEpNotif(false)
    }
  }, [currentTime, duration, autoPlay, type, playing])

  useEffect(() => {
    if (!showNextEpNotif || nextEpCountdown <= 0) return
    const timer = setTimeout(() => {
      if (nextEpCountdown <= 1 && onEpisodeChange && episode && episodes.length > 0) {
        const nextEp = episode + 1
        if (nextEp <= episodes.length) {
          onEpisodeChange(season || 1, nextEp)
        }
      } else {
        setNextEpCountdown(c => c - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [showNextEpNotif, nextEpCountdown])

  /* ── Action functions ── */
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (v) { if (v.paused) v.play().catch(() => {}); else v.pause() }
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen()
  }, [])

  const togglePip = useCallback(async () => {
    const v = videoRef.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch {}
  }, [])

  /* ── Controls auto-hide (MeowTV: opacity drops to ~0.1, not fully hidden) ── */
  const showControls = useCallback(() => {
    setControlsVisible(true)
    clearTimeout(controlsTimer.current)
    if (playing && !showSettingsMenu && !showSubtitleMenu && !showEpisodeSidebar) {
      controlsTimer.current = setTimeout(() => setControlsVisible(false), 3000)
    }
  }, [playing, showSettingsMenu, showSubtitleMenu, showEpisodeSidebar])

  useEffect(() => {
    if (!playing) {
      setControlsVisible(true)
      clearTimeout(controlsTimer.current)
    } else {
      showControls()
    }
  }, [playing, showControls])

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', h)
    return () => document.removeEventListener('fullscreenchange', h)
  }, [])

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break
        case 'ArrowLeft': e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10); setSeekFeedback({ dir: -1, amount: 10 }); setTimeout(() => setSeekFeedback(null), 600); break
        case 'ArrowRight': e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); setSeekFeedback({ dir: 1, amount: 10 }); setTimeout(() => setSeekFeedback(null), 600); break
        case 'ArrowUp': e.preventDefault(); v.volume = Math.min(1, v.volume + 0.1); break
        case 'ArrowDown': e.preventDefault(); v.volume = Math.max(0, v.volume - 0.1); break
        case 'f': e.preventDefault(); toggleFullscreen(); break
        case 'm': e.preventDefault(); v.muted = !v.muted; break
        case 'l': e.preventDefault(); setLocked(l => !l); break
        case 'c': case 'C': e.preventDefault(); setActiveSubtitle(s => s >= 0 ? -1 : 0); break
        case 'Escape':
          if (showSettingsMenu || showSubtitleMenu || showEpisodeSidebar) {
            setShowSettingsMenu(false); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null)
          }
          break
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [togglePlay, toggleFullscreen, showSettingsMenu, showSubtitleMenu, showEpisodeSidebar])

  const skip = useCallback((s: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + s))
    setSeekFeedback({ dir: s > 0 ? 1 : -1, amount: Math.abs(s) })
    setTimeout(() => setSeekFeedback(null), 600)
  }, [])

  const switchServer = useCallback((id: string) => {
    setActiveServer(id)
    hlsErrorCountRef.current = 0
    const v = videoRef.current
    if (v) {
      const t = v.currentTime
      const p = !v.paused
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = t
          if (p) videoRef.current.play().catch(() => {})
        }
      }, 500)
    }
  }, [])

  /* ── Mobile double-tap with animated ripple ── */
  const lastTap = useRef<{ time: number; side: string } | null>(null)
  const handleTap = useCallback((side: 'left' | 'right') => {
    const now = Date.now()
    if (lastTap.current && now - lastTap.current.time < 300 && lastTap.current.side === side) {
      const seekAmount = side === 'left' ? -10 : 10
      if (!locked) skip(seekAmount)
      setDoubleTapRipple({ side, amount: Math.abs(seekAmount) })
      setTimeout(() => setDoubleTapRipple(null), 700)
      lastTap.current = null
    } else {
      lastTap.current = { time: now, side }
    }
  }, [locked, skip])

  /* ── Click outside to close menus ── */
  /* Uses mousedown instead of click so the handler fires BEFORE React re-renders
     and detaches the clicked button from the DOM — which would make closest() fail */
  useEffect(() => {
    if (!showSettingsMenu && !showSubtitleMenu && !showEpisodeSidebar) return
    const handleDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-player-menu]')) {
        setShowSettingsMenu(false); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null)
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleDown), 100)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleDown) }
  }, [showSettingsMenu, showSubtitleMenu, showEpisodeSidebar])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  /* ── Seek bar ── */
  const handleSeekBarHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = Math.max(0, Math.min(1, x / rect.width))
    setHoverTime(pct * duration)
    setHoverX(x)
  }

  const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const v = videoRef.current
    if (v && duration > 0) {
      v.currentTime = pct * duration
      setCurrentTime(pct * duration)
    }
  }

  const handleSeekBarTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const touch = e.touches[0]
    const pct = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
    const v = videoRef.current
    if (v && duration > 0) {
      isSeeking.current = true
      v.currentTime = pct * duration
      setCurrentTime(pct * duration)
    }
  }

  /* ── Current labels ── */
  const currentQualityLabel = activeQuality === -1 ? 'Auto' : (availableQualities[activeQuality]?.label || 'Auto')
  const currentSpeedLabel = `${playbackSpeed}x`
  const currentServerLabel = allServers.find(s => s.id === activeServer)?.label || 'Tik'

  /* ── Close all menus ── */
  const closeAllMenus = () => {
    setShowSettingsMenu(false); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null)
  }

  /* ── Controls visibility class: MeowTV uses opacity-10 when hidden, not opacity-0 ── */
  const controlsOpacity = controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
  const controlsTransition = 'transition-opacity duration-300'

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={showControls}
    >
      {/* ═══════ LAYER 1: Video ═══════ */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto flex min-h-0 min-w-0 items-center justify-center overflow-hidden"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}>
          <video
            ref={videoRef}
            className="block max-h-full max-w-full transition-transform duration-300"
            playsInline
            crossOrigin="anonymous"
            poster={poster}
            style={{ transform: `scale(${videoZoom / 100})`, objectFit: 'contain', transformOrigin: 'center center', width: '100%', height: '100%' }}
            onClick={() => {
              if (locked) { showControls(); return }
              if (showSettingsMenu || showSubtitleMenu || showEpisodeSidebar) {
                closeAllMenus(); return
              }
              togglePlay()
            }}
          />
        </div>
      </div>

      {/* ═══════ LAYER 2: Double-tap zones (mobile) with animated ripple ═══════ */}
      <div className="absolute left-0 right-0 top-16 bottom-28 z-10 flex pointer-events-none md:hidden">
        <div className="flex-1 pointer-events-auto relative" onTouchEnd={() => handleTap('left')}>
          {doubleTapRipple?.side === 'left' && (
            <div className="absolute inset-0 flex items-center justify-center animate-scale-in">
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                  {I('Rewind10', iconSet, 'h-8 w-8 text-white')}
                </div>
                <span className="text-white text-sm font-medium drop-shadow-lg">-{doubleTapRipple.amount}s</span>
              </div>
            </div>
          )}
        </div>
        <div className="w-32 pointer-events-none" />
        <div className="flex-1 pointer-events-auto relative" onTouchEnd={() => handleTap('right')}>
          {doubleTapRipple?.side === 'right' && (
            <div className="absolute inset-0 flex items-center justify-center animate-scale-in">
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                  {I('Forward10', iconSet, 'h-8 w-8 text-white')}
                </div>
                <span className="text-white text-sm font-medium drop-shadow-lg">+{doubleTapRipple.amount}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ LAYER 3: Top bar ═══════ */}
      <div className={`absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-b from-black/80 to-transparent ${controlsTransition} flex items-center gap-3 ${!locked ? controlsOpacity : 'opacity-0 pointer-events-none'}`}>
        <button aria-label="Back" onClick={() => window.history.back()} className="rounded-full bg-black/40 hover:bg-black/60 transition text-white shrink-0 p-3">
          {I('ArrowLeft', iconSet, '')}
        </button>
        <div className="text-white font-medium drop-shadow line-clamp-1 flex-1 min-w-0 text-lg">
          {title}{type === 'tv' && season && episode ? ` \u2022 S${season} E${episode}` : ''}
        </div>
        <button aria-label="Watch Party" className="rounded-full transition text-white p-3 hover:bg-black/40">
          {I('UsersGroup', iconSet, '')}
        </button>
        <button aria-label="Cast" className="rounded-full hover:bg-black/40 transition text-white p-3">
          {I('Cast', iconSet, '')}
        </button>
      </div>

      {/* ═══════ LAYER 4: Info overlay (logo + description) — only when paused ═══════ */}
      {!locked && !playing && (logoUrl || overview) && (
        <div className="absolute pointer-events-none left-4 sm:left-8 right-1/2 pr-2 bottom-32 sm:bottom-36">
          {logoUrl && <img src={logoUrl} alt={title} className="object-contain drop-shadow-2xl max-h-24 mb-3" />}
          {overview && <p className="text-white/85 text-base leading-relaxed line-clamp-4 drop-shadow-md max-w-2xl">{overview}</p>}
        </div>
      )}

      {/* ═══════ LAYER 5: Lock button — always visible when controls are shown, even when locked ═══════ */}
      <button
        type="button"
        aria-label={locked ? 'Unlock controls' : 'Lock controls'}
        onClick={() => { setLocked(l => !l); showControls() }}
        className={`absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 grid place-items-center rounded-full hover:bg-black/40 text-white ${controlsTransition} p-3.5 ${controlsVisible || locked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {locked ? {I('Lock', iconSet, 'h-9 w-9')} : {I('Unlock', iconSet, 'h-9 w-9')}}
      </button>

      {/* ═══════ LAYER 6: Center play controls — only show when PAUSED ═══════ */}
      {!playing && !locked && (
        <>
          {/* Desktop: large single play button */}
          <div className="absolute inset-0 z-20 items-center justify-center pointer-events-none hidden md:flex">
            <button aria-label="Play" onClick={togglePlay} className="pointer-events-auto grid place-items-center text-white hover:scale-105 transition">
              {I('Play', iconSet, 'h-28 w-28 drop-shadow-2xl')}
            </button>
          </div>
          {/* Mobile: 3-button row */}
          <div className="absolute inset-0 z-20 items-center justify-center gap-10 sm:gap-12 pointer-events-none flex md:hidden">
            <button aria-label="Back 10s" onClick={() => skip(-10)} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              <div className="h-9 w-9 drop-shadow-lg">{I('Rewind10', iconSet, 'h-9 w-9')}</div>
            </button>
            <button aria-label="Play" onClick={togglePlay} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              {I('Play', iconSet, 'h-14 w-14 drop-shadow-lg')}
            </button>
            <button aria-label="Forward 10s" onClick={() => skip(10)} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              <div className="h-9 w-9 drop-shadow-lg">{I('Forward10', iconSet, 'h-9 w-9')}</div>
            </button>
          </div>
        </>
      )}

      {/* Seek feedback overlay */}
      {seekFeedback && !locked && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none animate-scale-in ${seekFeedback.dir < 0 ? 'left-[20%]' : 'right-[20%]'}`}>
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center text-white">
            {seekFeedback.dir < 0 ? {I('Rewind10', iconSet, 'h-8 w-8')} : {I('Forward10', iconSet, 'h-8 w-8')}}
          </div>
          <span className="text-white text-sm font-medium">{seekFeedback.amount}s</span>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ═══════ LAYER 7: Bottom control bar ═══════ */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 p-3 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent ${controlsTransition} ${!locked ? controlsOpacity : 'opacity-0 pointer-events-none'}`}>

        {/* ── Seek Bar ── */}
        <div
          ref={seekBarRef}
          className="group relative h-4 -my-1 mb-2 sm:mb-3 flex items-center touch-none cursor-pointer"
          onMouseMove={handleSeekBarHover}
          onMouseLeave={() => setHoverTime(null)}
          onClick={handleSeekBarClick}
          onTouchMove={handleSeekBarTouch}
          onTouchEnd={() => { isSeeking.current = false }}
        >
          {/* Track bg */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-white/20 rounded-full" />
          {/* Buffer bar */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-white/30 rounded-full transition-[width] duration-150" style={{ width: `${bufferedPct}%` }} />
          {/* Progress */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 sm:h-1.5 bg-primary rounded-full transition-[width] duration-100" style={{ width: `${progressPct}%` }} />
          {/* Thumb */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition shadow-lg" style={{ left: `${progressPct}%` }} />
          {/* Time tooltip on hover */}
          {hoverTime !== null && (
            <div className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap" style={{ left: `${hoverX}px` }}>
              {formatTime(hoverTime)}
            </div>
          )}
          {/* Invisible range input for drag interaction */}
          <input
            type="range" min={0} max={duration || 0} step={0.1} value={currentTime}
            onChange={(e) => {
              const val = Number(e.target.value)
              const v = videoRef.current
              if (v) v.currentTime = val
              setCurrentTime(val)
            }}
            onMouseDown={() => { isSeeking.current = true }}
            onMouseUp={() => { isSeeking.current = false }}
            onTouchStart={() => { isSeeking.current = true }}
            onTouchEnd={() => { isSeeking.current = false }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Seek"
          />
        </div>

        {/* ── Control Buttons Row ── */}
        <div className="flex items-center text-white gap-1 sm:gap-3">
          <button aria-label="Play/Pause" onClick={togglePlay} className="grid place-items-center p-2 sm:p-3 hover:bg-white/10 rounded-full transition">
            {playing ? {I('Pause', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')} : {I('Play', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}}
          </button>
          <button aria-label="Back 10s" onClick={() => skip(-10)} className="hidden sm:grid place-items-center p-3 hover:bg-white/10 rounded-full transition">
            {I('Rewind10', iconSet, '')}
          </button>
          <button aria-label="Forward 10s" onClick={() => skip(10)} className="hidden sm:grid place-items-center p-3 hover:bg-white/10 rounded-full transition">
            {I('Forward10', iconSet, '')}
          </button>
          {/* Volume */}
          <div className="flex items-center gap-2 group/vol">
            <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted }} className="hover:bg-white/10 rounded-full transition p-2 sm:p-3">
              {muted || volume === 0 ? {I('VolumeMute', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')} : {I('Volume', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}}
            </button>
            <div className="w-0 group-hover/vol:w-28 overflow-hidden transition-[width] duration-200">
              <input type="range" min="0" max="1" step="0.05" className="w-28 accent-primary align-middle h-1 cursor-pointer" value={muted ? 0 : volume}
                onChange={(e) => { const v = videoRef.current; if (v) { v.volume = Number(e.target.value); v.muted = Number(e.target.value) === 0 } }} />
            </div>
          </div>
          {/* Time */}
          <div className="tabular-nums ml-1 text-sm sm:text-lg">{formatTime(currentTime)} <span className="opacity-60">/ {formatTime(duration)}</span></div>
          <div className="flex-1" />

          {/* Episodes */}
          {type === 'tv' && episodes.length > 0 && (
            <button aria-label="Episodes" onClick={() => { setShowEpisodeSidebar(s => !s); setShowSettingsMenu(false); setShowSubtitleMenu(false); setSettingsSubMenu(null) }}
              className={`grid place-items-center rounded-full transition p-2 sm:p-3 hover:bg-white/10 ${showEpisodeSidebar ? 'bg-white/15' : ''}`}>
              {I('Episodes', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}
            </button>
          )}
          {/* Subtitles */}
          {subtitles.length > 0 && (
            <button aria-label="Subtitles" onClick={() => { setShowSubtitleMenu(s => !s); setShowSettingsMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null) }}
              className={`grid place-items-center rounded-full transition p-2 sm:p-3 hover:bg-white/10 ${showSubtitleMenu ? 'bg-white/15' : ''}`}>
              {I('Subtitles', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}
            </button>
          )}
          {/* PiP */}
          <button aria-label="PiP" onClick={togglePip} className="hidden sm:grid place-items-center rounded-full hover:bg-white/10 transition p-3">
            {I('Pip', iconSet, '')}
          </button>
          {/* Settings */}
          <button aria-label="Settings" onClick={() => { setShowSettingsMenu(s => !s); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null) }}
            className={`grid place-items-center rounded-full transition p-2 sm:p-3 hover:bg-white/10 ${showSettingsMenu ? 'bg-white/15' : ''}`}>
            {I('Settings', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}
          </button>
          {/* Fullscreen */}
          <button aria-label={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={toggleFullscreen} className="grid place-items-center hover:bg-white/10 rounded-full transition p-2 sm:p-3">
            {fullscreen ? {I('Minimize', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')} : {I('Fullscreen', iconSet, 'h-6 w-6 sm:h-10 sm:w-10')}}
          </button>
        </div>
      </div>

      {/* ═══════ Auto-play next episode notification ═══════ */}
      {showNextEpNotif && !locked && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-20 animate-scale-in">
          <div className="flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
            <div className="w-8 h-8 rounded-full bg-primary/20 grid place-items-center">
              {I('Play', iconSet, 'h-4 w-4 text-primary')}
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Next episode in {nextEpCountdown}s</p>
              <p className="text-muted-foreground text-xs">{episodes[episode]?.name || `Episode ${episode ? episode + 1 : 1}`}</p>
            </div>
            <button onClick={() => setShowNextEpNotif(false)} className="text-muted-foreground hover:text-foreground text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition border border-white/10 ml-2">Cancel</button>
          </div>
        </div>
      )}

      {/* ═══════ SETTINGS POPUP ═══════ */}
      {showSettingsMenu && (
        <div data-player-menu onClick={(e) => e.stopPropagation()} className="absolute bottom-[7.5rem] sm:right-4 left-2 sm:left-auto w-[22rem] max-w-[calc(100vw-1rem)] max-h-[65vh] rounded-2xl animate-scale-in overflow-y-auto scrollbar-none bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground origin-bottom-right z-30">

          {settingsSubMenu === null ? (
            /* ── Main Settings Menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <span className="font-semibold flex-1">Settings</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">
                  {I('CircleX', iconSet, 'h-5 w-5')}
                </button>
              </div>

              <button onClick={() => setSettingsSubMenu('quality')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('Image', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Quality</span>
                <span className="text-muted-foreground">{currentQualityLabel}</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setSettingsSubMenu('speed')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('PlayCircle', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Speed</span>
                <span className="text-muted-foreground">{currentSpeedLabel}</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setSettingsSubMenu('server')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('Cloud', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Server</span>
                <span className="text-muted-foreground">{currentServerLabel}</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setSettingsSubMenu('zoom')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('ZoomIn', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Video</span>
                <span className="text-muted-foreground">{videoZoom}%</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setAutoPlay(a => !a)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('Refresh', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Auto-play</span>
                <span className="text-muted-foreground">{autoPlay ? 'Play \u2022 Next On' : 'Off'}</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setSettingsSubMenu('boost')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('Volume', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Volume boost</span>
                <span className="text-muted-foreground">{volumeBoost}%</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>

              <button onClick={() => setSettingsSubMenu('icons')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                {I('Palette', iconSet, 'h-5 w-5 shrink-0')}
                <span className="flex-1 text-left">Icons Set</span>
                <span className="text-muted-foreground">{ICON_SET_LABELS[iconSet]}</span>
                {I('ChevronRight', iconSet, 'h-4 w-4 text-muted-foreground')}
              </button>
            </>
          ) : settingsSubMenu === 'quality' ? (
            /* ── Quality Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('Image', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Quality</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="py-1">
                <button onClick={() => { setActiveQuality(-1); setSettingsSubMenu(null) }}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                  <span>Auto</span>{activeQuality === -1 && {I('Check', iconSet, '')}}
                </button>
                {availableQualities.map((q, i) => (
                  <button key={i} onClick={() => { setActiveQuality(i); setSettingsSubMenu(null) }}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{q.label} ({Math.round(q.bitrate / 1000)}kbps)</span>{activeQuality === i && {I('Check', iconSet, '')}}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'speed' ? (
            /* ── Speed Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('PlayCircle', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Speed</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="py-1">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(spd => (
                  <button key={spd} onClick={() => {
                    if (videoRef.current) videoRef.current.playbackRate = spd
                    setPlaybackSpeed(spd); setSettingsSubMenu(null)
                  }} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{spd}x</span>{playbackSpeed === spd && {I('Check', iconSet, '')}}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'server' ? (
            /* ── Server Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('Cloud', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Server</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="py-1">
                {allServers.map(s => (
                  <button key={s.id} onClick={() => { switchServer(s.id); setSettingsSubMenu(null) }}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{s.label}</span>{activeServer === s.id && {I('Check', iconSet, '')}}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'zoom' ? (
            /* ── Video Zoom Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('ZoomIn', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Video</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Zoom</span>
                  <span className="text-sm text-muted-foreground">{videoZoom}%</span>
                </div>
                <input type="range" min={50} max={200} step={10} value={videoZoom}
                  onChange={(e) => setVideoZoom(Number(e.target.value))}
                  className="w-full accent-primary h-1 cursor-pointer" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span><span>100%</span><span>200%</span>
                </div>
              </div>
            </>
          ) : settingsSubMenu === 'boost' ? (
            /* ── Volume Boost Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('Volume', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Volume boost</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Boost</span>
                  <span className="text-sm text-muted-foreground">{volumeBoost}%</span>
                </div>
                <input type="range" min={50} max={300} step={10} value={volumeBoost}
                  onChange={(e) => setVolumeBoost(Number(e.target.value))}
                  className="w-full accent-primary h-1 cursor-pointer" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span><span>100%</span><span>300%</span>
                </div>
              </div>
            </>
          ) : settingsSubMenu === 'icons' ? (
            /* ── Icons Set Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition">{I('ChevronLeft', iconSet, 'h-5 w-5')}</button>
                {I('Palette', iconSet, 'h-5 w-5')}
                <span className="font-semibold flex-1">Icons Set</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">{I('CircleX', iconSet, 'h-5 w-5')}</button>
              </div>
              <div className="py-1">
                {ALL_ICON_SETS.map(style => (
                  <button key={style} onClick={() => { setIconSet(style); setSettingsSubMenu(null) }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span className="flex-1 text-left">{ICON_SET_LABELS[style]}</span>
                    {iconSet === style && I('Check', iconSet, 'w-4 h-4 text-primary')}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ═══════ SUBTITLES POPUP ═══════ */}
      {showSubtitleMenu && (
        <div data-player-menu onClick={(e) => e.stopPropagation()} className="absolute bottom-[7.5rem] sm:right-28 left-2 sm:left-auto w-[22rem] max-w-[calc(100vw-1rem)] max-h-[65vh] rounded-2xl animate-scale-in overflow-y-auto scrollbar-none bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground origin-bottom-right z-30">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
            <span className="font-semibold flex-1">Subtitles</span>
            <button onClick={() => setShowSubtitleMenu(false)} className="p-1.5 rounded-full hover:bg-white/10 transition">
              {I('CircleX', iconSet, 'h-5 w-5')}
            </button>
          </div>
          <div className="py-1">
            <button onClick={() => { setActiveSubtitle(-1); setShowSubtitleMenu(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
              <div className="w-6 h-4 rounded-sm bg-white/10 shrink-0" />
              <span className="flex-1 text-left">Off</span>
              {activeSubtitle === -1 && {I('Check', iconSet, '')}}
            </button>
            {subtitles.map((sub, i) => {
              const code = getLangCode(sub.label)
              return (
                <button key={i} onClick={() => { setActiveSubtitle(i); setShowSubtitleMenu(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                  <img src={`https://flagcdn.com/w40/${code}.png`} alt={sub.label} className="w-6 h-4 object-cover rounded-sm shadow-sm shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="flex-1 text-left truncate">{sub.label}</span>
                  {activeSubtitle === i && {I('Check', iconSet, '')}}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════ EPISODE SIDEBAR (MeowTV: full overlay, bottom slide-up) ═══════ */}
      {showEpisodeSidebar && type === 'tv' && (
        <div className="absolute inset-0 z-30 flex items-end justify-stretch" onClick={(e) => { if (e.target === e.currentTarget) setShowEpisodeSidebar(false) }} onMouseDown={(e) => e.stopPropagation()}>
          <div data-player-menu className="w-full max-h-[60vh] pt-16 animate-slide-up overflow-hidden text-foreground bg-gradient-to-t from-black via-black/95 via-50% to-transparent">

            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">Episodes</h3>
                <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border bg-primary/15 hover:bg-primary/25 text-foreground border-primary/30 transition">
                  Season {season || 1}
                  {I('ChevronDown', iconSet, 'h-4 w-4')}
                </button>
              </div>
              <button onClick={() => setShowEpisodeSidebar(false)} className="p-2 rounded-full hover:bg-white/10 text-white transition">
                {I('CircleX', iconSet, 'h-7 w-7')}
              </button>
            </div>

            {/* Episode Cards (Horizontal Scroll) */}
            <div className="flex-1 flex items-stretch min-h-0 relative">
              <div ref={episodeScrollRef} className="w-full overflow-x-auto overflow-y-hidden scrollbar-none px-5 sm:px-8 pb-6 scroll-smooth">
                <div className="flex gap-3 sm:gap-4 items-stretch">
                  {episodes.map(ep => {
                    const isCurrent = ep.episode_number === episode
                    const thumbUrl = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : undefined
                    return (
                      <button key={ep.episode_number}
                        onClick={() => { onEpisodeChange?.(season || 1, ep.episode_number); setShowEpisodeSidebar(false) }}
                        className={`group shrink-0 w-[16rem] sm:w-[20rem] text-left rounded-2xl overflow-hidden relative transition ${isCurrent ? 'ring-2 ring-white' : 'ring-0'}`}>
                        <div className="relative aspect-video bg-secondary overflow-hidden rounded-2xl">
                          {thumbUrl && <img src={thumbUrl} alt={ep.name} className="w-full h-full object-cover transition group-hover:scale-105" loading="lazy" />}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          {ep.runtime && (
                            <div className="absolute top-2 right-2 text-[11px] font-medium text-white bg-black/70 rounded px-1.5 py-0.5">{ep.runtime}m</div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-3">
                            <p className="text-sm sm:text-base font-semibold text-white line-clamp-2">
                              {ep.runtime ? `${ep.runtime}m ` : ''}{ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}
                            </p>
                          </div>
                          <div className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 transition">
                            <div className="h-12 w-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 grid place-items-center">
                              {I('Play', iconSet, 'h-6 w-6 text-white')}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Scroll right button */}
              <button
                onClick={() => { episodeScrollRef.current?.scrollBy({ left: 340, behavior: 'smooth' }) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/70 hover:bg-black/90 text-white shadow-lg transition grid place-items-center">
                {I('ChevronRight', iconSet, 'h-7 w-7')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <div className="text-red-400 text-lg font-medium">Playback Error</div>
            <p className="text-zinc-400 text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition">Retry</button>
          </div>
        </div>
      )}

      {/* ═══════ LOADING STATE ═══════ */}
      {dataLoading && !error && (
        <div className="absolute inset-0 z-5 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ═══════ Custom Subtitle Overlay ═══════ */}
      {activeCue && !locked && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-15 max-w-[80%] pointer-events-none">
          <div className="text-center">
            {activeCue.split('\n').map((line, i) => (
              <div key={i} className="text-white text-base sm:text-lg font-medium drop-shadow-lg px-2 py-0.5" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9), -1px -1px 3px rgba(0,0,0,0.9), 1px -1px 3px rgba(0,0,0,0.9), -1px 1px 3px rgba(0,0,0,0.9)' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════ Server Fallback Toast ═══════ */}
      {fallbackToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-scale-in">
          <div className="flex items-center gap-2 bg-orange-500/90 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg">
            {I('Refresh', iconSet, 'h-4 w-4 animate-spin')}
            {fallbackToast}
          </div>
        </div>
      )}
    </div>
  )
}
