"use client";

import { useState, useMemo } from 'react';
import { CalendarCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { generateAttendanceData, CURRENT_USER_ID, statusLabels, statusColors, employees } from '@/lib/mock-data';

export default function MyAttendancePage() {
  const [month, setMonth] = useState(4);
  const [year] = useState(2026);
  const emp = employees.find(e => e.id === CURRENT_USER_ID)!;

  const attendanceData = useMemo(() => generateAttendanceData(year, month), [year, month]);
  const myAttendance = attendanceData.find(a => a.employee.id === CURRENT_USER_ID);

  const daysInMonth = new Date(year, month, 0).getDate();

  return (
    <div className="p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chấm công</h1>
            <p className="text-sm text-slate-500 mt-1">Bảng chấm công tháng {month}/{year}</p>
          </div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {[1, 2, 3, 4].map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </div>
      </div>

      {myAttendance && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={CheckCircle2} label="Ngày công" value={myAttendance.cong} color="green" />
            <StatCard icon={Clock} label="Đi muộn" value={myAttendance.muon} color="orange" />
            <StatCard icon={AlertTriangle} label="Vắng mặt" value={myAttendance.nghi} color="red" />
            <StatCard icon={CalendarCheck} label="Phạt muộn" value={`${(myAttendance.tienPhat / 1000).toFixed(0)}K`} color="purple" />
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Lịch chấm công</h2>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-slate-500 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month start */}
              {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {/* Day cells */}
              {myAttendance.days.map((status, dayIdx) => {
                const label = status ? statusLabels[status] || '' : '';
                const color = status ? statusColors[status] || '' : '';
                return (
                  <div key={dayIdx} className={`h-10 rounded-lg flex flex-col items-center justify-center text-[11px] ${
                    status === 'present' ? 'bg-green-50' :
                    status === 'late' ? 'bg-orange-50' :
                    status === 'absent' ? 'bg-red-50' :
                    status === 'wfh' ? 'bg-blue-50' :
                    status === 'halfday' ? 'bg-yellow-50' :
                    'bg-slate-50'
                  }`}>
                    <span className="text-[9px] text-slate-400">{dayIdx + 1}</span>
                    <span className={`font-bold ${color}`}>{label}</span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-4 flex-wrap">
              {Object.entries(statusLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1 text-[10px]">
                  <span className={`font-bold ${statusColors[key]}`}>{label}</span>
                  <span className="text-slate-400">
                    {key === 'present' ? 'Có mặt' : key === 'late' ? 'Muộn' : key === 'absent' ? 'Vắng' : key === 'off' ? 'Nghỉ' : key === 'halfday' ? 'Nửa ngày' : 'WFH'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
