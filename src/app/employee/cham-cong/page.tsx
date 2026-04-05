"use client";

import { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Loader2, LogIn, LogOut } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { getEmployees, getLeaveRequests, checkIn, checkOut, getAttendanceByMonth } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

const statusLabels: Record<string, string> = { present: '✓', late: '⏰', absent: '✗', off: '—', future: '', leave: '🌴' };
const statusBg: Record<string, string> = { present: 'bg-green-50', late: 'bg-orange-50', absent: 'bg-red-50', off: 'bg-slate-50', future: 'bg-white', leave: 'bg-cyan-50' };

interface AttendanceDay {
  day: number;
  status: string;
  checkIn: string;
  checkOut: string;
}

interface AttendanceRecord {
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
}

export default function MyAttendancePage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(2026);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceDay[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [emps, leaves, attData] = await Promise.all([
        getEmployees(),
        getLeaveRequests({ employee_id: selectedEmpId, status: 'approved' }),
        getAttendanceByMonth(selectedEmpId, month, year),
      ]);
      setAllEmployees(emps);
      setLeaveUsed(leaves.reduce((s: number, l: { days: number }) => s + l.days, 0));

      // Build calendar from real data
      const daysInMonth = new Date(year, month, 0).getDate();
      const today = new Date();
      const isCurrentMonth = month === today.getMonth() + 1 && year === today.getFullYear();
      const todayDay = today.getDate();

      const days: AttendanceDay[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const record = attData.find((a: AttendanceRecord) => a.date === dateStr);

        if (dow === 0 || dow === 6) {
          days.push({ day: d, status: 'off', checkIn: '', checkOut: '' });
        } else if (isCurrentMonth && d > todayDay) {
          days.push({ day: d, status: 'future', checkIn: '', checkOut: '' });
        } else if (record) {
          const ci = record.check_in ? new Date(record.check_in).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
          const co = record.check_out ? new Date(record.check_out).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';
          days.push({ day: d, status: record.status, checkIn: ci, checkOut: co });

          if (isCurrentMonth && d === todayDay) {
            setTodayRecord(record);
          }
        } else if (isCurrentMonth && d === todayDay) {
          days.push({ day: d, status: 'future', checkIn: '', checkOut: '' });
          setTodayRecord(null);
        } else {
          // Past day with no record = absent
          days.push({ day: d, status: 'absent', checkIn: '', checkOut: '' });
        }
      }
      setAttendance(days);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [selectedEmpId, month]);

  async function handleCheckIn() {
    setActionLoading(true);
    try {
      await checkIn(selectedEmpId);
      loadData();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  }

  async function handleCheckOut() {
    setActionLoading(true);
    try {
      await checkOut(selectedEmpId);
      loadData();
    } catch (e) { console.error(e); }
    setActionLoading(false);
  }

  const present = attendance.filter(d => d.status === 'present').length;
  const late = attendance.filter(d => d.status === 'late').length;
  const absent = attendance.filter(d => d.status === 'absent').length;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  const hasCheckedIn = todayRecord?.check_in != null;
  const hasCheckedOut = todayRecord?.check_out != null;

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Chấm công</h1>
            <p className="text-sm text-slate-500 mt-1">Bảng chấm công tháng {month}/{year}</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpId(v); persistEmpId(v); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>T{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Check-in / Check-out buttons */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Hôm nay</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasCheckedIn ? `Đã vào: ${new Date(todayRecord!.check_in!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : 'Chưa chấm công vào'}
              {hasCheckedOut ? ` | Đã ra: ${new Date(todayRecord!.check_out!).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCheckIn}
              disabled={hasCheckedIn || actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              Chấm công vào
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!hasCheckedIn || hasCheckedOut || actionLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
              Chấm công ra
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={CalendarCheck} label="Ngày công" value={present + late} color="green" />
        <StatCard icon={Clock} label="Đi muộn" value={late} color="orange" />
        <StatCard icon={CalendarCheck} label="Vắng mặt" value={absent} color="red" />
        <StatCard icon={CalendarCheck} label="Phép còn" value={`${12 - leaveUsed}`} color="blue" />
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Lịch chấm công</h2>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
            <div key={`e-${i}`} className="h-12" />
          ))}
          {attendance.map(day => (
            <div key={day.day} className={`h-12 rounded-lg flex flex-col items-center justify-center ${statusBg[day.status] || 'bg-white'}`}>
              <span className="text-[9px] text-slate-400">{day.day}</span>
              <span className={`text-[13px] font-bold ${
                day.status === 'present' ? 'text-green-600' :
                day.status === 'late' ? 'text-orange-600' :
                day.status === 'absent' ? 'text-red-600' :
                day.status === 'leave' ? 'text-cyan-600' : 'text-slate-300'
              }`}>{statusLabels[day.status] || ''}</span>
              {day.checkIn && <span className="text-[7px] text-slate-400">{day.checkIn}</span>}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4 flex-wrap text-[10px]">
          <span><span className="font-bold text-green-600">✓</span> Đúng giờ</span>
          <span><span className="font-bold text-orange-600">⏰</span> Muộn</span>
          <span><span className="font-bold text-red-600">✗</span> Vắng</span>
          <span><span className="text-slate-300">—</span> Nghỉ/CN</span>
        </div>
      </div>
    </div>
  );
}
