import { useState } from 'react'
import { Hospital, Loader2, MapPin, Star, Stethoscope, FileCheck } from 'lucide-react'
import { getMedicalGuidance, type Doctor, type Hospital as HospitalType } from '../api'

export function MedicalPanel() {
  const [symptom, setSymptom] = useState('')
  const [result, setResult] = useState<{
    departments: string[]
    hospitals: HospitalType[]
    doctors: Doctor[]
    preparation: string[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchGuidance = async () => {
    if (!symptom.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await getMedicalGuidance(symptom)
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
            <Hospital className="h-5 w-5 text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">就医指引</h2>
            <p className="text-xs text-slate-500">根据症状推荐科室、本地医院与医生</p>
          </div>
        </div>

        <div className="mb-5 flex gap-2">
          <input
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchGuidance()}
            placeholder="输入症状，如：头痛、咳嗽、胃痛…"
            className="flex-1 rounded-xl border border-white/10 bg-ink-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500/40 focus:outline-none"
          />
          <button
            onClick={fetchGuidance}
            disabled={loading || !symptom.trim()}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            推荐
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        {result && (
          <div className="space-y-5">
            {/* Departments */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Stethoscope className="h-4 w-4 text-brand-400" />
                推荐科室
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.departments.map((d) => (
                  <span key={d} className="rounded-lg bg-brand-500/15 px-3 py-1.5 text-sm text-brand-200">
                    {d}
                  </span>
                ))}
              </div>
            </section>

            {/* Hospitals */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Hospital className="h-4 w-4 text-sky-400" />
                附近医院
              </h3>
              <div className="space-y-2">
                {result.hospitals.map((h) => (
                  <div key={h.name} className="rounded-xl border border-white/5 bg-ink-800/50 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-white">{h.name}</h4>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-300">{h.level}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {h.distance}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{h.address}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {h.depts.map((d) => (
                        <span key={d} className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Doctors */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <Star className="h-4 w-4 text-amber-400" />
                推荐医生
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {result.doctors.map((doc) => (
                  <div key={doc.name} className="flex gap-3 rounded-xl border border-white/5 bg-ink-800/50 p-3">
                    <img
                      src={doc.avatar}
                      alt={doc.name}
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{doc.name}</h4>
                        <span className="text-xs text-slate-400">{doc.title}</span>
                      </div>
                      <p className="text-xs text-brand-300">{doc.dept} · {doc.hospital}</p>
                      <p className="mt-1 text-[11px] text-slate-400">擅长：{doc.specialty}</p>
                      <div className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                        <Star className="h-3 w-3 fill-current" />
                        {doc.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Preparation */}
            <section>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-200">
                <FileCheck className="h-4 w-4 text-emerald-400" />
                就医前准备
              </h3>
              <ul className="space-y-1.5 rounded-xl border border-white/5 bg-ink-800/50 p-4">
                {result.preparation.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-brand-400">•</span>
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {!result && !loading && (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">
            输入症状，获取科室、医院与医生推荐
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-slate-600">
          数据仅供参考，具体以医院实际出诊信息为准
        </p>
      </div>
    </div>
  )
}
