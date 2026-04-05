"use client";

import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle2, Clock, Loader2, Plus, X, Printer, PackageCheck, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getOrders, getOrderItems, getEmployees, updateOrderStatus, addOrder } from '@/lib/supabase-data';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

const statusFlow = ['new', 'confirmed', 'printing', 'packing', 'shipped', 'delivered', 'returned', 'cancelled'];
const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  new: { label: 'Mới', bg: 'bg-blue-100', text: 'text-blue-700' },
  confirmed: { label: 'Xác nhận', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  printing: { label: 'Đang in', bg: 'bg-purple-100', text: 'text-purple-700' },
  packing: { label: 'Đóng gói', bg: 'bg-orange-100', text: 'text-orange-700' },
  shipped: { label: 'Đã giao ĐVVC', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  delivered: { label: 'Đã giao', bg: 'bg-green-100', text: 'text-green-700' },
  returned: { label: 'Hoàn trả', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Hủy', bg: 'bg-slate-100', text: 'text-slate-500' },
};

interface Order {
  id: number; order_code: string; channel: string; customer_name: string; customer_phone: string;
  customer_address: string; status: string; total_amount: number; shipping_fee: number; net_amount: number;
  payment_method: string; payment_status: string; shipping_partner: string; tracking_code: string;
  notes: string; assigned_to: number; created_at: string;
}

interface OrderItem {
  id: number; product_name: string; sku: string; size: string; color: string;
  quantity: number; unit_price: number; total_price: number; print_status: string;
}

export default function OrderManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<number, OrderItem[]>>({});
  const [employees, setEmployees] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer_name: '', customer_phone: '', customer_address: '', channel: 'Shopee', total_amount: '', notes: '' });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ords, emps] = await Promise.all([getOrders(), getEmployees()]);
      setOrders(ords);
      const empMap: Record<number, string> = {};
      emps.forEach((e: { id: number; name: string }) => { empMap[e.id] = e.name; });
      setEmployees(empMap);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleExpand(id: number) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!items[id]) {
      const orderItems = await getOrderItems(id);
      setItems(prev => ({ ...prev, [id]: orderItems }));
    }
  }

  async function handleStatusChange(orderId: number, newStatus: string) {
    await updateOrderStatus(orderId, newStatus);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  }

  async function handleAddOrder() {
    const code = `TW-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(orders.length + 1).padStart(3, '0')}`;
    await addOrder({
      order_code: code,
      channel: newOrder.channel,
      customer_name: newOrder.customer_name,
      customer_phone: newOrder.customer_phone,
      customer_address: newOrder.customer_address,
      total_amount: parseInt(newOrder.total_amount) || 0,
      net_amount: parseInt(newOrder.total_amount) || 0,
      notes: newOrder.notes,
      status: 'new',
    });
    setShowAddForm(false);
    setNewOrder({ customer_name: '', customer_phone: '', customer_address: '', channel: 'Shopee', total_amount: '', notes: '' });
    loadData();
  }

  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (channelFilter && o.channel !== channelFilter) return false;
    return true;
  });

  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.net_amount, 0);
  const pendingCount = orders.filter(o => ['new', 'confirmed'].includes(o.status)).length;
  const processingCount = orders.filter(o => ['printing', 'packing'].includes(o.status)).length;
  const channels = [...new Set(orders.map(o => o.channel))];

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-slate-500">Đang tải đơn hàng...</span></div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý đơn hàng"
        subtitle={`${orders.length} đơn hàng — ${fmt(totalRevenue)} đ đã giao`}
        breadcrumbs={[{ label: 'Vận hành', href: '/admin' }, { label: 'Đơn hàng' }]}
        actions={
          <button onClick={() => setShowAddForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700">
            <Plus size={14} /> Thêm đơn
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Tổng đơn" value={orders.length} color="blue" />
        <StatCard icon={Clock} label="Chờ xử lý" value={pendingCount} color="orange" />
        <StatCard icon={Printer} label="Đang in/gói" value={processingCount} color="purple" />
        <StatCard icon={CheckCircle2} label="Đã giao" value={orders.filter(o => o.status === 'delivered').length} color="green" />
      </div>

      {/* Add Order Modal */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Thêm đơn hàng mới</h3>
            <button onClick={() => setShowAddForm(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={newOrder.customer_name} onChange={e => setNewOrder(p => ({ ...p, customer_name: e.target.value }))} placeholder="Tên khách hàng *" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <input value={newOrder.customer_phone} onChange={e => setNewOrder(p => ({ ...p, customer_phone: e.target.value }))} placeholder="Số điện thoại" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            <select value={newOrder.channel} onChange={e => setNewOrder(p => ({ ...p, channel: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              {['Shopee', 'TikTok', 'Website', 'FB/IG', 'B2B'].map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={newOrder.customer_address} onChange={e => setNewOrder(p => ({ ...p, customer_address: e.target.value }))} placeholder="Địa chỉ giao hàng" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm sm:col-span-2" />
            <input value={newOrder.total_amount} onChange={e => setNewOrder(p => ({ ...p, total_amount: e.target.value }))} placeholder="Tổng tiền (VND)" type="number" className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <button onClick={handleAddOrder} disabled={!newOrder.customer_name} className="mt-3 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Tạo đơn hàng
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả kênh</option>
          {channels.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Order List */}
      <div className="space-y-2">
        {filtered.map(order => {
          const sc = statusConfig[order.status] || statusConfig.new;
          const isExp = expandedId === order.id;
          const nextStatus = statusFlow[statusFlow.indexOf(order.status) + 1];
          return (
            <div key={order.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => handleExpand(order.id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{order.order_code}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{order.channel}</span>
                    {order.payment_status === 'paid' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Đã TT</span>}
                  </div>
                  <p className="text-[12px] text-slate-500 mt-0.5">{order.customer_name} — {order.customer_phone}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-800">{fmt(order.net_amount)}đ</p>
                  <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              </button>

              {isExp && (
                <div className="border-t border-slate-100 p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px] mb-4">
                    <div><span className="text-slate-400">Địa chỉ:</span> <span className="text-slate-700">{order.customer_address}</span></div>
                    <div><span className="text-slate-400">Thanh toán:</span> <span className="text-slate-700">{order.payment_method}</span></div>
                    <div><span className="text-slate-400">ĐVVC:</span> <span className="text-slate-700">{order.shipping_partner || '—'}</span></div>
                    <div><span className="text-slate-400">Mã vận đơn:</span> <span className="text-slate-700">{order.tracking_code || '—'}</span></div>
                    <div><span className="text-slate-400">Xử lý:</span> <span className="text-slate-700">{employees[order.assigned_to] || 'Chưa giao'}</span></div>
                    <div><span className="text-slate-400">Phí ship:</span> <span className="text-slate-700">{fmt(order.shipping_fee)}đ</span></div>
                  </div>

                  {/* Order items */}
                  {items[order.id] && (
                    <div className="mb-4">
                      <h4 className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Sản phẩm</h4>
                      <div className="space-y-1">
                        {items[order.id].map(item => (
                          <div key={item.id} className="flex items-center gap-2 text-[12px] bg-slate-50 rounded-lg p-2">
                            <span className="flex-1 text-slate-700">{item.product_name}</span>
                            <span className="text-slate-500">{item.size}/{item.color}</span>
                            <span className="text-slate-600">x{item.quantity}</span>
                            <span className="font-medium text-slate-800">{fmt(item.total_price)}đ</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${item.print_status === 'done' ? 'bg-green-100 text-green-700' : item.print_status === 'printing' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                              {item.print_status === 'done' ? 'In xong' : item.print_status === 'printing' ? 'Đang in' : 'Chờ in'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status progression */}
                  {nextStatus && !['cancelled', 'returned'].includes(order.status) && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => handleStatusChange(order.id, nextStatus)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700">
                        <PackageCheck size={14} /> Chuyển → {statusConfig[nextStatus]?.label}
                      </button>
                      {!['delivered', 'shipped'].includes(order.status) && (
                        <button onClick={() => handleStatusChange(order.id, 'cancelled')}
                          className="flex items-center gap-1.5 bg-red-50 text-red-600 rounded-lg px-3 py-2 text-sm font-medium hover:bg-red-100">
                          <X size={14} /> Hủy
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
