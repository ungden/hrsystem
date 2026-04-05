// ============ AI POINT ASSIGNMENT ENGINE ============
// Chấm điểm cho từng task dựa trên complexity, impact, priority
// Points quyết định KPI → lương

export interface PointResult {
  points: number;
  reason: string;
}

// 1000 pts = 1 tháng = 22 ngày × 8h = 176h
// 1 pt ≈ 10 phút | 6 pts ≈ 1h | 45 pts ≈ 1 ngày
// Planned tasks: 900 pts/tháng | Buffer ad-hoc: 100 pts
// Self-added tasks: 5-50 pts (việc phát sinh nhỏ)

export function calculateTaskPoints(task: {
  title: string;
  priority: string;
  source: string; // 'planned' | 'self_added'
  kpi_metric?: string | null;
  kpi_target?: string | null;
  department?: string;
}): PointResult {
  let pts = 15;
  let reason = '';
  const titleLower = task.title.toLowerCase();

  // Self-added tasks (ad-hoc, phát sinh) — dùng buffer 100 pts
  if (task.source === 'self_added') {
    // Estimate thời gian từ mô tả
    if (task.priority === 'high') {
      pts = 30; reason = '~5h công việc';
    } else if (task.priority === 'medium') {
      pts = 15; reason = '~2.5h công việc';
    } else {
      pts = 5; reason = '~50 phút';
    }

    // Hints từ title
    if (titleLower.includes('gọi điện') || titleLower.includes('email') || titleLower.includes('nhắn tin')) {
      pts = 3; reason = '~30 phút (liên lạc)';
    } else if (titleLower.includes('họp') || titleLower.includes('meeting')) {
      pts = 10; reason = '~1.5h (họp)';
    } else if (titleLower.includes('báo cáo') || titleLower.includes('report')) {
      pts = 20; reason = '~3.5h (báo cáo)';
    } else if (titleLower.includes('kiểm tra') || titleLower.includes('check') || titleLower.includes('QC')) {
      pts = 12; reason = '~2h (kiểm tra)';
    } else if (titleLower.includes('sửa') || titleLower.includes('fix') || titleLower.includes('xử lý')) {
      pts = 10; reason = '~1.5h (sửa/xử lý)';
    }

    reason = `NV tự thêm: ${pts} pts ≈ ${(pts / 6).toFixed(1)}h | ${reason}`;
    return { points: Math.min(50, Math.max(3, pts)), reason };
  }

  // Planned tasks — already assigned by HR Manager (900 pts/month)
  // This is fallback for new planned tasks created by admin
  if (task.priority === 'high' && task.kpi_metric) {
    pts = 180; reason = 'Ưu tiên cao + KPI (~4 ngày)';
  } else if (task.priority === 'high') {
    pts = 140; reason = 'Ưu tiên cao (~3 ngày)';
  } else if (task.priority === 'medium' && task.kpi_metric) {
    pts = 110; reason = 'Trung bình + KPI (~2.5 ngày)';
  } else if (task.priority === 'medium') {
    pts = 90; reason = 'Trung bình (~2 ngày)';
  } else {
    pts = 50; reason = 'Thấp (~1 ngày)';
  }

  return { points: Math.min(200, Math.max(30, pts)), reason };
}

// Point → Salary impact
export interface SalaryImpact {
  pointsEarned: number;
  pointsTarget: number;
  achievementPct: number;
  salaryPct: number;
  tier: string;
  tierColor: string;
  message: string;
}

export function calculateSalaryImpact(earnedPoints: number, targetPoints: number): SalaryImpact {
  const pct = targetPoints > 0 ? Math.round((earnedPoints / targetPoints) * 100) : 0;

  if (pct >= 100) {
    return {
      pointsEarned: earnedPoints, pointsTarget: targetPoints, achievementPct: pct,
      salaryPct: 100, tier: 'Xuất sắc', tierColor: 'text-green-700 bg-green-100',
      message: `Đạt ${pct}% target → Đủ lương + thưởng`,
    };
  }
  if (pct >= 80) {
    return {
      pointsEarned: earnedPoints, pointsTarget: targetPoints, achievementPct: pct,
      salaryPct: 100, tier: 'Đạt', tierColor: 'text-blue-700 bg-blue-100',
      message: `Đạt ${pct}% → Đủ lương. Cần thêm ${targetPoints - earnedPoints} pts cho thưởng`,
    };
  }
  if (pct >= 60) {
    return {
      pointsEarned: earnedPoints, pointsTarget: targetPoints, achievementPct: pct,
      salaryPct: 90, tier: 'Cảnh báo', tierColor: 'text-orange-700 bg-orange-100',
      message: `Chỉ ${pct}% → 90% lương. Cần thêm ${Math.ceil(targetPoints * 0.8) - earnedPoints} pts`,
    };
  }
  return {
    pointsEarned: earnedPoints, pointsTarget: targetPoints, achievementPct: pct,
    salaryPct: 80, tier: 'Cần cải thiện', tierColor: 'text-red-700 bg-red-100',
    message: `Chỉ ${pct}% → 80% lương. Thiếu ${targetPoints - earnedPoints} pts nghiêm trọng`,
  };
}
