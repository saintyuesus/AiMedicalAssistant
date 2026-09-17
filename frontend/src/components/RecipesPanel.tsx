import { useState } from 'react'
import { Utensils, Loader2, Clock, Flame, Leaf } from 'lucide-react'
import type { HealthProfile, Recipe } from '../types'
import { getRecipes } from '../api'

interface RecipesPanelProps {
  profile: HealthProfile
}

export function RecipesPanel({ profile }: RecipesPanelProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchRecipes = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getRecipes(profile)
      setRecipes(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Utensils className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">健康食谱推荐</h2>
            <p className="text-xs text-slate-500">结合您的基础病与饮食禁忌，推荐个性化食谱</p>
          </div>
        </div>

        <button
          onClick={fetchRecipes}
          disabled={loading}
          className="mb-5 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Utensils className="h-4 w-4" />}
          {recipes.length > 0 ? '换一批食谱' : '生成今日食谱'}
        </button>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {recipes.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            点击上方按钮，获取早中晚三餐及加餐推荐
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {recipes.map((r, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/5 bg-ink-800/50 p-4 transition hover:border-brand-500/30"
            >
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-white">{r.name}</h3>
                  <span className="text-xs text-slate-500">{r.meal}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Flame className="h-3.5 w-3.5" />
                  {r.calories} kcal
                </div>
              </div>

              <div className="mb-2 flex flex-wrap gap-1">
                {r.tags.map((t) => (
                  <span key={t} className="rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] text-brand-300">
                    {t}
                  </span>
                ))}
              </div>

              <div className="mb-2">
                <div className="mb-1 text-[11px] font-medium text-slate-400">食材</div>
                <div className="flex flex-wrap gap-1">
                  {r.ingredients.map((ing) => (
                    <span key={ing} className="text-xs text-slate-300">
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 text-[11px] font-medium text-slate-400">做法</div>
                <ol className="list-decimal space-y-0.5 pl-4 text-xs text-slate-400">
                  {r.steps.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400">
                <Leaf className="h-3 w-3" />
                适宜：{r.suitable.join('、')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
