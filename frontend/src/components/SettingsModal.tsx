import { useState } from 'react'
import { X, User, Plus, Trash2, Save } from 'lucide-react'
import type { HealthProfile } from '../types'

interface SettingsModalProps {
  profile: HealthProfile
  onSave: (profile: HealthProfile) => void
  onClose: () => void
}

const COMMON_CONDITIONS = ['高血压', '糖尿病', '高血脂', '冠心病', '高尿酸', '脂肪肝', '慢性胃炎', '哮喘']

export function SettingsModal({ profile, onSave, onClose }: SettingsModalProps) {
  const [form, setForm] = useState<HealthProfile>(profile)
  const [newCondition, setNewCondition] = useState('')
  const [newMed, setNewMed] = useState('')
  const [newAllergy, setNewAllergy] = useState('')

  const addTag = (field: 'conditions' | 'medications' | 'allergies', value: string) => {
    if (!value.trim()) return
    setForm((prev) => ({ ...prev, [field]: [...prev[field], value.trim()] }))
  }

  const removeTag = (field: 'conditions' | 'medications' | 'allergies', idx: number) => {
    setForm((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }))
  }

  const handleSave = () => {
    onSave(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-850 p-6 shadow-2xl animate-fade-in">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15">
              <User className="h-5 w-5 text-brand-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">健康档案</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-400">年龄</label>
              <input
                type="number"
                value={form.age ?? ''}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) || undefined })}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">性别</label>
              <select
                value={form.gender ?? ''}
                onChange={(e) => setForm({ ...form, gender: e.target.value as HealthProfile['gender'] })}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500/40 focus:outline-none"
              >
                <option value="">请选择</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">身高 (cm)</label>
              <input
                type="number"
                value={form.height ?? ''}
                onChange={(e) => setForm({ ...form, height: Number(e.target.value) || undefined })}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">体重 (kg)</label>
              <input
                type="number"
                value={form.weight ?? ''}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || undefined })}
                className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 focus:border-brand-500/40 focus:outline-none"
              />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">基础疾病</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {COMMON_CONDITIONS.filter((c) => !form.conditions.includes(c)).map((c) => (
                <button
                  key={c}
                  onClick={() => addTag('conditions', c)}
                  className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-slate-400 transition hover:border-brand-500/40 hover:text-brand-300"
                >
                  + {c}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag('conditions', newCondition)
                    setNewCondition('')
                  }
                }}
                placeholder="添加其他疾病…"
                className="flex-1 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500/40 focus:outline-none"
              />
              <button
                onClick={() => {
                  addTag('conditions', newCondition)
                  setNewCondition('')
                }}
                className="rounded-lg bg-ink-700 px-3 text-slate-300 hover:bg-ink-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.conditions.map((c, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs text-brand-200"
                >
                  {c}
                  <button onClick={() => removeTag('conditions', i)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">常用药物</label>
            <div className="flex gap-2">
              <input
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag('medications', newMed)
                    setNewMed('')
                  }
                }}
                placeholder="添加正在服用的药物…"
                className="flex-1 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500/40 focus:outline-none"
              />
              <button
                onClick={() => {
                  addTag('medications', newMed)
                  setNewMed('')
                }}
                className="rounded-lg bg-ink-700 px-3 text-slate-300 hover:bg-ink-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.medications.map((m, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs text-sky-200"
                >
                  {m}
                  <button onClick={() => removeTag('medications', i)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="mb-1.5 block text-xs text-slate-400">过敏史</label>
            <div className="flex gap-2">
              <input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addTag('allergies', newAllergy)
                    setNewAllergy('')
                  }
                }}
                placeholder="添加过敏原…"
                className="flex-1 rounded-lg border border-white/10 bg-ink-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand-500/40 focus:outline-none"
              />
              <button
                onClick={() => {
                  addTag('allergies', newAllergy)
                  setNewAllergy('')
                }}
                className="rounded-lg bg-ink-700 px-3 text-slate-300 hover:bg-ink-600"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.allergies.map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs text-rose-200"
                >
                  {a}
                  <button onClick={() => removeTag('allergies', i)} className="hover:text-red-400">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Save className="h-4 w-4" />
            保存档案
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-600">
          健康档案仅保存在您的浏览器本地，用于生成个性化建议，不会上传至服务器。
        </p>
      </div>
    </div>
  )
}
