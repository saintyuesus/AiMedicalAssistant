import { useEffect, useState } from 'react'
import { Video, Loader2, Search, Play, ExternalLink } from 'lucide-react'
import { recommendVideos, type VideoItem } from '../api'

export function VideosPanel() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const fetchVideos = async (symptom?: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await recommendVideos(symptom)
      setVideos(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const handleSearch = () => {
    fetchVideos(search.trim() || undefined)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15">
            <Video className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">养生视频推荐</h2>
            <p className="text-xs text-slate-500">每日精选抖音养生科普，或按症状搜索相关视频</p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索病症相关养生视频，如：高血压、失眠、养胃…"
              className="w-full rounded-xl border border-white/10 bg-ink-800 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500/40 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            搜索
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v) => (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group overflow-hidden rounded-xl border border-white/5 bg-ink-800/50 transition hover:border-brand-500/30"
              >
                <div className="relative aspect-video overflow-hidden bg-ink-900">
                  <img
                    src={v.cover}
                    alt={v.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500/90">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {v.duration}
                  </span>
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-medium text-slate-100 group-hover:text-white">
                    {v.title}
                  </h3>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{v.author}</span>
                    <span>{v.views} 播放</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-400"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-brand-400 opacity-0 transition group-hover:opacity-100">
                    <ExternalLink className="h-3 w-3" />
                    前往观看
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && videos.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            暂无相关视频
          </div>
        )}
      </div>
    </div>
  )
}
