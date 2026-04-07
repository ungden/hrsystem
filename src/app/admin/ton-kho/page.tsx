"use client";

import { useState, useEffect } from 'react';
import { Package, AlertTriangle, TrendingDown, Plus, Loader2, X, Minus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getInventory, updateInventoryStock, addInventoryItem } from '@/lib/supabase-data';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

interface InvItem {
  id: number; item_name: string; category: string; unit: string;
  current_stock: number; min_stock: number; max_stock: number;
  cost_per_unit: number; supplier: string; location: string; status: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InvItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adjusting, setAdjusting] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [newItem, setNewItem] = useState({ item_name: '', category: 'Nguyên liệu', unit: 'cái', current_stock: '', min_stock: '50', cost_per_unit: '', supplier: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setItems(await getInventory()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleAdjust(item: InvItem, delta: number) {
    const newStock = Math.max(0, item.current_stock + delta);
    await updateInventoryStock(item.id, newStock);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, current_stock: newStock, status: newStock <= 0 ? 'out_of_stock' : newStock <= i.min_stock ? 'low_stock' : 'in_stock' } : i));
    setAdjusting(null);
    setAdjustQty('');
  }

  async function handleAdd() {
    await addInventoryItem({
      item_name: newItem.item_name,
      category: newItem.category,
      unit: newItem.unit,
      current_stock: parseInt(newItem.current_stock) || 0,
      min_stock: parseInt(newItem.min_stock) || 50,
      cost_per_unit: parseInt(newItem.cost_per_unit) || 0,
      supplier: newItem.supplier,
    });
    setShowAdd(false);
    setNewItem({ item_name: '', category: 'Nguyên liệu', unit: 'cái', current_stock: '', min_stock: '50', cost_per_unit: '', supplier: '' });
    load();
  }

  const categories = [...new Set(items.map(i => i.category))];
  const filtered = catFilter ? items.filter(i => i.category === catFilter) : items;
  const lowStockCount = items.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock').length;
  const totalValue = items.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-slate-500">Đang tải tồn kho...</span></div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý tồn kho"
        subtitle={`${items.length} mặt hàng — Giá trị tồn: ${fmt(totalValue)}đ`}
        breadcrumbs={[{ label: 'Vận hành', href: '/admin' }, { label: 'Tồn kho' }]}
        actions={<button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700"><Plus size={14} /> Thêm</button>}
      />

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <p className="text-sm text-slate-700">Hàng tồn kho tự cập nhật khi có đơn hàng. <b className="text-red-600">Đỏ</b> = hết hàng, cần đặt ngay. <b className="text-amber-600">Vàng</b> = sắp hết, chuẩn bị đặt.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Tổng mặt hàng" value={items.length} color="blue" />
        <StatCard icon={AlertTriangle} label="Sắp hết / Hết" value={lowStockCount} color={lowStockCount > 0 ? 'red' : 'green'} />
        <StatCard icon={TrendingDown} label="Giá trị tồn kho" value={`${(totalValue / 1_000_000).toFixed(0)}M`} color="purple" />
        <StatCard icon={Package} label="Danh mục" value={categories.length} color="orange" />
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Thêm nguyên liệu</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input value={newItem.item_name} onChange={e => setNewItem(p => ({ ...p, item_name: e.target.value }))} placeholder="Tên NVL *" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              <option>Áo trắng</option><option>Mực in</option><option>Bao bì</option><option>Phụ liệu</option><option>Nguyên liệu</option>
            </select>
            <input value={newItem.current_stock} onChange={e => setNewItem(p => ({ ...p, current_stock: e.target.value }))} placeholder="Số lượng" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={newItem.cost_per_unit} onChange={e => setNewItem(p => ({ ...p, cost_per_unit: e.target.value }))} placeholder="Giá/đơn vị (VND)" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={newItem.supplier} onChange={e => setNewItem(p => ({ ...p, supplier: e.target.value }))} placeholder="Nhà cung cấp" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))} placeholder="Đơn vị" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleAdd} disabled={!newItem.item_name} className="mt-3 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Thêm</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả danh mục</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Inventory table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                <th className="pb-2 pr-2">Tên NVL</th>
                <th className="pb-2 pr-2">Danh mục</th>
                <th className="pb-2 pr-2 text-center">Tồn kho</th>
                <th className="pb-2 pr-2 text-center">Min</th>
                <th className="pb-2 pr-2 text-right">Giá/đvị</th>
                <th className="pb-2 pr-2">NCC</th>
                <th className="pb-2 text-center">Trạng thái</th>
                <th className="pb-2 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-2 text-[12px] font-medium text-slate-700">{item.item_name}</td>
                  <td className="py-2.5 pr-2 text-[11px] text-slate-500">{item.category}</td>
                  <td className="py-2.5 pr-2 text-center">
                    <span className={`text-[13px] font-bold ${item.current_stock <= item.min_stock ? 'text-red-600' : 'text-slate-800'}`}>
                      {fmt(item.current_stock)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">{item.unit}</span>
                  </td>
                  <td className="py-2.5 pr-2 text-center text-[11px] text-slate-400">{item.min_stock}</td>
                  <td className="py-2.5 pr-2 text-right text-[12px] text-slate-600">{fmt(item.cost_per_unit)}đ</td>
                  <td className="py-2.5 pr-2 text-[11px] text-slate-500 max-w-[120px] truncate">{item.supplier}</td>
                  <td className="py-2.5 pr-2 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      item.status === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                      item.status === 'low_stock' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {item.status === 'out_of_stock' ? 'Hết hàng' : item.status === 'low_stock' ? 'Sắp hết' : 'Đủ hàng'}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {adjusting === item.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <input type="number" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="±qty" className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-[11px] text-center" />
                        <button onClick={() => handleAdjust(item, parseInt(adjustQty) || 0)} className="text-[10px] bg-blue-600 text-white rounded px-1.5 py-1">OK</button>
                        <button onClick={() => setAdjusting(null)} className="text-[10px] text-slate-400">X</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => handleAdjust(item, -1)} className="w-6 h-6 rounded bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"><Minus size={10} /></button>
                        <button onClick={() => { setAdjusting(item.id); setAdjustQty(''); }} className="text-[10px] text-blue-600 hover:underline px-1">Nhập</button>
                        <button onClick={() => handleAdjust(item, 1)} className="w-6 h-6 rounded bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"><Plus size={10} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
