"use client";

import { useState, useEffect } from 'react';
import { ShoppingBag, Tag, Plus, Loader2, X, Edit, Package } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getProducts, addProduct, updateProduct } from '@/lib/supabase-data';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

interface Product {
  id: number; name: string; sku: string; category: string; base_price: number; cost_price: number;
  sizes: string; colors: string; image_url: string; status: string; collection: string; stock_quantity: number;
}

export default function ProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', sku: '', category: 'Áo thun', base_price: '', cost_price: '', sizes: 'S,M,L,XL,XXL', collection: '', stock_quantity: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { setProducts(await getProducts()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSave() {
    const data = {
      name: form.name, sku: form.sku, category: form.category,
      base_price: parseInt(form.base_price) || 0,
      cost_price: parseInt(form.cost_price) || 0,
      sizes: form.sizes, collection: form.collection,
      stock_quantity: parseInt(form.stock_quantity) || 0,
    };
    if (editId) {
      await updateProduct(editId, data);
    } else {
      await addProduct(data);
    }
    setShowAdd(false); setEditId(null);
    setForm({ name: '', sku: '', category: 'Áo thun', base_price: '', cost_price: '', sizes: 'S,M,L,XL,XXL', collection: '', stock_quantity: '' });
    load();
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name, sku: p.sku, category: p.category,
      base_price: String(p.base_price), cost_price: String(p.cost_price),
      sizes: p.sizes || '', collection: p.collection || '', stock_quantity: String(p.stock_quantity),
    });
    setEditId(p.id); setShowAdd(true);
  }

  async function toggleStatus(p: Product) {
    await updateProduct(p.id, { status: p.status === 'active' ? 'inactive' : 'active' });
    load();
  }

  const active = products.filter(p => p.status === 'active');
  const totalSKU = products.length;
  const collections = [...new Set(products.map(p => p.collection).filter(Boolean))];
  const avgMargin = active.length > 0
    ? Math.round(active.reduce((s, p) => s + (p.base_price > 0 ? (p.base_price - p.cost_price) / p.base_price * 100 : 0), 0) / active.length)
    : 0;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-slate-500">Đang tải sản phẩm...</span></div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý sản phẩm"
        subtitle={`${totalSKU} SKU — ${collections.length} bộ sưu tập`}
        breadcrumbs={[{ label: 'Vận hành', href: '/admin' }, { label: 'Sản phẩm' }]}
        actions={<button onClick={() => { setShowAdd(true); setEditId(null); }} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700"><Plus size={14} /> Thêm SP</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingBag} label="Tổng SKU" value={totalSKU} color="blue" />
        <StatCard icon={Tag} label="Đang bán" value={active.length} color="green" />
        <StatCard icon={Package} label="Bộ sưu tập" value={collections.length} color="purple" />
        <StatCard icon={ShoppingBag} label="Margin TB" value={`${avgMargin}%`} color="orange" />
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">{editId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
            <button onClick={() => { setShowAdd(false); setEditId(null); }}><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Tên sản phẩm *" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm sm:col-span-2" />
            <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="Mã SKU *" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              <option>Áo thun</option><option>Áo Polo</option><option>Hoodie</option><option>Phụ kiện</option>
            </select>
            <input value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} placeholder="Giá bán (VND)" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))} placeholder="Giá vốn (VND)" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.sizes} onChange={e => setForm(p => ({ ...p, sizes: e.target.value }))} placeholder="Sizes (S,M,L,XL)" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.collection} onChange={e => setForm(p => ({ ...p, collection: e.target.value }))} placeholder="Bộ sưu tập" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={form.stock_quantity} onChange={e => setForm(p => ({ ...p, stock_quantity: e.target.value }))} placeholder="Số lượng tồn" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleSave} disabled={!form.name || !form.sku} className="mt-3 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {editId ? 'Cập nhật' : 'Thêm sản phẩm'}
          </button>
        </div>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map(p => {
          const margin = p.base_price > 0 ? Math.round((p.base_price - p.cost_price) / p.base_price * 100) : 0;
          return (
            <div key={p.id} className={`bg-white rounded-xl border ${p.status === 'active' ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-60'} p-4`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                  <p className="text-[10px] text-slate-400">{p.sku}</p>
                </div>
                <button onClick={() => startEdit(p)} className="text-slate-400 hover:text-blue-600"><Edit size={14} /></button>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{p.category}</span>
                {p.collection && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{p.collection}</span>}
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] mb-3">
                <div><span className="text-slate-400">Giá bán:</span> <span className="font-medium text-slate-800">{fmt(p.base_price)}đ</span></div>
                <div><span className="text-slate-400">Giá vốn:</span> <span className="text-slate-600">{fmt(p.cost_price)}đ</span></div>
                <div><span className="text-slate-400">Margin:</span> <span className={`font-medium ${margin >= 50 ? 'text-green-600' : 'text-orange-600'}`}>{margin}%</span></div>
                <div><span className="text-slate-400">Tồn:</span> <span className={`font-medium ${p.stock_quantity < 50 ? 'text-red-600' : 'text-slate-700'}`}>{p.stock_quantity}</span></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Sizes: {p.sizes}</span>
                <button onClick={() => toggleStatus(p)} className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {p.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
