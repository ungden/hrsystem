"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { setSelectedEmpId } from '@/lib/employee-context';
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  /** After login, map auth email → employee record → persist + redirect by role */
  async function loginAndRoute(authEmail: string) {
    const supabase = createClient();
    const { data: emp } = await supabase
      .from('employees')
      .select('id, role')
      .eq('email', authEmail)
      .eq('status', 'Đang làm việc')
      .single();

    if (emp) {
      setSelectedEmpId(emp.id);
      const isCEO = emp.role?.includes('CEO') || emp.role?.includes('Founder');
      // CEO/Admin → admin dashboard, NV → employee portal
      router.push(isCEO ? '/admin' : '/employee');
    } else {
      // Authenticated but no employee record → still allow admin access
      router.push('/admin');
    }
    router.refresh();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('');
        alert('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loginAndRoute(data.user.email || email);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Demo mode: skip auth, set employee context
  const handleDemoAdmin = () => {
    setSelectedEmpId(1); // CEO - Trần Thiên Dương
    router.push('/admin');
  };

  const handleDemoEmployee = () => {
    setSelectedEmpId(2); // First regular employee
    router.push('/employee');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
            <span className="text-white font-bold text-2xl">TW</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-4">Teeworld AI Agents</h1>
          <p className="text-sm text-slate-500 mt-1">11 AI Agents vận hành doanh nghiệp graphic tees</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">
            {isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@company.vn"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              {loading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-blue-600 hover:text-blue-800">
              {isRegister ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
            </button>
          </div>

          {/* Demo Mode */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center mb-3">DEMO MODE — Chọn vai trò để trải nghiệm</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleDemoAdmin} className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
                CEO / Admin
              </button>
              <button onClick={handleDemoEmployee} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium py-2.5 rounded-xl transition-colors">
                Nhân viên
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-3">
              11 NV | 696 tasks | 8 SP | 8 đơn hàng | 15 NVL | KH vs Thực tế
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
