import { AgentProfile, AgentRole } from '../agent-types';

export const agentProfiles: Record<AgentRole, AgentProfile> = {
  ceo: {
    role: 'ceo',
    name: 'AI CEO',
    title: 'Giám đốc Chiến lược',
    avatar: 'CEO',
    color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    description: 'Thiết lập mục tiêu kinh doanh, giám sát toàn bộ tiến độ công ty',
  },
  hr_director: {
    role: 'hr_director',
    name: 'AI HR Director',
    title: 'Giám đốc Nhân sự',
    avatar: 'HR',
    color: 'bg-gradient-to-br from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    description: 'Phân bổ nhân sự, lập kế hoạch phát triển, đánh giá năng lực',
  },
  finance: {
    role: 'finance',
    name: 'AI CFO',
    title: 'Giám đốc Tài chính',
    avatar: 'CFO',
    color: 'bg-gradient-to-br from-emerald-500 to-green-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    description: 'Quản lý chi phí nhân sự, dự báo ngân sách, tính toán lương thưởng',
  },
  dept_manager: {
    role: 'dept_manager',
    name: 'AI Dept Managers',
    title: 'Trưởng phòng AI',
    avatar: 'TrP',
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    description: 'Phân rã mục tiêu phòng ban thành nhiệm vụ cá nhân cho từng nhân viên',
  },
  performance_coach: {
    role: 'performance_coach',
    name: 'AI Coach',
    title: 'Huấn luyện viên Hiệu suất',
    avatar: 'HLV',
    color: 'bg-gradient-to-br from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-700',
    description: 'Theo dõi tiến độ, cảnh báo rủi ro, đề xuất cải thiện hiệu suất',
  },
};

export const allAgentRoles: AgentRole[] = ['ceo', 'hr_director', 'finance', 'dept_manager', 'performance_coach'];

export function getAgentProfile(role: AgentRole): AgentProfile {
  return agentProfiles[role];
}
