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

/* ───── Solar Icons ───── */
const Solar = {
  ArrowLeft: ({ className = "h-7 w-7" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4m0 0l6-6m-6 6l6 6"/>
    </svg>
  ),
  Play: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M21.409 9.353a2.998 2.998 0 0 1 0 5.294L8.597 21.614C6.534 22.737 4 21.277 4 18.968V5.033c0-2.31 2.534-3.769 4.597-2.648z"/>
    </svg>
  ),
  Pause: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M8 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm6 0a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/>
    </svg>
  ),
  Rewind10: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
        <path d="M10.325 7.824a.75.75 0 0 1 .425.676v7a.75.75 0 0 1-1.5 0v-5.44l-1.281 1.026a.75.75 0 0 1-.937-1.172l2.5-2a.75.75 0 0 1 .793-.09M14.25 9.25a1 1 0 0 0-1 1v3.5a1 1 0 1 0 2 0v-3.5a1 1 0 0 0-1-1m-2.5 1a2.5 2.5 0 0 1 5 0v3.5a2.5 2.5 0 0 1-5 0z"/>
        <path d="M11.324 1.675A.75.75 0 0 1 12 1.25q1.104.002 2.15.215c4.906.996 8.6 5.333 8.6 10.535c0 5.937-4.813 10.75-10.75 10.75S1.25 17.937 1.25 12c0-4.41 2.655-8.197 6.45-9.855a.75.75 0 1 1 .6 1.374A9.25 9.25 0 1 0 21.25 12a9.255 9.255 0 0 0-6.5-8.834V4.5a.75.75 0 0 1-1.336.469l-2-2.5a.75.75 0 0 1-.09-.794"/>
      </g>
    </svg>
  ),
  Forward10: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
        <path d="M10.325 7.824a.75.75 0 0 1 .425.676v7a.75.75 0 0 1-1.5 0v-5.44l-1.281 1.026a.75.75 0 0 1-.937-1.172l2.5-2a.75.75 0 0 1 .793-.09M14.25 9.25a1 1 0 0 0-1 1v3.5a1 1 0 1 0 2 0v-3.5a1 1 0 0 0-1-1m-2.5 1a2.5 2.5 0 0 1 5 0v3.5a2.5 2.5 0 0 1-5 0z"/>
        <path d="M12.676 1.675A.75.75 0 0 0 12 1.25q-1.104.002-2.15.215C4.945 2.461 1.25 6.798 1.25 12c0 5.937 4.813 10.75 10.75 10.75S22.75 17.937 22.75 12c0-4.41-2.655-8.197-6.45-9.855a.75.75 0 0 0-.6 1.374A9.25 9.25 0 1 1 2.75 12a9.255 9.255 0 0 1 6.5-8.834V4.5a.75.75 0 0 0 1.336.469l2-2.5a.75.75 0 0 0 .09-.794"/>
      </g>
    </svg>
  ),
  Volume: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M2.003 11.716c.037-1.843.056-2.764.668-3.552a3 3 0 0 1 .413-.431c.752-.636 1.746-.636 3.733-.636c.71 0 1.065 0 1.403-.092q.105-.03.209-.067c.33-.121.627-.33 1.22-.746c2.338-1.645 3.508-2.467 4.489-2.11c.188.069.37.168.533.29c.848.635.913 2.115 1.042 5.073c.048 1.096.08 2.034.08 2.555s-.032 1.46-.08 2.555c-.13 2.958-.194 4.438-1.042 5.073a2.1 2.1 0 0 1-.533.29c-.982.357-2.15-.465-4.49-2.11c-.592-.416-.889-.625-1.22-.746a3 3 0 0 0-.208-.067c-.338-.092-.693-.092-1.403-.092c-1.987 0-2.98 0-3.733-.636a3 3 0 0 1-.413-.43c-.612-.79-.63-1.71-.668-3.552a14 14 0 0 1 0-.57"/>
      <path fill="currentColor" fillRule="evenodd" d="M19.49 5.552a.66.66 0 0 1 .97.094l-.529.471l.53-.47l.002.002l.003.004l.007.009l.079.112q.072.107.186.305c.149.264.339.652.526 1.171C21.64 8.291 22 9.851 22 12s-.36 3.71-.736 4.75c-.187.52-.377.907-.526 1.172a5 5 0 0 1-.265.417l-.007.009l-.003.003l-.001.002s-.001.001-.531-.47l.53.471a.66.66 0 0 1-.971.094a.77.77 0 0 1-.09-1.035l.03-.041q.04-.06.125-.207a6 6 0 0 0 .422-.943c.314-.871.644-2.253.644-4.222s-.33-3.35-.644-4.222a6 6 0 0 0-.422-.942a3 3 0 0 0-.157-.253m-1.641 1.833c.333-.197.753-.07.938.286l-.603.357l.603-.357l.001.002l.002.003l.003.007l.01.018l.024.053q.028.063.07.17c.053.145.12.35.185.62c.13.54.252 1.337.252 2.425c0 1.089-.122 1.886-.252 2.426c-.065.27-.132.475-.186.619a3 3 0 0 1-.094.223l-.009.018l-.003.007l-.002.003v.002s-.001.001-.604-.356l.603.357c-.185.355-.605.483-.938.286c-.33-.196-.45-.638-.272-.991l.004-.01l.035-.085c.032-.086.08-.23.13-.438c.1-.416.208-1.09.208-2.06c0-.971-.108-1.645-.208-2.06a4 4 0 0 0-.165-.524l-.004-.01a.76.76 0 0 1 .272-.991" clipRule="evenodd"/>
    </svg>
  ),
  VolumeMute: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M2.003 11.716c.037-1.843.056-2.764.668-3.552a3 3 0 0 1 .413-.431c.752-.636 1.746-.636 3.733-.636c.71 0 1.065 0 1.403-.092q.105-.03.209-.067c.33-.121.627-.33 1.22-.746c2.338-1.645 3.508-2.467 4.489-2.11c.188.069.37.168.533.29c.848.635.913 2.115 1.042 5.073c.048 1.096.08 2.034.08 2.555s-.032 1.46-.08 2.555c-.13 2.958-.194 4.438-1.042 5.073a2.1 2.1 0 0 1-.533.29c-.982.357-2.15-.465-4.49-2.11c-.592-.416-.889-.625-1.22-.746a3 3 0 0 0-.208-.067c-.338-.092-.693-.092-1.403-.092c-1.987 0-2.98 0-3.733-.636a3 3 0 0 1-.413-.43c-.612-.79-.63-1.71-.668-3.552a14 14 0 0 1 0-.57"/>
    </svg>
  ),
  Episodes: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <g fill="currentColor" fillRule="evenodd" clipRule="evenodd">
        <path d="M9.99 10.91a1.49 1.49 0 0 1 1.615-.022l3.371 2.09c.538.334.774.91.774 1.432c0 .523-.236 1.099-.774 1.432l-3.371 2.09c-.54.334-1.157.28-1.615-.022a1.67 1.67 0 0 1-.74-1.41v-4.18c0-.593.289-1.114.74-1.41m.823 1.254c-.019.012-.063.056-.063.156v4.18c0 .1.044.144.063.156l.001.001l3.372-2.09c.021-.013.064-.059.064-.157s-.043-.143-.064-.157l-3.371-2.09z"/>
        <path d="M8.7 1.25c-.22 0-.39 0-.536.016A2.75 2.75 0 0 0 5.71 3.87a2.89 2.89 0 0 0-2.055 2.721c-.6.18-1.119.465-1.543.923c-.652.705-.854 1.572-.862 2.586c-.007.975.167 2.207.382 3.736l.44 3.114c.168 1.196.305 2.168.518 2.929c.223.797.552 1.452 1.16 1.956c.604.5 1.32.715 2.166.817c.819.098 1.849.098 3.13.098h5.907c1.282 0 2.312 0 3.13-.098c.847-.102 1.563-.317 2.167-.817c.608-.504.937-1.16 1.16-1.956c.213-.761.35-1.733.519-2.93l.439-3.113c.216-1.53.39-2.761.382-3.736c-.008-1.014-.21-1.881-.862-2.586c-.424-.458-.943-.742-1.544-.923a2.89 2.89 0 0 0-2.054-2.72a2.75 2.75 0 0 0-2.454-2.605c-.147-.016-.316-.016-.536-.016zm10.11 5.078a1.38 1.38 0 0 0-1.348-1.078H6.538c-.669 0-1.212.47-1.349 1.078c.926-.078 2.06-.078 3.427-.078h6.768c1.366 0 2.5 0 3.427.078M16.769 3.75a1.25 1.25 0 0 0-1.092-.993a5 5 0 0 0-.417-.007H8.74c-.28 0-.361.001-.417.007a1.25 1.25 0 0 0-1.092.993zM3.213 8.533c.303-.327.758-.544 1.643-.662c.901-.12 2.108-.121 3.816-.121h6.656c1.708 0 2.915.002 3.816.121c.885.118 1.34.335 1.643.662c.296.32.457.755.463 1.579c.006.85-.15 1.97-.376 3.576l-.423 3c-.178 1.261-.302 2.133-.485 2.787c-.177.63-.384.965-.673 1.204c-.293.244-.687.4-1.388.484c-.719.086-1.658.087-3 .087h-5.81c-1.342 0-2.281-.001-3-.087c-.7-.085-1.095-.24-1.388-.483c-.289-.24-.496-.576-.673-1.205c-.183-.654-.307-1.526-.485-2.787l-.423-3c-.226-1.605-.382-2.726-.376-3.576c.006-.824.167-1.26.463-1.579"/>
      </g>
    </svg>
  ),
  Subtitles: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M5.25 16a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75M18 12.25a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5zM11.75 16a.75.75 0 0 1 .75-.75H14a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75m-.25-3.75a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5zM15.75 16a.75.75 0 0 1 .75-.75H18a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75M7 12.25a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5z"/>
      <path fill="currentColor" fillRule="evenodd" d="M9.944 3.25h4.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.748.749 1.08 1.698 1.238 2.87c.153 1.14.153 2.595.153 4.433v.112c0 1.838 0 3.294-.153 4.433c-.158 1.172-.49 2.121-1.238 2.87c-.749.748-1.698 1.08-2.87 1.238c-1.14.153-2.595.153-4.433.153H9.945c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87c-.153-1.14-.153-2.595-.153-4.433v-.112c0-1.838 0-3.294.153-4.433c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238c1.14-.153 2.595-.153 4.433-.153M5.71 4.89c-1.006.135-1.586.389-2.01.812c-.422.423-.676 1.003-.811 2.009c-.138 1.028-.14 2.382-.14 4.289s.002 3.262.14 4.29c.135 1.005.389 1.585.812 2.008s1.003.677 2.009.812c1.028.138 2.382.14 4.289.14h4c1.907 0 3.262-.002 4.29-.14c1.005-.135 1.585-.389 2.008-.812s.677-1.003.812-2.009c.138-1.028.14-2.382.14-4.289s-.002-3.261-.14-4.29c-.135-1.005-.389-1.585-.812-2.008s-1.003-.677-2.009-.812c-1.027-.138-2.382-.14-4.289-.14h-4c-1.907 0-3.261.002-4.29.14" clipRule="evenodd"/>
    </svg>
  ),
  Pip: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M9.944 2.25h4.112c1.838 0 3.294 0 4.433.153c1.172.158 2.121.49 2.87 1.238c.748.749 1.08 1.698 1.238 2.87c.153 1.14.153 2.595.153 4.433V11a.75.75 0 0 1-1.5 0c0-1.907-.002-3.261-.14-4.29c-.135-1.005-.389-1.585-.812-2.008s-1.003-.677-2.009-.812c-1.027-.138-2.382-.14-4.289-.14h-4c-1.907 0-3.261.002-4.29.14c-1.005.135-1.585.389-2.008.812S3.025 5.705 2.89 6.71c-.138 1.029-.14 2.383-.14 4.29v2c0 1.907.002 3.262.14 4.29c.135 1.005.389 1.585.812 2.008s1.003.677 2.009.812c1.028.138 2.382.14 4.289.14h1a.75.75 0 0 1 0 1.5H9.944c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87c-.153-1.14-.153-2.595-.153-4.433v-2.112c0-1.838 0-3.294.153-4.433c.158-1.172.49-2.121 1.238-2.87c.749-.748 1.698-1.08 2.87-1.238c1.14-.153 2.595-.153 4.433-.153M6.97 6.97a.75.75 0 0 1 1.06 0l2.72 2.72V8.5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.19L6.97 8.03a.75.75 0 0 1 0-1.06m9.978 5.28h1.104c.899 0 1.648 0 2.242.08c.628.084 1.195.27 1.65.726c.456.455.642 1.022.726 1.65c.08.594.08 1.343.08 2.242v.104c0 .899 0 1.648-.08 2.242c-.084.628-.27 1.195-.726 1.65c-.455.456-1.022.642-1.65.726c-.594.08-1.343.08-2.242.08h-1.104c-.899 0-1.648 0-2.242-.08c-.628-.084-1.195-.27-1.65-.726c-.456-.455-.642-1.022-.726-1.65c-.08-.594-.08-1.343-.08-2.242v-.104c0-.899 0-1.648.08-2.242c.084-.628.27-1.195.726-1.65c.455-.456 1.022-.642 1.65-.726c.594-.08 1.343-.08 2.242-.08m-2.043 1.566c-.461.063-.659.17-.789.3s-.237.328-.3.79c-.064.482-.066 1.13-.066 2.094s.002 1.612.066 2.095c.063.461.17.659.3.789s.328.237.79.3c.482.064 1.13.066 2.094.066h1c.964 0 1.612-.002 2.095-.067c.461-.062.659-.169.789-.3s.237-.327.3-.788c.064-.483.066-1.131.066-2.095s-.002-1.612-.067-2.095c-.062-.461-.169-.659-.3-.789s-.327-.237-.788-.3c-.483-.064-1.131-.066-2.095-.066h-1c-.964 0-1.612.002-2.095.066" clipRule="evenodd"/>
    </svg>
  ),
  Settings: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.408 0-1.779.152a2 2 0 0 0-1.09 1.083c-.094.223-.13.484-.145.863a1.62 1.62 0 0 1-.796 1.353a1.64 1.64 0 0 1-1.579.008c-.338-.178-.583-.276-.825-.308a2.03 2.03 0 0 0-1.49.396c-.318.242-.553.646-1.022 1.453c-.47.807-.704 1.21-.757 1.605c-.07.526.074 1.058.4 1.479c.148.192.357.353.68.555c.477.297.783.803.783 1.361s-.306 1.064-.782 1.36c-.324.203-.533.364-.682.556a2 2 0 0 0-.399 1.479c.053.394.287.798.757 1.605s.704 1.21 1.022 1.453c.424.323.96.465 1.49.396c.242-.032.487-.13.825-.308a1.64 1.64 0 0 1 1.58.008c.486.28.774.795.795 1.353c.015.38.051.64.145.863c.204.49.596.88 1.09 1.083c.37.152.84.152 1.779.152s1.409 0 1.779-.152a2 2 0 0 0 1.09-1.083c.094-.223.13-.483.145-.863c.02-.558.309-1.074.796-1.353a1.64 1.64 0 0 1 1.579-.008c.338.178.583.276.825.308c.53.07 1.066-.073 1.49-.396c.318-.242.553-.646 1.022-1.453c.47-.807.704-1.21.757-1.605a2 2 0 0 0-.4-1.479c-.148-.192-.357-.353-.68-.555c-.477-.297-.783-.803-.783-1.361s.306-1.064.782-1.36c.324-.203.533-.364.682-.556a2 2 0 0 0 .399-1.479c-.053-.394-.287-.798-.757-1.605s-.704-1.21-1.022-1.453a2.03 2.03 0 0 0-1.49-.396c-.242.032-.487.13-.825.308a1.64 1.64 0 0 1-1.58-.008a1.62 1.62 0 0 1-.795-1.353c-.015-.38-.051-.64-.145-.863a2 2 0 0 0-1.09-1.083M12.5 15c1.67 0 3.023-1.343 3.023-3S14.169 9 12.5 9s-3.023 1.343-3.023 3s1.354 3 3.023 3" clipRule="evenodd"/>
    </svg>
  ),
  Fullscreen: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} d="M22 14c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22m-4 0c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14m8-12C6.229 2 4.343 2 3.172 3.172S2 6.229 2 10m12-8c3.771 0 5.657 0 6.828 1.172S22 6.229 22 10"/>
    </svg>
  ),
  Minimize: ({ className = "h-10 w-10" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth={1.5} d="M2 10c0-3.771 0-5.657 1.172-6.828S6.229 2 10 2m4 0c3.771 0 5.657 0 6.828 1.172S22 6.229 22 10m0 4c0 3.771 0 5.657-1.172 6.828S17.771 22 14 22m-4 0c-3.771 0-5.657 0-6.828-1.172S2 17.771 2 14"/>
    </svg>
  ),
  Lock: ({ className = "h-9 w-9" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" d="M6.75 8a5.25 5.25 0 0 1 10.335-1.313a.75.75 0 0 0 1.452-.374A6.75 6.75 0 0 0 5.25 8v2.055c-1.115.083-1.84.293-2.371.824C2 11.757 2 13.172 2 16s0 4.243.879 5.121C3.757 22 5.172 22 8 22h8c2.828 0 4.243 0 5.121-.879C22 20.243 22 18.828 22 16s0-4.243-.879-5.121C20.243 10 18.828 10 16 10H8q-.677-.001-1.25.004z"/>
    </svg>
  ),
  Unlock: ({ className = "h-9 w-9" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M9.5 2.75a3.75 3.75 0 0 0-3.646 4.613a.75.75 0 1 1-1.458.364a5.25 5.25 0 0 1 8.404-5.276A5.25 5.25 0 0 1 15.25 7v3.056c1.115.083 1.84.293 2.371.824C18.5 11.757 18.5 13.172 18.5 16s0 4.243-.879 5.121C16.743 22 15.328 22 12.5 22h-3c-2.828 0-4.243 0-5.121-.879C3.5 20.243 3.5 18.828 3.5 16s0-4.243.879-5.121c.531-.53 1.256-.74 2.371-.824L6.25 10h8.5V7a3.75 3.75 0 0 0-5.25-3.433M12 14.25a1.75 1.75 0 0 0-.75 3.332V19a.75.75 0 0 0 1.5 0v-1.418A1.75 1.75 0 0 0 12 14.25" clipRule="evenodd"/>
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-primary"><path d="M20 6L9 17l-5-5"/></svg>
  ),
  Image: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M2.25 6c0-2.214 1.786-4 4-4h11.5c2.214 0 4 1.786 4 4v12c0 2.214-1.786 4-4 4H6.25c-2.214 0-4-1.786-4-4zm4-2.5c-1.386 0-2.5 1.114-2.5 2.5v12c0 .568.188 1.09.504 1.512l5.684-5.408a2.25 2.25 0 0 1 3.124 0l5.684 5.408A2.48 2.48 0 0 0 19.75 18V6c0-1.386-1.114-2.5-2.5-2.5zm9.5 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m-2.342 2.886a.75.75 0 0 0-1.041 0l-5.48 5.214c.422.246.913.4 1.433.4h11.5c.52 0 1.011-.154 1.433-.4z" clipRule="evenodd"/>
    </svg>
  ),
  PlayCircle: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12S6.615 2.25 12 2.25M3.75 12a8.25 8.25 0 1 0 16.5 0a8.25 8.25 0 0 0-16.5 0m7.47-3.72a.75.75 0 0 1 .78-.024l5 3a.75.75 0 0 1 0 1.288l-5 3a.75.75 0 0 1-1.03-.288l-.004-.006a.75.75 0 0 1 .254-1zM12.75 9.93v4.14L16.14 12z" clipRule="evenodd"/>
    </svg>
  ),
  Cloud: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M10.5 2.75a5.75 5.75 0 0 0-5.392 7.707A4.751 4.751 0 0 0 5.75 19.75h12.5a4.75 4.75 0 0 0 2.124-8.97A5.25 5.25 0 0 0 10.5 2.75M6.25 8.5a4.25 4.25 0 0 1 8.198-1.577a.75.75 0 0 0 .8.468a3.75 3.75 0 0 1 4.2 3.854a.75.75 0 0 0 .525.805A3.25 3.25 0 0 1 18.25 18.25H5.75a3.25 3.25 0 0 1-.954-6.356a.75.75 0 0 0 .523-.736A4.3 4.3 0 0 1 6.25 8.5" clipRule="evenodd"/>
    </svg>
  ),
  Pen: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M20.414 3.586a2 2 0 0 0-2.828 0L16.17 5l2.83 2.83l1.414-1.415a2 2 0 0 0 0-2.829m-5.657 2.828L4 17.172V20h2.828L17.586 9.242zM2 17.172V21a1 1 0 0 0 1 1h3.828a1 1 0 0 0 .707-.293l11.415-11.414a2 2 0 0 0 0-2.829l-2.829-2.828a2 2 0 0 0-2.828 0L2.293 16.465A1 1 0 0 0 2 17.172" clipRule="evenodd"/>
    </svg>
  ),
  ZoomIn: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M10 2.25a7.75 7.75 0 0 1 5.958 12.709l4.542 4.541a.75.75 0 0 1-1.06 1.06l-4.542-4.541A7.75 7.75 0 1 1 10 2.25M3.75 10a6.25 6.25 0 1 0 12.5 0a6.25 6.25 0 0 0-12.5 0M10 6.25a.75.75 0 0 1 .75.75v2.25H13a.75.75 0 0 1 0 1.5h-2.25V13a.75.75 0 0 1-1.5 0v-2.25H7a.75.75 0 0 1 0-1.5h2.25V7a.75.75 0 0 1 .75-.75" clipRule="evenodd"/>
    </svg>
  ),
  Refresh: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2.25a9.75 9.75 0 0 0-9.026 6.094a.75.75 0 1 0 1.386.573a8.25 8.25 0 1 1 .18 5.833a.75.75 0 0 0-1.394.554A9.75 9.75 0 1 0 12 2.25M7.47 7.72a.75.75 0 0 1 .78-.025l4.5 2.75a.75.75 0 0 1 0 1.28l-4.5 2.75a.75.75 0 0 1-1.03-.28a.75.75 0 0 1 .03-.76V8.01a.75.75 0 0 1-.03-.01a.75.75 0 0 1 .25-.28" clipRule="evenodd"/>
    </svg>
  ),
  Palette: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75a1.25 1.25 0 0 0 1.09-1.86a2.25 2.25 0 0 1 1.94-3.37h1.22a4.25 4.25 0 0 0 4.25-4.25c0-5.385-4.365-9.77-9.5-10.02zm0 1.5A8.25 8.25 0 0 1 20.25 12.27a2.75 2.75 0 0 1-2.75 2.75h-1.22a3.75 3.75 0 0 0-3.23 5.62q.02.03.02.06a.25.25 0 0 1-.07.05a8.25 8.25 0 0 1-1-16.5M7.75 9a1.25 1.25 0 1 1 2.5 0a1.25 1.25 0 0 1-2.5 0m4-1.25a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5M15 7.75a1.25 1.25 0 1 0 0 2.5a1.25 1.25 0 0 0 0-2.5M8.25 13.5a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 0 0-2.5 0" clipRule="evenodd"/>
    </svg>
  ),
  CircleX: ({ className = "h-5 w-5" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12S6.615 2.25 12 2.25M3.75 12a8.25 8.25 0 1 0 16.5 0a8.25 8.25 0 0 0-16.5 0m6.22-3.53a.75.75 0 0 1 1.06 0L12 9.44l.97-.97a.75.75 0 1 1 1.06 1.06l-.97.97l.97.97a.75.75 0 0 1-1.06 1.06l-.97-.97l-.97.97a.75.75 0 0 1-1.06-1.06l.97-.97l-.97-.97a.75.75 0 0 1 0-1.06" clipRule="evenodd"/>
    </svg>
  ),
  ChevronLeft: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 4l-8 8l8 8"/>
    </svg>
  ),
  ChevronRight: ({ className = "h-7 w-7" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 4l8 8l-8 8"/>
    </svg>
  ),
  ChevronDown: ({ className = "h-4 w-4" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 9l8 8l8-8"/>
    </svg>
  ),
  UsersGroup: ({ className = "h-7 w-7" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M8.5 4a3.25 3.25 0 0 0-3.25 3.25a3.25 3.25 0 0 0 3.25 3.25a3.25 3.25 0 0 0 3.25-3.25A3.25 3.25 0 0 0 8.5 4m-1.75 3.25a1.75 1.75 0 1 1 3.5 0a1.75 1.75 0 0 1-3.5 0m9.25.5a2.25 2.25 0 0 0-2.25 2.25a2.25 2.25 0 0 0 2.25 2.25a2.25 2.25 0 0 0 2.25-2.25A2.25 2.25 0 0 0 16 7.5m-.75 2.25a.75.75 0 1 1 1.5 0a.75.75 0 0 1-1.5 0M3.75 15.75A3.75 3.75 0 0 1 7.5 12h2a3.75 3.75 0 0 1 3.75 3.75v.5a3 3 0 0 1-3 3H6.75a3 3 0 0 1-3-3zM7.5 13.5a2.25 2.25 0 0 0-2.25 2.25v.5a1.5 1.5 0 0 0 1.5 1.5h3.5a1.5 1.5 0 0 0 1.5-1.5v-.5A2.25 2.25 0 0 0 9.5 13.5zm6.25-.75h1.5a3.25 3.25 0 0 1 3.25 3.25v.25a2.5 2.5 0 0 1-2.5 2.5h-2.5a.75.75 0 0 1 0-1.5h2.5a1 1 0 0 0 1-1v-.25a1.75 1.75 0 0 0-1.75-1.75h-1.5a.75.75 0 0 1 0-1.5" clipRule="evenodd"/>
    </svg>
  ),
  Cast: ({ className = "h-7 w-7" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" className={`iconify iconify--solar ${className}`} viewBox="0 0 24 24">
      <path fill="currentColor" fillRule="evenodd" d="M2.75 4A2.75 2.75 0 0 1 5.5 1.25h13A2.75 2.75 0 0 1 21.25 4v16a2.75 2.75 0 0 1-2.75 2.75h-4a.75.75 0 0 1 0-1.5h4c.69 0 1.25-.56 1.25-1.25V4c0-.69-.56-1.25-1.25-1.25h-13C4.56 2.75 4 3.31 4 4v4a.75.75 0 0 1-1.5 0zM2.4 13.35a.75.75 0 0 1 .9-.55a8.27 8.27 0 0 1 4.85 3.05a.75.75 0 1 1-1.2.9a6.77 6.77 0 0 0-3.97-2.5a.75.75 0 0 1-.58-.9m-.4-3.6a.75.75 0 0 1 .85-.63A12.27 12.27 0 0 1 9.3 12.8a.75.75 0 1 1-1.1 1a10.77 10.77 0 0 0-5.4-2.6a.75.75 0 0 1-.8-.45m1 7.5a1.25 1.25 0 1 1 2.5 0a1.25 1.25 0 0 1-2.5 0" clipRule="evenodd"/>
    </svg>
  ),
}

/* ───── Helper: format time ───── */
function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ───── Settings sub-menu type ───── */
type SettingsSubMenu = null | 'quality' | 'speed' | 'server' | 'zoom' | 'boost'

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

  const [tikStream, setTikStream] = useState<StreamSource | null>(null)
  const [v4Streams, setV4Streams] = useState<StreamSource[]>([])
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([])
  const [activeServer, setActiveServer] = useState<string>('tik')
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1)
  const [activeQuality, setActiveQuality] = useState<number>(-1)
  const [availableQualities, setAvailableQualities] = useState<{ height: number; bitrate: number; label: string }[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState('')

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
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
          else { setError('Fatal playback error'); hls.destroy() }
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

  /* ── Subtitles ── */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.querySelectorAll('track').forEach(t => t.remove())
    for (let i = 0; i < video.textTracks.length; i++) video.textTracks[i].mode = 'hidden'
    if (activeSubtitle >= 0 && subtitles[activeSubtitle]) {
      const track = document.createElement('track')
      track.kind = 'subtitles'
      track.label = subtitles[activeSubtitle].label
      track.srclang = 'en'
      track.src = subtitles[activeSubtitle].file
      track.default = true
      video.appendChild(track)
      track.onload = () => {
        const t = video.textTracks[video.textTracks.length - 1]
        if (t) t.mode = 'showing'
      }
    }
  }, [activeSubtitle, subtitles])

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
  useEffect(() => {
    if (!showSettingsMenu && !showSubtitleMenu && !showEpisodeSidebar) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-player-menu]')) {
        setShowSettingsMenu(false); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null)
      }
    }
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 100)
    return () => { clearTimeout(timer); document.removeEventListener('click', handleClick) }
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
                  <Solar.Rewind10 className="h-8 w-8 text-white" />
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
                  <Solar.Forward10 className="h-8 w-8 text-white" />
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
          <Solar.ArrowLeft />
        </button>
        <div className="text-white font-medium drop-shadow line-clamp-1 flex-1 min-w-0 text-lg">
          {title}{type === 'tv' && season && episode ? ` \u2022 S${season} E${episode}` : ''}
        </div>
        <button aria-label="Watch Party" className="rounded-full transition text-white p-3 hover:bg-black/40">
          <Solar.UsersGroup />
        </button>
        <button aria-label="Cast" className="rounded-full hover:bg-black/40 transition text-white p-3">
          <Solar.Cast />
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
        {locked ? <Solar.Lock className="h-9 w-9" /> : <Solar.Unlock className="h-9 w-9" />}
      </button>

      {/* ═══════ LAYER 6: Center play controls — only show when PAUSED ═══════ */}
      {!playing && !locked && (
        <>
          {/* Desktop: large single play button */}
          <div className="absolute inset-0 z-20 items-center justify-center pointer-events-none hidden md:flex">
            <button aria-label="Play" onClick={togglePlay} className="pointer-events-auto grid place-items-center text-white hover:scale-105 transition">
              <Solar.Play className="h-28 w-28 drop-shadow-2xl" />
            </button>
          </div>
          {/* Mobile: 3-button row */}
          <div className="absolute inset-0 z-20 items-center justify-center gap-10 sm:gap-12 pointer-events-none flex md:hidden">
            <button aria-label="Back 10s" onClick={() => skip(-10)} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              <div className="h-9 w-9 drop-shadow-lg"><Solar.Rewind10 className="h-9 w-9" /></div>
            </button>
            <button aria-label="Play" onClick={togglePlay} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              <Solar.Play className="h-14 w-14 drop-shadow-lg" />
            </button>
            <button aria-label="Forward 10s" onClick={() => skip(10)} className="pointer-events-auto grid place-items-center text-white active:scale-90 transition">
              <div className="h-9 w-9 drop-shadow-lg"><Solar.Forward10 className="h-9 w-9" /></div>
            </button>
          </div>
        </>
      )}

      {/* Seek feedback overlay */}
      {seekFeedback && !locked && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none animate-scale-in ${seekFeedback.dir < 0 ? 'left-[20%]' : 'right-[20%]'}`}>
          <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center text-white">
            {seekFeedback.dir < 0 ? <Solar.Rewind10 className="h-8 w-8" /> : <Solar.Forward10 className="h-8 w-8" />}
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
            {playing ? <Solar.Pause className="h-6 w-6 sm:h-10 sm:w-10" /> : <Solar.Play className="h-6 w-6 sm:h-10 sm:w-10" />}
          </button>
          <button aria-label="Back 10s" onClick={() => skip(-10)} className="hidden sm:grid place-items-center p-3 hover:bg-white/10 rounded-full transition">
            <Solar.Rewind10 />
          </button>
          <button aria-label="Forward 10s" onClick={() => skip(10)} className="hidden sm:grid place-items-center p-3 hover:bg-white/10 rounded-full transition">
            <Solar.Forward10 />
          </button>
          {/* Volume */}
          <div className="flex items-center gap-2 group/vol">
            <button aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => { const v = videoRef.current; if (v) v.muted = !v.muted }} className="hover:bg-white/10 rounded-full transition p-2 sm:p-3">
              {muted || volume === 0 ? <Solar.VolumeMute className="h-6 w-6 sm:h-10 sm:w-10" /> : <Solar.Volume className="h-6 w-6 sm:h-10 sm:w-10" />}
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
              <Solar.Episodes className="h-6 w-6 sm:h-10 sm:w-10" />
            </button>
          )}
          {/* Subtitles */}
          {subtitles.length > 0 && (
            <button aria-label="Subtitles" onClick={() => { setShowSubtitleMenu(s => !s); setShowSettingsMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null) }}
              className={`grid place-items-center rounded-full transition p-2 sm:p-3 hover:bg-white/10 ${showSubtitleMenu ? 'bg-white/15' : ''}`}>
              <Solar.Subtitles className="h-6 w-6 sm:h-10 sm:w-10" />
            </button>
          )}
          {/* PiP */}
          <button aria-label="PiP" onClick={togglePip} className="hidden sm:grid place-items-center rounded-full hover:bg-white/10 transition p-3">
            <Solar.Pip />
          </button>
          {/* Settings */}
          <button aria-label="Settings" onClick={() => { setShowSettingsMenu(s => !s); setShowSubtitleMenu(false); setShowEpisodeSidebar(false); setSettingsSubMenu(null) }}
            className={`grid place-items-center rounded-full transition p-2 sm:p-3 hover:bg-white/10 ${showSettingsMenu ? 'bg-white/15' : ''}`}>
            <Solar.Settings className="h-6 w-6 sm:h-10 sm:w-10" />
          </button>
          {/* Fullscreen */}
          <button aria-label={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'} onClick={toggleFullscreen} className="grid place-items-center hover:bg-white/10 rounded-full transition p-2 sm:p-3">
            {fullscreen ? <Solar.Minimize className="h-6 w-6 sm:h-10 sm:w-10" /> : <Solar.Fullscreen className="h-6 w-6 sm:h-10 sm:w-10" />}
          </button>
        </div>
      </div>

      {/* ═══════ Auto-play next episode notification ═══════ */}
      {showNextEpNotif && !locked && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-20 animate-scale-in">
          <div className="flex items-center gap-3 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
            <div className="w-8 h-8 rounded-full bg-primary/20 grid place-items-center">
              <Solar.Play className="h-4 w-4 text-primary" />
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
        <div data-player-menu className="absolute bottom-[7.5rem] sm:right-4 left-2 sm:left-auto w-[22rem] max-w-[calc(100vw-1rem)] max-h-[65vh] rounded-2xl animate-scale-in overflow-y-auto scrollbar-none bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground origin-bottom-right z-30">

          {settingsSubMenu === null ? (
            /* ── Main Settings Menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <span className="font-semibold flex-1">Settings</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition">
                  <Solar.CircleX className="h-5 w-5" />
                </button>
              </div>

              <button onClick={() => setSettingsSubMenu('quality')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Image className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Quality</span>
                <span className="text-muted-foreground">{currentQualityLabel}</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button onClick={() => setSettingsSubMenu('speed')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.PlayCircle className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Speed</span>
                <span className="text-muted-foreground">{currentSpeedLabel}</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button onClick={() => setSettingsSubMenu('server')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Cloud className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Server</span>
                <span className="text-muted-foreground">{currentServerLabel}</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Pen className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Subtitle style</span>
                <span className="text-muted-foreground">&mdash;</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button onClick={() => setSettingsSubMenu('zoom')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.ZoomIn className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Video</span>
                <span className="text-muted-foreground">{videoZoom}%</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button onClick={() => setAutoPlay(a => !a)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Refresh className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Auto-play</span>
                <span className="text-muted-foreground">{autoPlay ? 'Play \u2022 Next On' : 'Off'}</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button onClick={() => setSettingsSubMenu('boost')} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Volume className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Volume boost</span>
                <span className="text-muted-foreground">{volumeBoost}%</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                <Solar.Palette className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">Icons Set</span>
                <span className="text-muted-foreground">Legacy</span>
                <Solar.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          ) : settingsSubMenu === 'quality' ? (
            /* ── Quality Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition"><Solar.ChevronLeft className="h-5 w-5" /></button>
                <Solar.Image className="h-5 w-5" />
                <span className="font-semibold flex-1">Quality</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition"><Solar.CircleX className="h-5 w-5" /></button>
              </div>
              <div className="py-1">
                <button onClick={() => { setActiveQuality(-1); setSettingsSubMenu(null) }}
                  className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                  <span>Auto</span>{activeQuality === -1 && <Solar.Check />}
                </button>
                {availableQualities.map((q, i) => (
                  <button key={i} onClick={() => { setActiveQuality(i); setSettingsSubMenu(null) }}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{q.label} ({Math.round(q.bitrate / 1000)}kbps)</span>{activeQuality === i && <Solar.Check />}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'speed' ? (
            /* ── Speed Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition"><Solar.ChevronLeft className="h-5 w-5" /></button>
                <Solar.PlayCircle className="h-5 w-5" />
                <span className="font-semibold flex-1">Speed</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition"><Solar.CircleX className="h-5 w-5" /></button>
              </div>
              <div className="py-1">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(spd => (
                  <button key={spd} onClick={() => {
                    if (videoRef.current) videoRef.current.playbackRate = spd
                    setPlaybackSpeed(spd); setSettingsSubMenu(null)
                  }} className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{spd}x</span>{playbackSpeed === spd && <Solar.Check />}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'server' ? (
            /* ── Server Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition"><Solar.ChevronLeft className="h-5 w-5" /></button>
                <Solar.Cloud className="h-5 w-5" />
                <span className="font-semibold flex-1">Server</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition"><Solar.CircleX className="h-5 w-5" /></button>
              </div>
              <div className="py-1">
                {allServers.map(s => (
                  <button key={s.id} onClick={() => { switchServer(s.id); setSettingsSubMenu(null) }}
                    className="flex items-center justify-between w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                    <span>{s.label}</span>{activeServer === s.id && <Solar.Check />}
                  </button>
                ))}
              </div>
            </>
          ) : settingsSubMenu === 'zoom' ? (
            /* ── Video Zoom Sub-menu ── */
            <>
              <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition"><Solar.ChevronLeft className="h-5 w-5" /></button>
                <Solar.ZoomIn className="h-5 w-5" />
                <span className="font-semibold flex-1">Video</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition"><Solar.CircleX className="h-5 w-5" /></button>
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
                <button onClick={() => setSettingsSubMenu(null)} className="p-1 hover:bg-white/10 rounded-full transition"><Solar.ChevronLeft className="h-5 w-5" /></button>
                <Solar.Volume className="h-5 w-5" />
                <span className="font-semibold flex-1">Volume boost</span>
                <button onClick={() => { setShowSettingsMenu(false); setSettingsSubMenu(null) }} className="p-1.5 rounded-full hover:bg-white/10 transition"><Solar.CircleX className="h-5 w-5" /></button>
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
          ) : null}
        </div>
      )}

      {/* ═══════ SUBTITLES POPUP ═══════ */}
      {showSubtitleMenu && (
        <div data-player-menu className="absolute bottom-[7.5rem] sm:right-28 left-2 sm:left-auto w-[22rem] max-w-[calc(100vw-1rem)] max-h-[65vh] rounded-2xl animate-scale-in overflow-y-auto scrollbar-none bg-card/95 backdrop-blur-xl border border-white/10 shadow-2xl text-foreground origin-bottom-right z-30">
          <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
            <span className="font-semibold flex-1">Subtitles</span>
            <button onClick={() => setShowSubtitleMenu(false)} className="p-1.5 rounded-full hover:bg-white/10 transition">
              <Solar.CircleX className="h-5 w-5" />
            </button>
          </div>
          <div className="py-1">
            <button onClick={() => { setActiveSubtitle(-1); setShowSubtitleMenu(false) }}
              className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
              <div className="w-6 h-4 rounded-sm bg-white/10 shrink-0" />
              <span className="flex-1 text-left">Off</span>
              {activeSubtitle === -1 && <Solar.Check />}
            </button>
            {subtitles.map((sub, i) => {
              const code = getLangCode(sub.label)
              return (
                <button key={i} onClick={() => { setActiveSubtitle(i); setShowSubtitleMenu(false) }}
                  className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-sm transition">
                  <img src={`https://flagcdn.com/w40/${code}.png`} alt={sub.label} className="w-6 h-4 object-cover rounded-sm shadow-sm shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <span className="flex-1 text-left truncate">{sub.label}</span>
                  {activeSubtitle === i && <Solar.Check />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════ EPISODE SIDEBAR (MeowTV: full overlay, bottom slide-up) ═══════ */}
      {showEpisodeSidebar && type === 'tv' && (
        <div className="absolute inset-0 z-30 flex items-end justify-stretch" onClick={(e) => { if (e.target === e.currentTarget) setShowEpisodeSidebar(false) }}>
          <div data-player-menu className="w-full max-h-[60vh] pt-16 animate-slide-up overflow-hidden text-foreground bg-gradient-to-t from-black via-black/95 via-50% to-transparent">

            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-8 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <h3 className="font-display text-xl sm:text-2xl font-bold text-white">Episodes</h3>
                <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border bg-primary/15 hover:bg-primary/25 text-foreground border-primary/30 transition">
                  Season {season || 1}
                  <Solar.ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <button onClick={() => setShowEpisodeSidebar(false)} className="p-2 rounded-full hover:bg-white/10 text-white transition">
                <Solar.CircleX className="h-7 w-7" />
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
                              <Solar.Play className="h-6 w-6 text-white" />
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
                <Solar.ChevronRight className="h-7 w-7" />
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
    </div>
  )
}
