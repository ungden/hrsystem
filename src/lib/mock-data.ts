// Employee data
export interface Employee {
  id: string;
  name: string;
  maSo: string;
  phongBan: string;
  email: string;
  phone: string;
  chucVu: string;
  ngayVaoLam: string;
  trangThai: "dang_lam" | "nghi_phep" | "da_nghi";
  avatar?: string;
}

export const employees: Employee[] = [
  { id: "1", name: "Pham Thi Dung", maSo: "NV001", phongBan: "Phòng Kế toán", email: "dung.pt@company.vn", phone: "0901234001", chucVu: "Trưởng phòng", ngayVaoLam: "15/03/2019", trangThai: "dang_lam" },
  { id: "2", name: "Tran Thi Anh Tuyet", maSo: "NV002", phongBan: "Phòng Kế toán", email: "tuyet.tta@company.vn", phone: "0901234002", chucVu: "Nhân viên", ngayVaoLam: "20/06/2020", trangThai: "dang_lam" },
  { id: "3", name: "Hoang Thai Son", maSo: "NV003", phongBan: "Phòng CNTT", email: "son.ht@company.vn", phone: "0901234003", chucVu: "Trưởng phòng", ngayVaoLam: "01/01/2018", trangThai: "dang_lam" },
  { id: "4", name: "Bui Van Duong", maSo: "NV004", phongBan: "Phòng Kinh doanh", email: "duong.bv@company.vn", phone: "0901234004", chucVu: "Nhân viên", ngayVaoLam: "10/09/2021", trangThai: "dang_lam" },
  { id: "5", name: "Dang Hoang Son", maSo: "NV005", phongBan: "Phòng Nhân sự", email: "son.dh@company.vn", phone: "0901234005", chucVu: "Trưởng phòng", ngayVaoLam: "05/04/2017", trangThai: "dang_lam" },
  { id: "6", name: "Pham Thanh Hau", maSo: "NV006", phongBan: "Phòng Kế toán", email: "hau.pt@company.vn", phone: "0901234006", chucVu: "Phó phòng", ngayVaoLam: "12/07/2019", trangThai: "nghi_phep" },
  { id: "7", name: "Bach Cong Quyet", maSo: "NV007", phongBan: "Phòng CNTT", email: "quyet.bc@company.vn", phone: "0901234007", chucVu: "Chuyên viên", ngayVaoLam: "22/11/2020", trangThai: "dang_lam" },
  { id: "8", name: "Hoang Quoc Huy", maSo: "NV008", phongBan: "Phòng Kinh doanh", email: "huy.hq@company.vn", phone: "0901234008", chucVu: "Trưởng phòng", ngayVaoLam: "03/02/2018", trangThai: "dang_lam" },
  { id: "9", name: "Pham Huu Ky", maSo: "NV009", phongBan: "Phòng Nhân sự", email: "ky.ph@company.vn", phone: "0901234009", chucVu: "Nhân viên", ngayVaoLam: "18/05/2022", trangThai: "dang_lam" },
  { id: "10", name: "Nguyen Thi Thanh Van", maSo: "NV010", phongBan: "Phòng Kế toán", email: "van.ntt@company.vn", phone: "0901234010", chucVu: "Nhân viên", ngayVaoLam: "25/08/2021", trangThai: "dang_lam" },
  { id: "11", name: "Nguyen Thuy Hanh", maSo: "NV011", phongBan: "Phòng Hành chính", email: "hanh.nt@company.vn", phone: "0901234011", chucVu: "Trưởng phòng", ngayVaoLam: "07/03/2019", trangThai: "dang_lam" },
  { id: "12", name: "Hoang Nguyen Anh", maSo: "NV012", phongBan: "Phòng CNTT", email: "anh.hn@company.vn", phone: "0901234012", chucVu: "Nhân viên", ngayVaoLam: "14/10/2022", trangThai: "nghi_phep" },
  { id: "13", name: "Nguyen Thanh Lam", maSo: "NV013", phongBan: "Phòng Kinh doanh", email: "lam.nt@company.vn", phone: "0901234013", chucVu: "Nhân viên", ngayVaoLam: "30/01/2023", trangThai: "dang_lam" },
  { id: "14", name: "Bui Huu Tien", maSo: "NV014", phongBan: "Phòng Nhân sự", email: "tien.bh@company.vn", phone: "0901234014", chucVu: "Chuyên viên", ngayVaoLam: "09/06/2020", trangThai: "dang_lam" },
  { id: "15", name: "Hoang Dinh Huy", maSo: "NV015", phongBan: "Phòng Kế toán", email: "huy.hd@company.vn", phone: "0901234015", chucVu: "Thực tập sinh", ngayVaoLam: "01/12/2025", trangThai: "dang_lam" },
  { id: "16", name: "Le Thi Mai", maSo: "NV016", phongBan: "Phòng Marketing", email: "mai.lt@company.vn", phone: "0901234016", chucVu: "Trưởng phòng", ngayVaoLam: "15/05/2018", trangThai: "dang_lam" },
  { id: "17", name: "Vo Minh Tuan", maSo: "NV017", phongBan: "Phòng Marketing", email: "tuan.vm@company.vn", phone: "0901234017", chucVu: "Nhân viên", ngayVaoLam: "20/09/2021", trangThai: "dang_lam" },
  { id: "18", name: "Tran Quoc Bao", maSo: "NV018", phongBan: "Phòng CNTT", email: "bao.tq@company.vn", phone: "0901234018", chucVu: "Nhân viên", ngayVaoLam: "11/04/2023", trangThai: "dang_lam" },
  { id: "19", name: "Do Thi Hong Nhung", maSo: "NV019", phongBan: "Phòng Hành chính", email: "nhung.dth@company.vn", phone: "0901234019", chucVu: "Nhân viên", ngayVaoLam: "28/07/2022", trangThai: "da_nghi" },
  { id: "20", name: "Le Hoang Nam", maSo: "NV020", phongBan: "Phòng Kinh doanh", email: "nam.lh@company.vn", phone: "0901234020", chucVu: "Phó phòng", ngayVaoLam: "06/11/2019", trangThai: "dang_lam" },
  { id: "21", name: "Vu Thi Phuong", maSo: "NV021", phongBan: "Phòng Marketing", email: "phuong.vt@company.vn", phone: "0901234021", chucVu: "Chuyên viên", ngayVaoLam: "17/02/2021", trangThai: "nghi_phep" },
  { id: "22", name: "Ngo Van Thanh", maSo: "NV022", phongBan: "Phòng CNTT", email: "thanh.nv@company.vn", phone: "0901234022", chucVu: "Thực tập sinh", ngayVaoLam: "01/01/2026", trangThai: "dang_lam" },
  { id: "23", name: "Ly Thi Kim Ngan", maSo: "NV023", phongBan: "Phòng Kế toán", email: "ngan.ltk@company.vn", phone: "0901234023", chucVu: "Chuyên viên", ngayVaoLam: "23/08/2020", trangThai: "dang_lam" },
  { id: "24", name: "Truong Minh Duc", maSo: "NV024", phongBan: "Phòng Kinh doanh", email: "duc.tm@company.vn", phone: "0901234024", chucVu: "Nhân viên", ngayVaoLam: "04/03/2024", trangThai: "dang_lam" },
  { id: "25", name: "Phan Thi Bich Ngoc", maSo: "NV025", phongBan: "Phòng Nhân sự", email: "ngoc.ptb@company.vn", phone: "0901234025", chucVu: "Phó phòng", ngayVaoLam: "19/10/2018", trangThai: "dang_lam" },
];

// Attendance status types
export type AttendanceStatus = "present" | "late" | "absent" | "off" | "halfday" | "wfh" | null;

export const statusColors: Record<string, string> = {
  present: "text-green-500",
  late: "text-orange-500",
  absent: "text-red-500",
  off: "text-gray-400",
  halfday: "text-yellow-500",
  wfh: "text-blue-500",
};

export const statusLabels: Record<string, string> = {
  present: "✓",
  late: "M",
  absent: "X",
  off: "-",
  halfday: "½",
  wfh: "W",
};

// Generate random attendance data for a month
export function generateAttendanceData(year: number, month: number) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const statuses: AttendanceStatus[] = ["present", "late", "absent", "off", "halfday", "wfh"];

  return employees.map((emp) => {
    const days: AttendanceStatus[] = [];
    let cong = 0;
    let muon = 0;
    let nghi = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        days.push("off");
      } else {
        const rand = Math.random();
        let status: AttendanceStatus;
        if (rand < 0.7) {
          status = "present";
          cong++;
        } else if (rand < 0.82) {
          status = "late";
          cong++;
          muon++;
        } else if (rand < 0.88) {
          status = "absent";
          nghi++;
        } else if (rand < 0.93) {
          status = "halfday";
          cong += 0.5;
        } else {
          status = "wfh";
          cong++;
        }
        days.push(status);
      }
    }

    const baseSalary = 8000000 + Math.floor(Math.random() * 12000000);
    const tienPhat = muon * 50000;

    return {
      employee: emp,
      days,
      cong: Math.round(cong * 10) / 10,
      muon,
      nghi,
      tienPhat,
      luong: baseSalary - tienPhat,
    };
  });
}

// Salary data
export interface SalaryRecord {
  employee: Employee;
  luongCoBan: number;
  phuCapAnTrua: number;
  phuCapXangXe: number;
  phuCapDienThoai: number;
  thuong: number;
  baoHiem: number;
  thueCanTru: number;
  khauTru: number;
  tongNhan: number;
  trangThai: "da_duyet" | "cho_duyet" | "da_thanh_toan";
}

export function generateSalaryData(): SalaryRecord[] {
  return employees.map((emp) => {
    const luongCoBan = 10000000 + Math.floor(Math.random() * 10000000);
    const phuCapAnTrua = 400000;
    const phuCapXangXe = 1000000;
    const phuCapDienThoai = 0;
    const empKPIs = kpiTargets.filter(t => t.employeeId === emp.id);
    const thuong = Math.round(calculateKPIBonus(empKPIs));
    const baoHiem = -Math.floor(luongCoBan * 0.08);
    const thueCanTru = 0;
    const khauTru = baoHiem + thueCanTru;
    const tongNhan = luongCoBan + phuCapAnTrua + phuCapXangXe + phuCapDienThoai + thuong + khauTru;

    const statuses: SalaryRecord["trangThai"][] = ["da_duyet", "cho_duyet", "da_thanh_toan"];
    const trangThai = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      employee: emp,
      luongCoBan,
      phuCapAnTrua,
      phuCapXangXe,
      phuCapDienThoai,
      thuong,
      baoHiem,
      thueCanTru,
      khauTru,
      tongNhan,
      trangThai,
    };
  });
}

// HR Report data
export const hrReportData = {
  totalEmployees: 25,
  avgWorkDays: 0,
  avgLeaveDays: 0,
  departments: 6,
  monthlyData: [
    { month: "T4/25", tongSo: 20, hieuSu: 18 },
    { month: "T5/25", tongSo: 21, hieuSu: 19 },
    { month: "T6/25", tongSo: 21, hieuSu: 20 },
    { month: "T7/25", tongSo: 22, hieuSu: 21 },
    { month: "T8/25", tongSo: 22, hieuSu: 21 },
    { month: "T9/25", tongSo: 23, hieuSu: 22 },
    { month: "T10/25", tongSo: 23, hieuSu: 22 },
    { month: "T11/25", tongSo: 24, hieuSu: 23 },
    { month: "T12/25", tongSo: 24, hieuSu: 23 },
    { month: "T1/26", tongSo: 25, hieuSu: 24 },
    { month: "T2/26", tongSo: 25, hieuSu: 23 },
    { month: "T3/26", tongSo: 25, hieuSu: 24 },
  ],
  companyData: [
    { company: "HN", tongSo: 15, hieuSu: 14 },
    { company: "HCM", tongSo: 7, hieuSu: 7 },
    { company: "DN", tongSo: 3, hieuSu: 3 },
  ],
};

// Dashboard stats
export const dashboardStats = {
  totalEmployees: 25,
  coMatHomNay: 21,
  nghiPhep: 3,
  luongChoDuyet: 8,
  totalSalary: 385000000,
};

// Department distribution for pie chart
export const departmentDistribution = [
  { name: "Phòng Kế toán", value: 6, color: "#3b82f6" },
  { name: "Phòng CNTT", value: 5, color: "#10b981" },
  { name: "Phòng Kinh doanh", value: 5, color: "#f59e0b" },
  { name: "Phòng Nhân sự", value: 4, color: "#8b5cf6" },
  { name: "Phòng Hành chính", value: 2, color: "#ef4444" },
  { name: "Phòng Marketing", value: 3, color: "#ec4899" },
];

// Recent activities
export const recentActivities = [
  { id: "1", type: "join", description: "Ngo Van Thanh đã gia nhập Phòng CNTT", time: "2 giờ trước", employee: "Ngo Van Thanh" },
  { id: "2", type: "leave", description: "Hoang Nguyen Anh bắt đầu nghỉ phép từ 25/03", time: "5 giờ trước", employee: "Hoang Nguyen Anh" },
  { id: "3", type: "salary", description: "Bảng lương tháng 3/2026 đã được tạo", time: "1 ngày trước", employee: "He thong" },
  { id: "4", type: "attendance", description: "Pham Thi Dung đã duyệt bảng chấm công Phòng Kế toán", time: "1 ngày trước", employee: "Pham Thi Dung" },
  { id: "5", type: "resign", description: "Do Thi Hong Nhung đã nghỉ việc từ 01/03", time: "2 ngày trước", employee: "Do Thi Hong Nhung" },
  { id: "6", type: "leave", description: "Vu Thi Phuong đăng ký nghỉ phép 3 ngay", time: "3 ngày trước", employee: "Vu Thi Phuong" },
  { id: "7", type: "promotion", description: "Le Hoang Nam duoc bo nhiem Phó phòng Kinh Doanh", time: "5 ngày trước", employee: "Le Hoang Nam" },
  { id: "8", type: "join", description: "Hoang Dinh Huy bat dau thuc tap tai Phòng Kế toán", time: "1 tuần trước", employee: "Hoang Dinh Huy" },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount);
}

// ============ DEPARTMENTS ============

export const departments = [
  "Phòng Kế toán", "Phòng CNTT", "Phòng Kinh doanh",
  "Phòng Nhân sự", "Phòng Hành chính", "Phòng Marketing",
];

export const CURRENT_USER_ID = "4"; // Bui Van Duong - Phòng Kinh doanh

// ============ KANBAN SYSTEM ============

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface KanbanTask {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assignedBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  points: number;
  dueDate: string;
  createdAt: string;
  category: string;
}

export const taskCategories = ["Báo cáo", "Dự án", "Hành chính", "Kỹ thuật", "Kinh doanh", "Nhân sự"];

export const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: "Khẩn cấp", color: "text-red-700", bg: "bg-red-100" },
  high: { label: "Cao", color: "text-orange-700", bg: "bg-orange-100" },
  medium: { label: "Trung bình", color: "text-blue-700", bg: "bg-blue-100" },
  low: { label: "Thấp", color: "text-slate-600", bg: "bg-slate-100" },
};

export const columnConfig: Record<TaskStatus, { label: string; color: string; bgHeader: string }> = {
  todo: { label: "Chờ làm", color: "text-slate-600", bgHeader: "bg-slate-100 border-slate-300" },
  in_progress: { label: "Đang làm", color: "text-blue-600", bgHeader: "bg-blue-50 border-blue-300" },
  review: { label: "Đang review", color: "text-purple-600", bgHeader: "bg-purple-50 border-purple-300" },
  done: { label: "Hoàn thành", color: "text-green-600", bgHeader: "bg-green-50 border-green-300" },
};

// Points scaled: 10000 điểm = 100% lương cơ bản
const taskTitles: { title: string; category: string; points: number }[] = [
  { title: "Lập báo cáo tài chính Q1/2026", category: "Báo cáo", points: 400 },
  { title: "Cập nhật bảng lương tháng 3", category: "Nhân sự", points: 300 },
  { title: "Triển khai module chấm công mới", category: "Kỹ thuật", points: 600 },
  { title: "Soạn hợp đồng lao động mới", category: "Hành chính", points: 200 },
  { title: "Phân tích doanh thu tháng 2", category: "Kinh doanh", points: 300 },
  { title: "Đào tạo nhân viên mới", category: "Nhân sự", points: 200 },
  { title: "Sửa lỗi hệ thống email nội bộ", category: "Kỹ thuật", points: 400 },
  { title: "Chuẩn bị tài liệu họp HĐQT", category: "Hành chính", points: 300 },
  { title: "Tối ưu quy trình bán hàng", category: "Kinh doanh", points: 500 },
  { title: "Thiết kế banner marketing Q2", category: "Kinh doanh", points: 200 },
  { title: "Kiểm tra bảo mật hệ thống", category: "Kỹ thuật", points: 500 },
  { title: "Lập kế hoạch tuyển dụng Q2", category: "Nhân sự", points: 400 },
  { title: "Đối soát công nợ khách hàng", category: "Báo cáo", points: 300 },
  { title: "Nâng cấp server nội bộ", category: "Kỹ thuật", points: 400 },
  { title: "Xử lý đơn nghỉ phép tồn đọng", category: "Hành chính", points: 100 },
  { title: "Viết tài liệu hướng dẫn sử dụng", category: "Kỹ thuật", points: 300 },
  { title: "Lập báo cáo nhân sự tháng 3", category: "Báo cáo", points: 200 },
  { title: "Cập nhật website công ty", category: "Kỹ thuật", points: 300 },
  { title: "Tổ chức team building Q1", category: "Hành chính", points: 200 },
  { title: "Phát triển API thanh toán", category: "Kỹ thuật", points: 600 },
  { title: "Review code sprint 5", category: "Kỹ thuật", points: 300 },
  { title: "Làm slide thuyết trình sản phẩm", category: "Kinh doanh", points: 200 },
  { title: "Cập nhật chính sách nội bộ", category: "Hành chính", points: 200 },
  { title: "Phân tích đối thủ cạnh tranh", category: "Kinh doanh", points: 400 },
  { title: "Lập ngân sách phòng ban Q2", category: "Báo cáo", points: 300 },
  { title: "Fix bug module nghỉ phép", category: "Kỹ thuật", points: 200 },
  { title: "Đánh giá hiệu suất nhân viên", category: "Nhân sự", points: 400 },
  { title: "Chuẩn bị báo cáo thuế", category: "Báo cáo", points: 500 },
  { title: "Triển khai chatbot hỗ trợ KH", category: "Kỹ thuật", points: 500 },
  { title: "Sắp xếp kho tài liệu", category: "Hành chính", points: 100 },
  { title: "Thiết kế email marketing", category: "Kinh doanh", points: 200 },
  { title: "Tạo dashboard KPI phòng ban", category: "Báo cáo", points: 400 },
  { title: "Kiểm kê tài sản công ty", category: "Hành chính", points: 300 },
  { title: "Xây dựng quy trình onboarding", category: "Nhân sự", points: 300 },
  { title: "Backup dữ liệu hệ thống", category: "Kỹ thuật", points: 200 },
  { title: "Lập kế hoạch marketing Q2", category: "Kinh doanh", points: 400 },
  { title: "Soát xét hợp đồng nhà cung cấp", category: "Hành chính", points: 300 },
  { title: "Phát triển tính năng báo cáo", category: "Kỹ thuật", points: 400 },
  { title: "Cập nhật bảng giá sản phẩm", category: "Kinh doanh", points: 200 },
  { title: "Tổng hợp phản hồi khách hàng", category: "Kinh doanh", points: 300 },
];

function generateKanbanTasks(): KanbanTask[] {
  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
  const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
  const managers = ["Pham Thi Dung", "Hoang Thai Son", "Dang Hoang Son", "Hoang Quoc Huy", "Le Thi Mai"];
  const activeEmployees = employees.filter(e => e.trangThai === "dang_lam");

  return taskTitles.map((t, i) => {
    const emp = activeEmployees[i % activeEmployees.length];
    // Distribute: ~8 todo, ~10 in_progress, ~7 review, ~15 done
    let status: TaskStatus;
    if (i < 8) status = "todo";
    else if (i < 18) status = "in_progress";
    else if (i < 25) status = "review";
    else status = "done";

    return {
      id: `task-${i + 1}`,
      title: t.title,
      description: "",
      assigneeId: emp.id,
      assignedBy: managers[i % managers.length],
      status,
      priority: priorities[i % 4],
      points: t.points,
      dueDate: `${(i % 28) + 1}/04/2026`,
      createdAt: `${(i % 28) + 1}/03/2026`,
      category: t.category,
    };
  });
}

export const kanbanTasks = generateKanbanTasks();

// ============ EMPLOYEE SCORING ============

export interface EmployeeScore {
  employee: Employee;
  totalPoints: number;
  maxPoints: number;
  completedTasks: number;
  totalTasks: number;
  scorePercent: number;
  salaryPercent: number;
}

export function calculateEmployeeScores(tasks: KanbanTask[]): EmployeeScore[] {
  const scoreMap = new Map<string, { done: number; total: number; points: number; totalPoints: number }>();

  // Initialize for all active employees
  employees.filter(e => e.trangThai === "dang_lam").forEach(emp => {
    scoreMap.set(emp.id, { done: 0, total: 0, points: 0, totalPoints: 0 });
  });

  // Aggregate tasks
  tasks.forEach(task => {
    const entry = scoreMap.get(task.assigneeId);
    if (entry) {
      entry.total++;
      entry.totalPoints += task.points;
      if (task.status === "done") {
        entry.done++;
        entry.points += task.points;
      }
    }
  });

  return employees
    .filter(e => e.trangThai === "dang_lam")
    .map(emp => {
      const entry = scoreMap.get(emp.id) || { done: 0, total: 0, points: 0, totalPoints: 0 };
      const maxPoints = Math.max(entry.totalPoints, 10000);
      const scorePercent = maxPoints > 0 ? Math.min(Math.round((entry.points / maxPoints) * 100), 100) : 0;
      return {
        employee: emp,
        totalPoints: entry.points,
        maxPoints,
        completedTasks: entry.done,
        totalTasks: entry.total,
        scorePercent,
        salaryPercent: scorePercent, // Linear: score = salary %
      };
    });
}

// ============ KPI BONUS SYSTEM ============

export interface KPITarget {
  id: string;
  name: string;
  targetValue: number;
  actualValue: number;
  bonusPercent: number;
  unit: string;
  employeeId: string;
}

const kpiTemplates: Record<string, { name: string; target: number; unit: string; bonusPct: number }[]> = {
  "Phòng Kinh doanh": [
    { name: "Doanh số", target: 100000000, unit: "VND", bonusPct: 0.10 },
    { name: "Khách hàng mới", target: 5, unit: "khách", bonusPct: 2000000 },
  ],
  "Phòng Kế toán": [
    { name: "Báo cáo đúng hạn", target: 10, unit: "báo cáo", bonusPct: 500000 },
    { name: "Độ chính xác sổ sách", target: 95, unit: "%", bonusPct: 100000 },
  ],
  "Phòng CNTT": [
    { name: "Feature delivery", target: 8, unit: "feature", bonusPct: 1000000 },
    { name: "Bug fix", target: 15, unit: "bug", bonusPct: 300000 },
  ],
  "Phòng Nhân sự": [
    { name: "Tuyển dụng", target: 3, unit: "người", bonusPct: 1500000 },
    { name: "Đào tạo hoàn thành", target: 5, unit: "khóa", bonusPct: 500000 },
  ],
  "Phòng Hành chính": [
    { name: "Xử lý hồ sơ", target: 20, unit: "hồ sơ", bonusPct: 200000 },
    { name: "Sự kiện tổ chức", target: 2, unit: "sự kiện", bonusPct: 1000000 },
  ],
  "Phòng Marketing": [
    { name: "Chiến dịch hoàn thành", target: 4, unit: "chiến dịch", bonusPct: 1500000 },
    { name: "Lead generation", target: 50, unit: "lead", bonusPct: 100000 },
  ],
};

function generateKPITargets(): KPITarget[] {
  const targets: KPITarget[] = [];
  let id = 1;
  employees.filter(e => e.trangThai === "dang_lam").forEach(emp => {
    const templates = kpiTemplates[emp.phongBan] || [];
    templates.forEach(t => {
      // Randomize actual: 70% - 140% of target
      const ratio = 0.7 + Math.random() * 0.7;
      const actualValue = Math.round(t.target * ratio);
      targets.push({
        id: `kpi-${id++}`,
        name: t.name,
        targetValue: t.target,
        actualValue,
        bonusPercent: t.bonusPct,
        unit: t.unit,
        employeeId: emp.id,
      });
    });
  });
  return targets;
}

export const kpiTargets = generateKPITargets();

export function calculateKPIBonus(targets: KPITarget[]): number {
  return targets.reduce((sum, t) => {
    if (t.actualValue > t.targetValue) {
      const vuot = t.actualValue - t.targetValue;
      // For VND-unit KPIs, bonusPercent is a ratio (0.10 = 10%)
      // For count-unit KPIs, bonusPercent is a fixed amount per unit exceeded
      if (t.unit === "VND") {
        return sum + vuot * t.bonusPercent;
      }
      return sum + vuot * t.bonusPercent;
    }
    return sum;
  }, 0);
}

export function getEmployeeKPITargets(employeeId: string): KPITarget[] {
  return kpiTargets.filter(t => t.employeeId === employeeId);
}

// ============ MONTHLY SCORE HISTORY ============

export interface MonthlyScoreEntry {
  month: string;
  myScore: number;
  teamAvg: number;
}

export function generateMonthlyScores(employeeId: string): MonthlyScoreEntry[] {
  const months = ["T10/25", "T11/25", "T12/25", "T1/26", "T2/26", "T3/26"];
  // Seed-based pseudo-random for consistency
  const empNum = parseInt(employeeId) || 1;
  return months.map((m, i) => ({
    month: m,
    myScore: Math.min(Math.round(2000 + empNum * 300 + i * 800 + Math.sin(empNum + i) * 1500), 10000),
    teamAvg: Math.round(3500 + i * 600),
  }));
}
