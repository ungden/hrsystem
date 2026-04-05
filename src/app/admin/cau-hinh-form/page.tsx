"use client";

import { useState, useEffect } from 'react';
import { Settings2, Plus, Trash2, Save, Loader2, X, GripVertical, Eye } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getFormTemplates, upsertFormTemplate, deleteFormTemplate, getEmployees } from '@/lib/supabase-data';

interface FormField {
  key: string; label: string; type: string; unit: string; required: boolean; placeholder: string;
}

interface Template {
  id: number; name: string; target_type: string; target_value: string; fields: FormField[]; is_active: boolean;
}

const FIELD_TYPES = [
  { value: 'number', label: 'Số' },
  { value: 'currency', label: 'Tiền (VND)' },
  { value: 'percentage', label: 'Phần trăm (%)' },
  { value: 'text', label: 'Văn bản' },
  { value: 'textarea', label: 'Văn bản dài' },
  { value: 'file', label: 'Đính kèm file' },
];

export default function FormConfigPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; target_type: string; target_value: string; fields: FormField[] }>({
    name: '', target_type: 'role', target_value: '', fields: [],
  });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [tpls, emps] = await Promise.all([getFormTemplates(), getEmployees()]);
      setTemplates(tpls);
      setEmployees(emps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setEditForm({ name: t.name, target_type: t.target_type, target_value: t.target_value, fields: [...t.fields] });
    setShowAdd(false);
  }

  function startAdd() {
    setEditingId(null);
    setEditForm({ name: '', target_type: 'role', target_value: '', fields: [] });
    setShowAdd(true);
  }

  function addField() {
    setEditForm(prev => ({
      ...prev,
      fields: [...prev.fields, { key: `field_${Date.now()}`, label: '', type: 'number', unit: '', required: false, placeholder: '' }],
    }));
  }

  function updateField(idx: number, updates: Partial<FormField>) {
    setEditForm(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => i === idx ? { ...f, ...updates } : f),
    }));
  }

  function removeField(idx: number) {
    setEditForm(prev => ({ ...prev, fields: prev.fields.filter((_, i) => i !== idx) }));
  }

  function moveField(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editForm.fields.length) return;
    setEditForm(prev => {
      const fields = [...prev.fields];
      [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
      return { ...prev, fields };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upsertFormTemplate({
        id: editingId || undefined,
        name: editForm.name,
        target_type: editForm.target_type,
        target_value: editForm.target_value,
        fields: editForm.fields,
      });
      setEditingId(null);
      setShowAdd(false);
      await load();
    } catch (e) { console.error(e); } finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm('Xóa form template này?')) return;
    await deleteFormTemplate(id);
    load();
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  const isEditing = editingId !== null || showAdd;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Cấu hình form báo cáo"
        subtitle={`${templates.length} form templates — Tùy chỉnh fields cho từng role/NV`}
        breadcrumbs={[{ label: 'AI Agents', href: '/admin' }, { label: 'Cấu hình form' }]}
        actions={
          <button onClick={startAdd} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700">
            <Plus size={14} /> Thêm form
          </button>
        }
      />

      {/* Edit/Add Form */}
      {isEditing && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Sửa form template' : 'Tạo form mới'}</h3>
            <button onClick={() => { setEditingId(null); setShowAdd(false); }}><X size={16} className="text-slate-400" /></button>
          </div>

          {/* Template meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Tên form (VD: Ads Specialist)" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <select value={editForm.target_type} onChange={e => setEditForm(p => ({ ...p, target_type: e.target.value }))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              <option value="role">Theo Role</option>
              <option value="department">Theo Phòng ban</option>
              <option value="employee">Theo NV cụ thể</option>
            </select>
            {editForm.target_type === 'employee' ? (
              <select value={editForm.target_value} onChange={e => setEditForm(p => ({ ...p, target_value: e.target.value }))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
                <option value="">Chọn nhân viên</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            ) : (
              <input value={editForm.target_value} onChange={e => setEditForm(p => ({ ...p, target_value: e.target.value }))}
                placeholder={editForm.target_type === 'role' ? 'VD: Ads Specialist' : 'VD: Marketing'}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            )}
          </div>

          {/* Fields editor */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase">Fields ({editForm.fields.length})</h4>
              <button onClick={addField} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                <Plus size={12} /> Thêm field
              </button>
            </div>
            {editForm.fields.map((field, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                <div className="flex flex-col gap-0.5 flex-shrink-0">
                  <button onClick={() => moveField(idx, -1)} className="text-[8px] text-slate-400 hover:text-slate-600">▲</button>
                  <button onClick={() => moveField(idx, 1)} className="text-[8px] text-slate-400 hover:text-slate-600">▼</button>
                </div>
                <input value={field.label} onChange={e => updateField(idx, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="Label" className="flex-1 bg-white border border-slate-200 rounded px-2 py-1.5 text-[12px] min-w-0" />
                <select value={field.type} onChange={e => updateField(idx, { type: e.target.value })}
                  className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[12px] w-24">
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input value={field.unit} onChange={e => updateField(idx, { unit: e.target.value })}
                  placeholder="Đơn vị" className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[12px] w-16" />
                <input value={field.placeholder} onChange={e => updateField(idx, { placeholder: e.target.value })}
                  placeholder="VD: 500.000" className="bg-white border border-slate-200 rounded px-2 py-1.5 text-[12px] w-20" />
                <label className="flex items-center gap-1 text-[10px] text-slate-500 flex-shrink-0">
                  <input type="checkbox" checked={field.required} onChange={e => updateField(idx, { required: e.target.checked })} className="w-3 h-3" />
                  Bắt buộc
                </label>
                <button onClick={() => removeField(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !editForm.name || !editForm.target_value}
              className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {editingId ? 'Cập nhật' : 'Tạo form'}
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(t => (
          <div key={t.id} className={`bg-white rounded-xl border border-slate-200 p-4 ${editingId === t.id ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{t.name}</h3>
                <p className="text-[10px] text-slate-400">{t.target_type}: {t.target_value}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                  className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100">
                  <Eye size={13} className="text-slate-500" />
                </button>
                <button onClick={() => startEdit(t)}
                  className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center hover:bg-blue-100">
                  <Settings2 size={13} className="text-blue-600" />
                </button>
                <button onClick={() => handleDelete(t.id)}
                  className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100">
                  <Trash2 size={13} className="text-red-500" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {t.fields.slice(0, 4).map((f: FormField, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${f.required ? 'bg-red-400' : 'bg-slate-300'}`} />
                  <span className="text-slate-600">{f.label}</span>
                  <span className="text-slate-400 ml-auto">{f.type} ({f.unit})</span>
                </div>
              ))}
              {t.fields.length > 4 && <p className="text-[10px] text-slate-400">+{t.fields.length - 4} fields khác</p>}
            </div>

            {/* Preview */}
            {previewId === t.id && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Preview form</p>
                <div className="grid grid-cols-2 gap-2">
                  {t.fields.map((f: FormField, i: number) => (
                    <div key={i}>
                      <label className="text-[10px] text-slate-500">{f.label}{f.required ? ' *' : ''} ({f.unit})</label>
                      <input disabled placeholder={f.placeholder} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[11px]" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
