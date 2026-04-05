// ============ DAILY REPORT & PLAN VS ACTUAL TYPES ============

export interface DailyReport {
  id: string;
  employee_id: number;
  report_date: string;
  department: string;
  summary: string;
  challenges: string;
  tomorrow_plan: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  // Joined
  employee_name?: string;
  employee_role?: string;
  reviewer_name?: string;
  submissions?: TaskSubmission[];
}

export interface TaskSubmission {
  id: string;
  daily_report_id: string;
  task_id: string;
  actual_value: string;
  actual_numeric: number | null;
  notes: string;
  created_at: string;
  // Joined from task
  task_title?: string;
  kpi_metric?: string;
  kpi_target?: string;
  kpi_unit?: string;
  task_priority?: string;
  // Joined attachments
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  task_submission_id: string | null;
  daily_report_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  uploaded_by: number;
  created_at: string;
  // Computed
  url?: string;
}

export interface PlanVsActualItem {
  task_id: string;
  task_title: string;
  employee_id: number;
  employee_name: string;
  department: string;
  kpi_metric: string;
  kpi_target: string;
  kpi_unit: string;
  actual_value: string | null;
  actual_numeric: number | null;
  variance_status: 'exceeded' | 'met' | 'below' | 'missing';
  report_date: string | null;
  report_status: string | null;
}

// Role-specific KPI input configs
// Mỗi role cần nhập những chỉ số khác nhau
export interface RoleKPIConfig {
  role: string;
  department: string;
  dailyInputs: DailyInputField[];
}

export interface DailyInputField {
  key: string;
  label: string;
  unit: string;
  inputType: 'number' | 'currency' | 'percentage' | 'text' | 'file';
  placeholder: string;
  required: boolean;
}

// Role-specific daily input templates
export const ROLE_DAILY_INPUTS: Record<string, DailyInputField[]> = {
  // Ads Specialist - nhập ROAS, chi phí ads, doanh thu ads
  'Ads Specialist': [
    { key: 'ad_spend', label: 'Chi phí ads hôm nay', unit: 'VND', inputType: 'currency', placeholder: '500.000', required: true },
    { key: 'ad_revenue', label: 'Doanh thu từ ads', unit: 'VND', inputType: 'currency', placeholder: '2.500.000', required: true },
    { key: 'roas', label: 'ROAS', unit: 'x', inputType: 'number', placeholder: '5.0', required: false },
    { key: 'impressions', label: 'Impressions', unit: 'lượt', inputType: 'number', placeholder: '10000', required: false },
    { key: 'clicks', label: 'Clicks', unit: 'click', inputType: 'number', placeholder: '200', required: false },
    { key: 'ctr', label: 'CTR', unit: '%', inputType: 'percentage', placeholder: '2.0', required: false },
  ],
  // Design Lead - nhập số artwork, mockup
  'Design Lead': [
    { key: 'artworks', label: 'Artwork hoàn thành', unit: 'mẫu', inputType: 'number', placeholder: '3', required: true },
    { key: 'mockups', label: 'Mockup approved', unit: 'mockup', inputType: 'number', placeholder: '2', required: false },
    { key: 'photos', label: 'Ảnh sản phẩm chụp/edit', unit: 'ảnh', inputType: 'number', placeholder: '5', required: false },
    { key: 'videos', label: 'Video TikTok/Reels', unit: 'video', inputType: 'number', placeholder: '1', required: false },
  ],
  // CMO - nhập tổng ROAS, budget
  'CMO': [
    { key: 'total_ad_spend', label: 'Tổng chi phí MKT', unit: 'VND', inputType: 'currency', placeholder: '5.000.000', required: true },
    { key: 'total_ad_revenue', label: 'Tổng doanh thu MKT', unit: 'VND', inputType: 'currency', placeholder: '25.000.000', required: true },
    { key: 'overall_roas', label: 'ROAS tổng', unit: 'x', inputType: 'number', placeholder: '5.0', required: true },
    { key: 'meetings', label: 'Cuộc họp team', unit: 'buổi', inputType: 'number', placeholder: '1', required: false },
  ],
  // Sales Lead - nhập doanh số, đơn hàng, response time
  'Sales Lead': [
    { key: 'revenue', label: 'Doanh thu hôm nay', unit: 'VND', inputType: 'currency', placeholder: '10.000.000', required: true },
    { key: 'orders', label: 'Số đơn hàng', unit: 'đơn', inputType: 'number', placeholder: '15', required: true },
    { key: 'new_customers', label: 'Khách hàng mới', unit: 'KH', inputType: 'number', placeholder: '3', required: false },
    { key: 'response_time', label: 'Thời gian phản hồi TB', unit: 'phút', inputType: 'number', placeholder: '15', required: false },
    { key: 'b2b_contacts', label: 'Liên hệ B2B', unit: 'KH', inputType: 'number', placeholder: '2', required: false },
  ],
  // Order Manager - nhập đơn xử lý, tồn kho, return
  'Order Manager': [
    { key: 'orders_processed', label: 'Đơn đã xử lý', unit: 'đơn', inputType: 'number', placeholder: '100', required: true },
    { key: 'revenue_today', label: 'Doanh thu sàn TMĐT', unit: 'VND', inputType: 'currency', placeholder: '8.000.000', required: true },
    { key: 'returns', label: 'Đơn hoàn trả', unit: 'đơn', inputType: 'number', placeholder: '2', required: false },
    { key: 'new_skus', label: 'SKU mới đăng', unit: 'SP', inputType: 'number', placeholder: '3', required: false },
  ],
  // CSKH - nhập cuộc gọi, tin nhắn, CSAT
  'CSKH': [
    { key: 'calls', label: 'Cuộc gọi KH', unit: 'cuộc', inputType: 'number', placeholder: '20', required: true },
    { key: 'messages', label: 'Tin nhắn trả lời', unit: 'tin', inputType: 'number', placeholder: '50', required: true },
    { key: 'resolved', label: 'Vấn đề đã xử lý', unit: 'vấn đề', inputType: 'number', placeholder: '10', required: false },
    { key: 'csat_score', label: 'CSAT trung bình', unit: '%', inputType: 'percentage', placeholder: '90', required: false },
  ],
  // Production Manager - nhập số áo SX, QC, tồn kho
  'Production': [
    { key: 'units_produced', label: 'Số áo in/sản xuất', unit: 'áo', inputType: 'number', placeholder: '100', required: true },
    { key: 'qc_passed', label: 'Đạt QC', unit: 'áo', inputType: 'number', placeholder: '98', required: true },
    { key: 'qc_failed', label: 'Lỗi QC', unit: 'áo', inputType: 'number', placeholder: '2', required: false },
    { key: 'orders_packed', label: 'Đơn đóng gói', unit: 'đơn', inputType: 'number', placeholder: '80', required: false },
    { key: 'materials_used', label: 'Nguyên liệu sử dụng', unit: 'áo trắng', inputType: 'number', placeholder: '110', required: false },
  ],
  // Kế toán - nhập chứng từ, đối chiếu, bút toán
  'Accounting': [
    { key: 'vouchers', label: 'Chứng từ xử lý', unit: 'chứng từ', inputType: 'number', placeholder: '15', required: true },
    { key: 'invoices', label: 'Hóa đơn nhập liệu', unit: 'hóa đơn', inputType: 'number', placeholder: '10', required: true },
    { key: 'reconciled', label: 'KH đối chiếu công nợ', unit: 'KH', inputType: 'number', placeholder: '3', required: false },
    { key: 'journal_entries', label: 'Bút toán nhập', unit: 'bút toán', inputType: 'number', placeholder: '20', required: false },
    { key: 'expense_total', label: 'Tổng chi phí ghi nhận', unit: 'VND', inputType: 'currency', placeholder: '5.000.000', required: false },
  ],
  // CEO - nhập quyết định, review
  'CEO': [
    { key: 'decisions', label: 'Quyết định quan trọng', unit: 'QĐ', inputType: 'number', placeholder: '2', required: false },
    { key: 'meetings', label: 'Cuộc họp', unit: 'buổi', inputType: 'number', placeholder: '3', required: false },
    { key: 'reviews', label: 'Review báo cáo', unit: 'báo cáo', inputType: 'number', placeholder: '5', required: false },
  ],
  // TP Marketing - nhập chiến lược, review
  'Marketing Manager': [
    { key: 'campaigns_reviewed', label: 'Chiến dịch review', unit: 'CD', inputType: 'number', placeholder: '3', required: true },
    { key: 'total_spend', label: 'Tổng chi MKT', unit: 'VND', inputType: 'currency', placeholder: '3.000.000', required: true },
    { key: 'leads', label: 'Leads mới', unit: 'lead', inputType: 'number', placeholder: '10', required: false },
    { key: 'content_pieces', label: 'Content đã duyệt', unit: 'bài', inputType: 'number', placeholder: '5', required: false },
  ],
};

// Map employee role to KPI config key
export function getRoleInputKey(role: string): string {
  if (role.includes('CEO') || role.includes('Founder')) return 'CEO';
  if (role.includes('CMO')) return 'CMO';
  if (role.includes('Ads Specialist')) return 'Ads Specialist';
  if (role.includes('Design') || role.includes('Banana')) return 'Design Lead';
  if (role.includes('Trưởng phòng Marketing') || role.includes('TP Marketing')) return 'Marketing Manager';
  if (role.includes('Trưởng nhóm Sales') || role.includes('Sales Lead')) return 'Sales Lead';
  if (role.includes('Quản lý đơn hàng') || role.includes('Sàn TMĐT')) return 'Order Manager';
  if (role.includes('CSKH') || role.includes('Telesales')) return 'CSKH';
  if (role.includes('Quản lý Sản xuất') || role.includes('Kho')) return 'Production';
  if (role.includes('In ấn') || role.includes('Đóng gói')) return 'Production';
  if (role.includes('Kế toán') || role.includes('HR')) return 'Accounting';
  return 'CEO'; // fallback
}
