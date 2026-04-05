import {
  AnnualTarget, QuarterlyMilestone, MonthlyPlan, WeeklySprint, DailyTask, TaskItem,
  EmployeeCascade,
} from './cascade-types';
import { getEmployees, getEmployeeCareers, getTasks, getMasterPlans } from '@/lib/supabase-data';

const dayNames = ['Thu 2', 'Thu 3', 'Thu 4', 'Thu 5', 'Thu 6'];

// Department-specific daily task templates (used when no real tasks exist for a day)
const deptDailyTemplates: Record<string, { title: string; kpi: string; unit: string; dailyTarget: number }[]> = {
  'Sales': [
    { title: 'Goi dien khach hang tiem nang', kpi: 'So cuoc goi', unit: 'cuoc', dailyTarget: 8 },
    { title: 'Gui bao gia/proposal', kpi: 'So bao gia', unit: 'bao gia', dailyTarget: 2 },
    { title: 'Hop/demo voi khach hang', kpi: 'So buoi demo', unit: 'buoi', dailyTarget: 1 },
    { title: 'Cap nhat CRM', kpi: 'Deals cap nhat', unit: 'deal', dailyTarget: 3 },
    { title: 'Follow-up khach hang cu', kpi: 'Follow-up', unit: 'KH', dailyTarget: 5 },
  ],
  'Marketing': [
    { title: 'Tao content social media', kpi: 'Bai dang', unit: 'bai', dailyTarget: 3 },
    { title: 'Chay & toi uu quang cao', kpi: 'Campaigns', unit: 'chien dich', dailyTarget: 2 },
    { title: 'Phan tich metrics/analytics', kpi: 'Reports', unit: 'bao cao', dailyTarget: 1 },
    { title: 'Thiet ke creative assets', kpi: 'Designs', unit: 'design', dailyTarget: 2 },
    { title: 'Quan ly leads/email marketing', kpi: 'Leads xu ly', unit: 'lead', dailyTarget: 15 },
  ],
  'Ke toan': [
    { title: 'Xu ly chung tu ke toan', kpi: 'Chung tu', unit: 'chung tu', dailyTarget: 15 },
    { title: 'Doi chieu cong no', kpi: 'Doi chieu', unit: 'KH', dailyTarget: 3 },
    { title: 'Nhap lieu so sach', kpi: 'But toan', unit: 'but toan', dailyTarget: 20 },
    { title: 'Kiem tra hoa don', kpi: 'Hoa don', unit: 'HD', dailyTarget: 10 },
    { title: 'Cap nhat bao cao', kpi: 'Bao cao', unit: 'BC', dailyTarget: 1 },
  ],
  'Van hanh': [
    { title: 'Quan ly san xuat', kpi: 'Lo hang', unit: 'lo', dailyTarget: 5 },
    { title: 'Kiem soat chat luong', kpi: 'Kiem tra', unit: 'lo', dailyTarget: 5 },
    { title: 'Quan ly kho hang', kpi: 'Cap nhat', unit: 'SKU', dailyTarget: 10 },
    { title: 'Dong goi don hang', kpi: 'Don hang', unit: 'don', dailyTarget: 20 },
    { title: 'Bao tri thiet bi', kpi: 'Thiet bi', unit: 'thiet bi', dailyTarget: 2 },
  ],
  'Ban Giam doc': [
    { title: 'Review bao cao kinh doanh', kpi: 'Bao cao', unit: 'BC', dailyTarget: 3 },
    { title: 'Hop chien luoc', kpi: 'Cuoc hop', unit: 'cuoc', dailyTarget: 2 },
    { title: 'Phe duyet de xuat', kpi: 'De xuat', unit: 'de xuat', dailyTarget: 5 },
    { title: 'Lien he doi tac/khach hang VIP', kpi: 'Lien he', unit: 'cuoc', dailyTarget: 3 },
    { title: 'Giam sat KPI team', kpi: 'KPI check', unit: 'phong ban', dailyTarget: 3 },
  ],
};

function generateDailyTasks(
  dept: string,
  weekNum: number,
  monthNum: number,
  realTasks: { id: string; title: string; points: number; status: string }[],
  employeeId: string
): DailyTask[] {
  const templates = deptDailyTemplates[dept] || deptDailyTemplates['Ban Giam doc'];
  const baseDate = new Date(2026, monthNum - 1, 1 + (weekNum - 1) * 7);
  const today = new Date(2026, 3, 5); // April 5, 2026

  // Distribute real tasks across the 5 days of the week
  const tasksPerDay = Math.max(1, Math.ceil(realTasks.length / 5));

  return dayNames.map((dayName, dayIdx) => {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + dayIdx);
    // Skip weekends
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() + 1);
    }

    const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const isPast = date < today;
    const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();

    // Get real tasks for this day slice
    const dayRealTasks = realTasks.slice(dayIdx * tasksPerDay, (dayIdx + 1) * tasksPerDay);

    let tasks: TaskItem[];

    if (dayRealTasks.length > 0) {
      // Use real tasks
      tasks = dayRealTasks.map((rt, tIdx) => ({
        id: rt.id || `task-${employeeId}-${monthNum}-${weekNum}-${dayIdx}-${tIdx}`,
        title: rt.title,
        kpiMetric: 'Points',
        targetValue: rt.points || 1,
        actualValue: rt.status === 'done' ? (rt.points || 1) : (rt.status === 'in_progress' ? Math.round((rt.points || 1) * 0.5) : 0),
        unit: 'diem',
        completed: rt.status === 'done',
      }));
    } else {
      // Fall back to templates for days with no real tasks
      tasks = templates.map((t, tIdx) => {
        const actual = isPast ? t.dailyTarget : 0;
        return {
          id: `task-${employeeId}-${monthNum}-${weekNum}-${dayIdx}-${tIdx}`,
          title: t.title,
          kpiMetric: t.kpi,
          targetValue: t.dailyTarget,
          actualValue: actual,
          unit: t.unit,
          completed: isPast,
        };
      });
    }

    const totalTarget = tasks.reduce((s, t) => s + t.targetValue, 0);
    const totalActual = tasks.reduce((s, t) => s + t.actualValue, 0);

    let status: DailyTask['status'] = 'upcoming';
    if (isPast) {
      status = totalActual >= totalTarget * 0.8 ? 'completed' : 'missed';
    } else if (isToday) {
      status = 'in_progress';
    }

    return {
      id: `day-${employeeId}-${monthNum}-${weekNum}-${dayIdx}`,
      date: dateStr,
      dayOfWeek: dayName,
      tasks,
      totalTarget,
      totalActual,
      status,
    };
  });
}

function generateWeeks(
  dept: string,
  monthNum: number,
  monthlyTarget: number,
  realTasks: { id: string; title: string; points: number; status: string }[],
  employeeId: string
): WeeklySprint[] {
  const weekTargetBase = monthlyTarget / 4;
  // Distribute real tasks across 4 weeks
  const tasksPerWeek = Math.ceil(realTasks.length / 4);

  return [1, 2, 3, 4].map(weekNum => {
    const weekTarget = Math.round(weekTargetBase);
    const weekRealTasks = realTasks.slice((weekNum - 1) * tasksPerWeek, weekNum * tasksPerWeek);
    const days = generateDailyTasks(dept, weekNum, monthNum, weekRealTasks, employeeId);
    const weekActual = days.reduce((s, d) => s + d.totalActual, 0);

    const startDay = 1 + (weekNum - 1) * 7;
    const endDay = Math.min(startDay + 4, 28);

    return {
      id: `week-${employeeId}-${monthNum}-${weekNum}`,
      weekNum,
      label: `Tuan ${weekNum}`,
      startDate: `${String(startDay).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/2026`,
      endDate: `${String(endDay).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/2026`,
      targetValue: weekTarget,
      currentValue: weekActual,
      days,
    };
  });
}

export async function generateEmployeeCascade(employeeId: string): Promise<EmployeeCascade> {
  const [employees, employeeCareers, allTasks, masterPlans] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getTasks({ assignee_id: parseInt(employeeId) }),
    getMasterPlans().catch(() => []),
  ]);

  const emp = employees.find((e: { id: number }) => String(e.id) === employeeId);
  if (!emp) return { employeeId, employeeName: '', department: '', annualTargets: [] };

  const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);

  // Annual target from master_plans for the department, or compute from total task points
  const deptPlans = masterPlans.filter((p: { role: string; department: string }) =>
    p.department === emp.department || p.role === emp.department
  );
  const totalTaskPoints = allTasks.reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);
  const doneTaskPoints = allTasks
    .filter((t: { status: string }) => t.status === 'done')
    .reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);

  // Use master plan target_value if available, else derive from tasks
  const annualTargetValue = deptPlans.length > 0 && deptPlans[0].target_value
    ? (deptPlans[0].target_value as number)
    : Math.max(totalTaskPoints, 1000); // minimum 1000 points as target

  // Group tasks by month_number
  const tasksByMonth: Record<number, { id: string; title: string; points: number; status: string }[]> = {};
  allTasks.forEach((t: { month_number: number; id: string; title: string; points: number; status: string }) => {
    const mn = t.month_number || 1;
    if (!tasksByMonth[mn]) tasksByMonth[mn] = [];
    tasksByMonth[mn].push({ id: t.id, title: t.title, points: t.points || 0, status: t.status });
  });

  // Build cascade
  const quarters: QuarterlyMilestone[] = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, qi) => {
    const qTarget = Math.round(annualTargetValue / 4);
    const monthNums = [qi * 3 + 1, qi * 3 + 2, qi * 3 + 3];

    const monthPlans: MonthlyPlan[] = monthNums.map((mn) => {
      const mTarget = Math.round(qTarget / 3);
      const monthTasks = tasksByMonth[mn] || [];

      // Calculate actual from real task completion
      const mActualPoints = monthTasks
        .filter(t => t.status === 'done')
        .reduce((s, t) => s + t.points, 0);
      const mInProgressPoints = monthTasks
        .filter(t => t.status === 'in_progress')
        .reduce((s, t) => s + Math.round(t.points * 0.5), 0);

      const isPastMonth = mn < 4; // before April 2026
      const isCurrentMonth = mn === 4;
      const mActual = isPastMonth
        ? mActualPoints + mInProgressPoints
        : (isCurrentMonth ? mActualPoints + mInProgressPoints : 0);

      let status: MonthlyPlan['status'] = 'upcoming';
      if (isPastMonth) {
        const ratio = mTarget > 0 ? mActual / mTarget : 0;
        status = ratio >= 0.9 ? 'completed' : ratio >= 0.7 ? 'on_track' : 'behind';
      } else if (isCurrentMonth) {
        status = 'on_track';
      }

      const weeks = generateWeeks(emp.department, mn, mTarget, monthTasks, employeeId);

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

    const qActual = monthPlans.reduce((s, m) => s + m.currentValue, 0);

    return {
      id: `q-${employeeId}-${q}`,
      quarter: q,
      targetValue: qTarget,
      currentValue: qActual,
      months: monthPlans,
    };
  });

  const annualActual = quarters.reduce((s, q) => s + q.currentValue, 0);

  return {
    employeeId,
    employeeName: emp.name,
    department: emp.department,
    annualTargets: [{
      id: `annual-${employeeId}`,
      year: 2026,
      name: `Muc tieu dong gop ${emp.department}`,
      category: 'contribution',
      targetValue: annualTargetValue,
      currentValue: annualActual,
      unit: 'diem',
      quarters,
    }],
  };
}

export async function generateAllCascades(): Promise<EmployeeCascade[]> {
  const employees = await getEmployees();
  return Promise.all(
    employees
      .filter((e: { status: string }) => e.status !== 'inactive')
      .map((e: { id: number }) => generateEmployeeCascade(String(e.id)))
  );
}
