import { Employee } from '@/lib/mock-data';
import { SalaryProjection } from '@/lib/agent-types';
import { formatCurrency } from '@/lib/mock-data';
import { Mail, Phone, Calendar, Award } from 'lucide-react';

interface EmployeeProfileCardProps {
  employee: Employee;
  salary?: SalaryProjection;
}

export default function EmployeeProfileCard({ employee, salary }: EmployeeProfileCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-sm flex-shrink-0">
          {employee.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
          <p className="text-sm text-slate-500">{employee.chucVu} - {employee.phongBan}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">{employee.levelCode || 'L3'}</span>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">{employee.track || 'IC'}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
              employee.trangThai === 'dang_lam' ? 'bg-green-100 text-green-700' :
              employee.trangThai === 'nghi_phep' ? 'bg-orange-100 text-orange-700' :
              'bg-red-100 text-red-700'
            }`}>
              {employee.trangThai === 'dang_lam' ? 'Đang làm' : employee.trangThai === 'nghi_phep' ? 'Nghỉ phép' : 'Đã nghỉ'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <Mail size={13} className="text-slate-400" />
          <span className="truncate">{employee.email}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <Phone size={13} className="text-slate-400" />
          <span>{employee.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-slate-600">
          <Calendar size={13} className="text-slate-400" />
          <span>Vào: {employee.ngayVaoLam}</span>
        </div>
        {salary && (
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <Award size={13} className="text-slate-400" />
            <span className="font-medium text-blue-600">{formatCurrency(salary.projectedTotal)} đ</span>
          </div>
        )}
      </div>
    </div>
  );
}
