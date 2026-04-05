import { DepartmentGoal, IndividualPlan, AgentMessage } from '../agent-types';
import { employees, employeeCareers, departments } from '../mock-data';

// Task templates per department
const taskTemplates: Record<string, string[]> = {
  'Phòng Kế toán': ['Lập báo cáo tài chính', 'Đối soát công nợ', 'Kiểm tra sổ sách', 'Chuẩn bị báo cáo thuế', 'Phân tích chi phí'],
  'Phòng CNTT': ['Phát triển tính năng mới', 'Sửa lỗi hệ thống', 'Tối ưu hiệu suất', 'Nâng cấp bảo mật', 'Viết tài liệu kỹ thuật'],
  'Phòng Kinh doanh': ['Tìm khách hàng mới', 'Chăm sóc khách hàng', 'Đàm phán hợp đồng', 'Phân tích thị trường', 'Mở rộng kênh bán'],
  'Phòng Nhân sự': ['Tuyển dụng nhân sự', 'Đào tạo nhân viên', 'Đánh giá hiệu suất', 'Cập nhật chính sách', 'Tổ chức hoạt động'],
  'Phòng Hành chính': ['Quản lý hồ sơ', 'Tổ chức sự kiện', 'Mua sắm vật tư', 'Bảo trì cơ sở vật chất'],
  'Phòng Marketing': ['Chạy chiến dịch digital', 'Tạo nội dung marketing', 'Phân tích hiệu quả quảng cáo', 'Quản lý thương hiệu', 'SEO/SEM'],
};

export function runDeptManagerAgent(goals: DepartmentGoal[]): {
  plans: IndividualPlan[];
  messages: AgentMessage[];
} {
  const activeEmployees = employees.filter(e => e.trangThai !== 'da_nghi');
  const allPlans: IndividualPlan[] = [];
  const allMessages: AgentMessage[] = [];
  let planId = 1;

  for (const dept of departments) {
    const deptGoals = goals.filter(g => g.department === dept);
    const deptEmployees = activeEmployees.filter(e => e.phongBan === dept);
    if (deptEmployees.length === 0 || deptGoals.length === 0) continue;

    // Calculate employee level weights
    const empWeights = deptEmployees.map(emp => {
      const career = employeeCareers.find(c => c.employeeId === emp.id);
      const levelNum = parseInt((career?.levelCode || 'L3').slice(1));
      return { emp, weight: levelNum * 1.5, career };
    });
    const totalWeight = empWeights.reduce((s, e) => s + e.weight, 0);

    const templates = taskTemplates[dept] || ['Thực hiện nhiệm vụ'];

    for (const goal of deptGoals) {
      // Distribute goal across employees proportional to level weight
      empWeights.forEach((ew, empIdx) => {
        const normalizedWeight = Math.round((ew.weight / totalWeight) * 100);
        const individualTarget = Math.round(goal.targetValue * (ew.weight / totalWeight));
        const individualActual = Math.round(goal.currentValue * (ew.weight / totalWeight));
        const template = templates[empIdx % templates.length];
        const taskTitle = `${template} - ${goal.name.split(':').pop()?.trim() || goal.name}`;

        // Status based on completion
        const ratio = individualTarget > 0 ? individualActual / individualTarget : 0;
        let status: IndividualPlan['status'] = 'not_started';
        if (ratio >= 1) status = 'completed';
        else if (ratio >= 0.6) status = 'in_progress';
        else if (ratio >= 0.3) status = 'at_risk';

        // Points proportional to weight (base 10000 points = 100%)
        const points = Math.round(normalizedWeight * 100);

        allPlans.push({
          id: `ip-${planId}`,
          departmentGoalId: goal.id,
          employeeId: ew.emp.id,
          employeeName: ew.emp.name,
          taskTitle,
          description: `Đóng góp ${normalizedWeight}% cho mục tiêu "${goal.name}"`,
          targetValue: individualTarget,
          currentValue: Math.min(individualActual, individualTarget),
          unit: goal.unit,
          weight: normalizedWeight,
          deadline: '30/06/2026',
          status,
          points,
        });
        planId++;
      });
    }

    // Summary message per dept
    const deptPlans = allPlans.filter(p => deptEmployees.some(e => e.id === p.employeeId));
    const completed = deptPlans.filter(p => p.status === 'completed').length;
    const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;

    allMessages.push({
      id: `msg-dm-${dept}`,
      agentRole: 'dept_manager',
      agentName: `Trưởng phòng ${dept.replace('Phòng ', '')}`,
      timestamp: new Date().toISOString(),
      content: `${dept}: Đã phân bổ ${deptGoals.length} mục tiêu cho ${deptEmployees.length} nhân viên → ${deptPlans.length} nhiệm vụ cá nhân. Hoàn thành: ${completed}, Đang rủi ro: ${atRisk}. Phân bổ theo trọng số cấp bậc (L cao = trách nhiệm lớn hơn).`,
      type: 'decision',
    });
  }

  return { plans: allPlans, messages: allMessages };
}
