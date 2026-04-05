import {
  AnnualTarget, QuarterlyMilestone, MonthlyPlan, WeeklySprint, DailyTask, TaskItem,
  EmployeeCascade,
} from './cascade-types';
import { employees, employeeCareers, departments } from './mock-data';

function prand(seed: number, n: number): number {
  return ((seed * 17 + n * 31 + seed * n * 7) % 1000) / 1000;
}

const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'];

// Department-specific daily task templates
const deptDailyTemplates: Record<string, { title: string; kpi: string; unit: string; dailyTarget: number }[]> = {
  'Phòng Kinh doanh': [
    { title: 'Gọi điện khách hàng tiềm năng', kpi: 'Số cuộc gọi', unit: 'cuộc', dailyTarget: 8 },
    { title: 'Gửi báo giá/proposal', kpi: 'Số báo giá', unit: 'báo giá', dailyTarget: 2 },
    { title: 'Họp/demo với khách hàng', kpi: 'Số buổi demo', unit: 'buổi', dailyTarget: 1 },
    { title: 'Cập nhật CRM', kpi: 'Deals cập nhật', unit: 'deal', dailyTarget: 3 },
    { title: 'Follow-up khách hàng cũ', kpi: 'Follow-up', unit: 'KH', dailyTarget: 5 },
  ],
  'Phòng CNTT': [
    { title: 'Code & review pull requests', kpi: 'PRs hoàn thành', unit: 'PR', dailyTarget: 2 },
    { title: 'Fix bugs & issues', kpi: 'Bugs fixed', unit: 'bug', dailyTarget: 3 },
    { title: 'Viết unit tests', kpi: 'Test coverage', unit: 'test', dailyTarget: 5 },
    { title: 'Deploy & monitoring', kpi: 'Deployments', unit: 'deploy', dailyTarget: 1 },
    { title: 'Tech documentation', kpi: 'Pages viết', unit: 'trang', dailyTarget: 1 },
  ],
  'Phòng Kế toán': [
    { title: 'Xử lý chứng từ kế toán', kpi: 'Chứng từ', unit: 'chứng từ', dailyTarget: 15 },
    { title: 'Đối chiếu công nợ', kpi: 'Đối chiếu', unit: 'KH', dailyTarget: 3 },
    { title: 'Nhập liệu sổ sách', kpi: 'Bút toán', unit: 'bút toán', dailyTarget: 20 },
    { title: 'Kiểm tra hóa đơn', kpi: 'Hóa đơn', unit: 'HĐ', dailyTarget: 10 },
    { title: 'Cập nhật báo cáo', kpi: 'Báo cáo', unit: 'BC', dailyTarget: 1 },
  ],
  'Phòng Nhân sự': [
    { title: 'Sàng lọc CV ứng viên', kpi: 'CV reviewed', unit: 'CV', dailyTarget: 10 },
    { title: 'Phỏng vấn ứng viên', kpi: 'Phỏng vấn', unit: 'buổi', dailyTarget: 1 },
    { title: 'Xử lý đơn từ nhân viên', kpi: 'Đơn xử lý', unit: 'đơn', dailyTarget: 5 },
    { title: 'Cập nhật hồ sơ nhân sự', kpi: 'Hồ sơ', unit: 'hồ sơ', dailyTarget: 3 },
    { title: 'Tổ chức training/onboarding', kpi: 'Sessions', unit: 'buổi', dailyTarget: 1 },
  ],
  'Phòng Hành chính': [
    { title: 'Quản lý công văn đến/đi', kpi: 'Công văn', unit: 'CV', dailyTarget: 8 },
    { title: 'Xử lý yêu cầu hành chính', kpi: 'Yêu cầu', unit: 'YC', dailyTarget: 5 },
    { title: 'Kiểm tra cơ sở vật chất', kpi: 'Kiểm tra', unit: 'hạng mục', dailyTarget: 3 },
    { title: 'Mua sắm văn phòng phẩm', kpi: 'Đơn hàng', unit: 'đơn', dailyTarget: 2 },
    { title: 'Lưu trữ hồ sơ', kpi: 'Hồ sơ', unit: 'bộ', dailyTarget: 5 },
  ],
  'Phòng Marketing': [
    { title: 'Tạo content social media', kpi: 'Bài đăng', unit: 'bài', dailyTarget: 3 },
    { title: 'Chạy & tối ưu quảng cáo', kpi: 'Campaigns', unit: 'chiến dịch', dailyTarget: 2 },
    { title: 'Phân tích metrics/analytics', kpi: 'Reports', unit: 'báo cáo', dailyTarget: 1 },
    { title: 'Thiết kế creative assets', kpi: 'Designs', unit: 'design', dailyTarget: 2 },
    { title: 'Quản lý leads/email marketing', kpi: 'Leads xử lý', unit: 'lead', dailyTarget: 15 },
  ],
};

function generateDailyTasks(dept: string, weekNum: number, monthNum: number, seed: number): DailyTask[] {
  const templates = deptDailyTemplates[dept] || deptDailyTemplates['Phòng Hành chính'];
  const baseDate = new Date(2026, monthNum - 1, 1 + (weekNum - 1) * 7);

  return dayNames.map((dayName, dayIdx) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayIdx);
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const isPast = date < new Date(2026, 3, 5); // before April 5, 2026

    const tasks: TaskItem[] = templates.map((t, tIdx) => {
      const variance = prand(seed + dayIdx + tIdx, weekNum + monthNum);
      const actual = isPast ? Math.round(t.dailyTarget * (0.6 + variance * 0.6)) : 0;
      return {
        id: `task-${seed}-${weekNum}-${dayIdx}-${tIdx}`,
        title: t.title,
        kpiMetric: t.kpi,
        targetValue: t.dailyTarget,
        actualValue: actual,
        unit: t.unit,
        completed: isPast && actual >= t.dailyTarget,
      };
    });

    const totalTarget = tasks.reduce((s, t) => s + t.targetValue, 0);
    const totalActual = tasks.reduce((s, t) => s + t.actualValue, 0);

    let status: DailyTask['status'] = 'upcoming';
    if (isPast) {
      status = totalActual >= totalTarget * 0.8 ? 'completed' : 'missed';
    } else if (dateStr === '05/04/2026') {
      status = 'in_progress';
    }

    return {
      id: `day-${seed}-${weekNum}-${dayIdx}`,
      date: dateStr,
      dayOfWeek: dayName,
      tasks,
      totalTarget,
      totalActual,
      status,
    };
  });
}

function generateWeeks(dept: string, monthNum: number, monthlyTarget: number, seed: number): WeeklySprint[] {
  const weekTargetBase = monthlyTarget / 4;

  return [1, 2, 3, 4].map(weekNum => {
    const weekTarget = Math.round(weekTargetBase * (0.9 + prand(seed, weekNum) * 0.2));
    const days = generateDailyTasks(dept, weekNum, monthNum, seed + weekNum * 100);
    const weekActual = days.reduce((s, d) => s + d.totalActual, 0);

    const startDay = 1 + (weekNum - 1) * 7;
    const endDay = Math.min(startDay + 4, 28);

    return {
      id: `week-${seed}-${monthNum}-${weekNum}`,
      weekNum,
      label: `Tuần ${weekNum}`,
      startDate: `${String(startDay).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/2026`,
      endDate: `${String(endDay).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/2026`,
      targetValue: weekTarget,
      currentValue: weekActual,
      days,
    };
  });
}

export function generateEmployeeCascade(employeeId: string): EmployeeCascade {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) return { employeeId, employeeName: '', department: '', annualTargets: [] };

  const career = employeeCareers.find(c => c.employeeId === employeeId);
  const levelNum = parseInt((career?.levelCode || 'L3').slice(1));
  const seed = parseInt(employeeId) * 100;

  // Employee's weighted share based on level
  const deptEmps = employees.filter(e => e.phongBan === emp.phongBan && e.trangThai !== 'da_nghi');
  const empWeights = deptEmps.map(e => {
    const c = employeeCareers.find(ec => ec.employeeId === e.id);
    return parseInt((c?.levelCode || 'L3').slice(1)) * 1.5;
  });
  const totalWeight = empWeights.reduce((s, w) => s + w, 0);
  const myWeight = (levelNum * 1.5) / totalWeight;

  // Annual revenue target for this employee (based on company total)
  const totalSalary = employeeCareers.reduce((s, c) => s + c.currentSalary, 0);
  const companyRevenue = totalSalary * 3.5 * 12; // annual
  const deptWeights: Record<string, number> = {
    'Phòng Kinh doanh': 0.45, 'Phòng Marketing': 0.20, 'Phòng CNTT': 0.18,
    'Phòng Kế toán': 0.05, 'Phòng Nhân sự': 0.02, 'Phòng Hành chính': 0.02,
  };
  const deptShare = deptWeights[emp.phongBan] || 0.05;
  const annualTarget = Math.round(companyRevenue * deptShare * myWeight);

  // Build cascade
  const quarters: QuarterlyMilestone[] = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, qi) => {
    const qTarget = Math.round(annualTarget / 4 * (0.9 + prand(seed, qi) * 0.2));
    const monthNums = [qi * 3 + 1, qi * 3 + 2, qi * 3 + 3];

    const months: MonthlyPlan[] = monthNums.map((mn, mi) => {
      const mTarget = Math.round(qTarget / 3 * (0.95 + prand(seed + mn, mi) * 0.1));
      const isPastMonth = mn < 4; // before April 2026
      const isCurrentMonth = mn === 4;
      const mActual = isPastMonth ? Math.round(mTarget * (0.7 + prand(seed, mn) * 0.4)) : (isCurrentMonth ? Math.round(mTarget * 0.3) : 0);

      let status: MonthlyPlan['status'] = 'upcoming';
      if (isPastMonth) {
        const ratio = mActual / mTarget;
        status = ratio >= 0.9 ? 'completed' : ratio >= 0.7 ? 'on_track' : 'behind';
      } else if (isCurrentMonth) {
        status = 'on_track';
      }

      const weeks = generateWeeks(emp.phongBan, mn, mTarget, seed + mn);

      return {
        id: `month-${employeeId}-${mn}`,
        month: `T${mn}/2026`,
        monthNum: mn,
        targetValue: mTarget,
        currentValue: mActual,
        status,
        weeks,
      };
    });

    const qActual = months.reduce((s, m) => s + m.currentValue, 0);

    return {
      id: `q-${employeeId}-${q}`,
      quarter: q,
      targetValue: qTarget,
      currentValue: qActual,
      months,
    };
  });

  const annualActual = quarters.reduce((s, q) => s + q.currentValue, 0);

  return {
    employeeId,
    employeeName: emp.name,
    department: emp.phongBan,
    annualTargets: [{
      id: `annual-${employeeId}`,
      year: 2026,
      name: `Mục tiêu đóng góp ${emp.phongBan.replace('Phòng ', '')}`,
      category: 'contribution',
      targetValue: annualTarget,
      currentValue: annualActual,
      unit: 'VND',
      quarters,
    }],
  };
}

export function generateAllCascades(): EmployeeCascade[] {
  return employees
    .filter(e => e.trangThai !== 'da_nghi')
    .map(e => generateEmployeeCascade(e.id));
}
