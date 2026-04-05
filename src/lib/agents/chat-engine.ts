import { ChatMessage, AgentCoordinationState, AgentRole } from '../agent-types';
import { formatCurrency, employees, departments, employeeCareers, getCareerLevel } from '../mock-data';
import { agentProfiles } from './agent-profiles';
import { generateEmployeeKPICard } from '../payslip-data';
import { generatePayslip } from '../payslip-data';

let messageCounter = 100;
function genId(): string { return `chat-${++messageCounter}`; }
function now(): string { return new Date().toISOString(); }

// ============ COMMAND SYSTEM ============
interface Command {
  name: string;
  aliases: string[];
  description: string;
  agent: AgentRole;
  handler: (args: string, state: AgentCoordinationState) => string;
}

const commands: Command[] = [
  {
    name: '/help',
    aliases: ['help', 'trợ giúp', '?'],
    description: 'Hiển thị danh sách lệnh',
    agent: 'ceo',
    handler: () => {
      return `📋 DANH SÁCH LỆNH AI AGENTS\n\n` +
        `━━━ TỔNG QUAN ━━━\n` +
        `/overview — Tổng quan doanh nghiệp\n` +
        `/targets — Mục tiêu kinh doanh\n` +
        `/health — Sức khỏe tài chính\n\n` +
        `━━━ TÀI CHÍNH ━━━\n` +
        `/revenue — Phân tích doanh thu\n` +
        `/costs — Phân tích chi phí\n` +
        `/pnl — Báo cáo lãi lỗ\n` +
        `/cashflow — Dòng tiền\n\n` +
        `━━━ NHÂN SỰ ━━━\n` +
        `/staff — Tổng quan nhân sự\n` +
        `/dept [tên] — Phân tích phòng ban\n` +
        `/emp [tên] — Thông tin nhân viên\n` +
        `/salary [tên] — Bảng lương nhân viên\n` +
        `/kpi [tên] — KPI scorecard\n` +
        `/risk — Nhân viên rủi ro\n` +
        `/top — Top performers\n\n` +
        `━━━ BONUS ━━━\n` +
        `/bonus — Bảng tính thưởng\n` +
        `/promotion — Sẵn sàng thăng tiến\n\n` +
        `Hoặc gõ câu hỏi tự nhiên bằng tiếng Việt.`;
    }
  },
  {
    name: '/overview',
    aliases: ['overview', 'tổng quan', 'báo cáo'],
    description: 'Tổng quan doanh nghiệp',
    agent: 'ceo',
    handler: (_, state) => {
      const totalCost = state.costProjections.reduce((s, c) => s + c.totalCost, 0);
      const headcount = state.costProjections.reduce((s, c) => s + c.headcount, 0);
      const rev = state.businessTargets.find(t => t.category === 'revenue');
      const completed = state.individualPlans.filter(p => p.status === 'completed').length;
      const total = state.individualPlans.length;
      const atRisk = state.individualPlans.filter(p => p.status === 'at_risk').length;
      const is = state.financials.incomeStatements;
      const lastPnL = is[is.length - 1];
      const totalRev12m = is.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
      const totalProfit12m = is.reduce((s, m) => s + m.loiNhuanSauThue, 0);

      return `📊 TỔNG QUAN DOANH NGHIỆP\n\n` +
        `━━━ TÀI CHÍNH (12 tháng) ━━━\n` +
        `Doanh thu:     ${formatCurrency(totalRev12m)} đ\n` +
        `Lợi nhuận:     ${formatCurrency(totalProfit12m)} đ\n` +
        `Biên LN ròng:  ${Math.round(totalProfit12m / totalRev12m * 100)}%\n` +
        `EBITDA tháng:  ${formatCurrency(lastPnL.ebitda)} đ\n\n` +
        `━━━ NHÂN SỰ ━━━\n` +
        `Tổng nhân sự:  ${headcount} người\n` +
        `Chi phí NS/T:  ${formatCurrency(totalCost)} đ\n` +
        `Bình quân/NV:  ${formatCurrency(Math.round(totalCost / headcount))} đ\n\n` +
        `━━━ MỤC TIÊU Q2/2026 ━━━\n` +
        `Doanh thu MT:  ${rev ? formatCurrency(rev.targetValue) : 'N/A'} đ (${rev ? Math.round(rev.currentValue / rev.targetValue * 100) : 0}%)\n` +
        `OKR hoàn thành: ${completed}/${total} (${Math.round(completed / total * 100)}%)\n` +
        `Nhân viên rủi ro: ${atRisk}`;
    }
  },
  {
    name: '/targets',
    aliases: ['targets', 'mục tiêu', 'okr'],
    description: 'Mục tiêu kinh doanh',
    agent: 'ceo',
    handler: (_, state) => {
      let result = `🎯 MỤC TIÊU KINH DOANH Q2/2026\n\n`;
      state.businessTargets.forEach(t => {
        const pct = Math.round(t.currentValue / t.targetValue * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        const icon = t.status === 'achieved' ? '✅' : t.status === 'on_track' ? '🟢' : t.status === 'at_risk' ? '🟡' : '🔴';
        result += `${icon} ${t.name}\n   ${bar} ${pct}%\n   ${formatCurrency(t.currentValue)} / ${formatCurrency(t.targetValue)} ${t.unit}\n\n`;
      });
      return result;
    }
  },
  {
    name: '/health',
    aliases: ['health', 'sức khỏe', 'tài chính'],
    description: 'Sức khỏe tài chính',
    agent: 'finance',
    handler: (_, state) => {
      const h = state.financialHealth;
      const bs = state.financials.balanceSheet.data;
      return `💊 SỨC KHỎE TÀI CHÍNH\n\n` +
        `Current Ratio:    ${h.currentRatio}x ${h.currentRatio >= 1.5 ? '✅ Tốt' : '⚠️ Cần chú ý'}\n` +
        `Nợ/Vốn CSH:      ${h.debtToEquity}x ${h.debtToEquity <= 1 ? '✅ An toàn' : '⚠️ Cao'}\n` +
        `Biên LN ròng:     ${h.profitMargin}% ${h.profitMargin >= 15 ? '✅ Khỏe' : '⚠️'}\n` +
        `Biên EBITDA:       ${h.operatingMargin}%\n` +
        `Tăng trưởng DT:   ${h.revenueGrowth > 0 ? '+' : ''}${h.revenueGrowth}%\n` +
        `Burn Rate:         ${formatCurrency(h.burnRate)} đ/tháng\n\n` +
        `━━━ BẢNG CÂN ĐỐI ━━━\n` +
        `Tổng tài sản:  ${formatCurrency(bs.tongTaiSan)} đ\n` +
        `Tổng nợ:       ${formatCurrency(bs.noPhaiTra.tongNoPhaiTra)} đ\n` +
        `Vốn CSH:       ${formatCurrency(bs.vonChuSoHuu.tongVon)} đ\n` +
        `Tiền mặt:      ${formatCurrency(bs.taiSanNganHan.tienMat)} đ`;
    }
  },
  {
    name: '/revenue',
    aliases: ['revenue', 'doanh thu'],
    description: 'Phân tích doanh thu',
    agent: 'ceo',
    handler: (_, state) => {
      const is = state.financials.incomeStatements;
      const last3 = is.slice(-3);
      let result = `💰 PHÂN TÍCH DOANH THU\n\n━━━ 3 THÁNG GẦN NHẤT ━━━\n`;
      last3.forEach(m => {
        result += `${m.month}: ${formatCurrency(m.doanhThu.tongDoanhThu)} đ\n` +
          `  KD: ${formatCurrency(m.doanhThu.kinhdoanh)} | MKT: ${formatCurrency(m.doanhThu.marketing)} | CNTT: ${formatCurrency(m.doanhThu.cntt)}\n`;
      });
      const totalRev = is.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
      result += `\nTổng 12 tháng: ${formatCurrency(totalRev)} đ`;
      return result;
    }
  },
  {
    name: '/costs',
    aliases: ['costs', 'chi phí'],
    description: 'Chi phí nhân sự',
    agent: 'finance',
    handler: (_, state) => {
      const costs = state.costProjections;
      const total = costs.reduce((s, c) => s + c.totalCost, 0);
      let result = `💸 CHI PHÍ NHÂN SỰ THEO PHÒNG BAN\n\n`;
      costs.sort((a, b) => b.totalCost - a.totalCost).forEach(c => {
        const pct = Math.round(c.totalCost / total * 100);
        result += `${c.department.replace('Phòng ', '').padEnd(12)} ${c.headcount} NV | ${formatCurrency(c.totalCost).padStart(15)} đ (${pct}%)\n`;
      });
      result += `${'─'.repeat(50)}\n`;
      result += `${'TỔNG'.padEnd(12)} ${costs.reduce((s, c) => s + c.headcount, 0)} NV | ${formatCurrency(total).padStart(15)} đ`;
      return result;
    }
  },
  {
    name: '/pnl',
    aliases: ['pnl', 'lãi lỗ', 'kết quả'],
    description: 'Báo cáo P&L',
    agent: 'finance',
    handler: (_, state) => {
      const last = state.financials.incomeStatements[state.financials.incomeStatements.length - 1];
      return `📈 BÁO CÁO KẾT QUẢ KINH DOANH - ${last.month}\n\n` +
        `Doanh thu:         ${formatCurrency(last.doanhThu.tongDoanhThu)} đ\n` +
        `Chi phí hoạt động: ${formatCurrency(last.chiPhi.tongChiPhi)} đ\n` +
        `${'─'.repeat(40)}\n` +
        `EBITDA:            ${formatCurrency(last.ebitda)} đ\n` +
        `Khấu hao:         -${formatCurrency(last.khauHao)} đ\n` +
        `LN trước thuế:     ${formatCurrency(last.loiNhuanTruocThue)} đ\n` +
        `Thuế TNDN (20%):  -${formatCurrency(last.thueDoanhNghiep)} đ\n` +
        `${'─'.repeat(40)}\n` +
        `LỢI NHUẬN RÒNG:   ${formatCurrency(last.loiNhuanSauThue)} đ\n` +
        `Biên LN ròng:      ${Math.round(last.loiNhuanSauThue / last.doanhThu.tongDoanhThu * 100)}%`;
    }
  },
  {
    name: '/staff',
    aliases: ['staff', 'nhân sự', 'team'],
    description: 'Tổng quan nhân sự',
    agent: 'hr_director',
    handler: (_, state) => {
      const active = employees.filter(e => e.trangThai !== 'da_nghi');
      const levelCounts: Record<string, number> = {};
      employeeCareers.forEach(c => { levelCounts[c.levelCode] = (levelCounts[c.levelCode] || 0) + 1; });

      let result = `👥 TỔNG QUAN NHÂN SỰ\n\n`;
      result += `Tổng: ${active.length} nhân viên hoạt động\n\n`;
      result += `━━━ THEO PHÒNG BAN ━━━\n`;
      departments.forEach(d => {
        const count = active.filter(e => e.phongBan === d).length;
        result += `${d.replace('Phòng ', '').padEnd(12)} ${count} người\n`;
      });
      result += `\n━━━ THEO LEVEL ━━━\n`;
      Object.entries(levelCounts).sort().forEach(([level, count]) => {
        const name = getCareerLevel(level)?.nameVi || level;
        result += `${level} (${name}): ${count} người\n`;
      });
      return result;
    }
  },
  {
    name: '/risk',
    aliases: ['risk', 'rủi ro', 'cảnh báo'],
    description: 'Nhân viên rủi ro',
    agent: 'performance_coach',
    handler: (_, state) => {
      const atRiskPlans = state.individualPlans.filter(p => p.status === 'at_risk');
      const riskEmps = [...new Set(atRiskPlans.map(p => p.employeeId))];

      let result = `⚠️ NHÂN VIÊN RỦI RO (${riskEmps.length} người)\n\n`;
      riskEmps.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        const empPlans = atRiskPlans.filter(p => p.employeeId === empId);
        const career = employeeCareers.find(c => c.employeeId === empId);
        const lastKPI = career?.performanceHistory.slice(-1)[0]?.kpiScore || 0;
        if (emp) {
          result += `🔴 ${emp.name} (${emp.chucVu}, ${emp.phongBan.replace('Phòng ', '')})\n`;
          result += `   KPI: ${lastKPI}% | Rủi ro: ${empPlans.length} nhiệm vụ\n\n`;
        }
      });
      if (riskEmps.length === 0) result += `✅ Không có nhân viên nào đang gặp rủi ro.`;
      return result;
    }
  },
  {
    name: '/top',
    aliases: ['top', 'xuất sắc', 'best'],
    description: 'Top performers',
    agent: 'performance_coach',
    handler: (_, state) => {
      const empScores = employees.filter(e => e.trangThai !== 'da_nghi').map(emp => {
        const plans = state.individualPlans.filter(p => p.employeeId === emp.id);
        const completed = plans.filter(p => p.status === 'completed').length;
        const career = employeeCareers.find(c => c.employeeId === emp.id);
        const kpi = career?.performanceHistory.slice(-1)[0]?.kpiScore || 0;
        return { emp, completed, total: plans.length, kpi, rate: plans.length > 0 ? Math.round(completed / plans.length * 100) : 0 };
      }).sort((a, b) => b.kpi - a.kpi);

      let result = `🏆 TOP 10 NHÂN VIÊN XUẤT SẮC\n\n`;
      empScores.slice(0, 10).forEach((s, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        result += `${medal} ${s.emp.name.padEnd(20)} KPI: ${s.kpi}% | CV: ${s.completed}/${s.total} (${s.rate}%)\n`;
      });
      return result;
    }
  },
  {
    name: '/bonus',
    aliases: ['bonus', 'thưởng', 'bảng thưởng'],
    description: 'Bảng tính thưởng',
    agent: 'finance',
    handler: () => {
      const active = employees.filter(e => e.trangThai !== 'da_nghi');
      let totalBonus = 0;
      let result = `🎁 BẢNG TÍNH THƯỞNG Q2/2026\n\n`;
      result += `${'Nhân viên'.padEnd(22)} ${'KPI'.padStart(5)} ${'Loại'.padStart(8)} ${'Thưởng'.padStart(14)}\n`;
      result += `${'─'.repeat(52)}\n`;

      active.forEach(emp => {
        const card = generateEmployeeKPICard(emp.id);
        if (card) {
          totalBonus += card.bonusAmount;
          result += `${emp.name.padEnd(22)} ${(card.totalWeightedScore + '%').padStart(5)} ${card.bonusTier.padStart(8)} ${formatCurrency(card.bonusAmount).padStart(14)}\n`;
        }
      });
      result += `${'─'.repeat(52)}\n`;
      result += `${'TỔNG QUỸ THƯỞNG'.padEnd(37)} ${formatCurrency(totalBonus).padStart(14)} đ`;
      return result;
    }
  },
  {
    name: '/promotion',
    aliases: ['promotion', 'thăng tiến'],
    description: 'Sẵn sàng thăng tiến',
    agent: 'hr_director',
    handler: () => {
      const { calculatePromotionReadiness } = require('../mock-data');
      const active = employees.filter(e => e.trangThai !== 'da_nghi');
      const ready: string[] = [];
      const notReady: string[] = [];

      active.forEach(emp => {
        const p = calculatePromotionReadiness(emp.id);
        if (p?.overallReady) {
          ready.push(`✅ ${emp.name} (${emp.levelCode} → ${p.nextLevel?.code || '?'})`);
        } else if (p) {
          notReady.push(`⏳ ${emp.name}: ${p.missingCriteria[0] || 'Chưa đủ ĐK'}`);
        }
      });

      return `📈 ĐÁNH GIÁ THĂNG TIẾN\n\n` +
        `━━━ ĐỦ ĐIỀU KIỆN (${ready.length}) ━━━\n${ready.join('\n') || 'Không có'}\n\n` +
        `━━━ CHƯA ĐỦ (${notReady.length}) ━━━\n${notReady.slice(0, 8).join('\n')}${notReady.length > 8 ? `\n... và ${notReady.length - 8} người nữa` : ''}`;
    }
  },
];

// ============ SMART ROUTING ============

function findCommand(input: string): Command | null {
  const trimmed = input.trim().toLowerCase();
  for (const cmd of commands) {
    if (trimmed === cmd.name || trimmed.startsWith(cmd.name + ' ')) return cmd;
    for (const alias of cmd.aliases) {
      if (trimmed === alias || trimmed.startsWith(alias + ' ')) return cmd;
    }
  }
  return null;
}

function extractArgs(input: string, cmd: Command): string {
  const trimmed = input.trim();
  if (trimmed.toLowerCase().startsWith(cmd.name)) return trimmed.slice(cmd.name.length).trim();
  for (const alias of cmd.aliases) {
    if (trimmed.toLowerCase().startsWith(alias)) return trimmed.slice(alias.length).trim();
  }
  return '';
}

// Handle employee-specific commands
function handleEmpCommand(prefix: string, empName: string, state: AgentCoordinationState): string | null {
  const emp = employees.find(e => e.name.toLowerCase().includes(empName.toLowerCase()));
  if (!emp) return `Không tìm thấy nhân viên "${empName}". Thử gõ tên đầy đủ.`;

  const career = employeeCareers.find(c => c.employeeId === emp.id);
  const plans = state.individualPlans.filter(p => p.employeeId === emp.id);
  const completed = plans.filter(p => p.status === 'completed').length;
  const salary = state.salaryProjections.find(s => s.employeeId === emp.id);

  if (prefix === '/emp' || prefix === 'emp') {
    return `👤 ${emp.name}\n\n` +
      `Chức vụ:    ${emp.chucVu}\n` +
      `Phòng ban:  ${emp.phongBan}\n` +
      `Level:      ${career?.levelCode || 'N/A'}\n` +
      `Ngày vào:   ${emp.ngayVaoLam}\n` +
      `Lương:      ${salary ? formatCurrency(salary.projectedTotal) : 'N/A'} đ\n` +
      `KPI (Q gần nhất): ${career?.performanceHistory.slice(-1)[0]?.kpiScore || 'N/A'}%\n` +
      `Công việc:  ${completed}/${plans.length} hoàn thành`;
  }

  if (prefix === '/salary' || prefix === 'salary' || prefix === 'lương') {
    const payslip = generatePayslip(emp.id, 4);
    if (!payslip) return `Không có dữ liệu lương cho ${emp.name}.`;
    return `💵 BẢNG LƯƠNG ${emp.name} - ${payslip.month}\n\n` +
      `I. THU NHẬP\n` +
      `   Lương CB:     ${formatCurrency(payslip.thuNhap.luongCoBan)} đ\n` +
      `   Phụ cấp:      ${formatCurrency(payslip.thuNhap.tongThuNhap - payslip.thuNhap.luongCoBan)} đ\n` +
      `   Tổng TN:      ${formatCurrency(payslip.thuNhap.tongThuNhap)} đ\n\n` +
      `II. THƯỞNG (KPI ${payslip.thuong.kpiAchievement}%)\n` +
      `   Thưởng KPI:   ${formatCurrency(payslip.thuong.thuongKPI)} đ\n` +
      `   Thưởng PB:    ${formatCurrency(payslip.thuong.thuongPhongBan)} đ\n` +
      `   Thưởng CT:    ${formatCurrency(payslip.thuong.thuongCongTy)} đ\n` +
      `   Tổng thưởng:  ${formatCurrency(payslip.thuong.tongThuong)} đ\n\n` +
      `III. KHẤU TRỪ\n` +
      `   BHXH:         ${formatCurrency(Math.abs(payslip.khauTru.bhxh))} đ\n` +
      `   BHYT:         ${formatCurrency(Math.abs(payslip.khauTru.bhyt))} đ\n` +
      `   BHTN:         ${formatCurrency(Math.abs(payslip.khauTru.bhtn))} đ\n` +
      `   Thuế TNCN:    ${formatCurrency(Math.abs(payslip.khauTru.thueTNCN))} đ\n` +
      `   Tổng KT:      ${formatCurrency(Math.abs(payslip.khauTru.tongKhauTru))} đ\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `THỰC NHẬN:       ${formatCurrency(payslip.thucNhan)} đ`;
  }

  if (prefix === '/kpi') {
    const card = generateEmployeeKPICard(emp.id);
    if (!card) return `Không có dữ liệu KPI cho ${emp.name}.`;
    let result = `📊 KPI SCORECARD - ${emp.name}\n\n`;
    result += `Điểm tổng hợp: ${card.totalWeightedScore}% | Xếp loại: ${card.bonusTier} | Thưởng: ${formatCurrency(card.bonusAmount)} đ\n\n`;
    card.kpis.forEach(k => {
      const icon = k.status === 'exceeded' ? '✅' : k.status === 'met' ? '🟢' : k.status === 'near' ? '🟡' : '🔴';
      result += `${icon} ${k.name.padEnd(25)} ${k.weight}% | ${k.actual}/${k.target} ${k.unit} (${k.achievement}%)\n`;
    });
    return result;
  }

  return null;
}

// Handle dept-specific commands
function handleDeptCommand(deptName: string, state: AgentCoordinationState): string {
  const dept = departments.find(d => d.toLowerCase().includes(deptName.toLowerCase()) || d.replace('Phòng ', '').toLowerCase().includes(deptName.toLowerCase()));
  if (!dept) return `Không tìm thấy phòng ban "${deptName}". Các PB: ${departments.map(d => d.replace('Phòng ', '')).join(', ')}`;

  const deptEmps = employees.filter(e => e.phongBan === dept && e.trangThai !== 'da_nghi');
  const deptPlans = state.individualPlans.filter(p => deptEmps.some(e => e.id === p.employeeId));
  const completed = deptPlans.filter(p => p.status === 'completed').length;
  const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;
  const cost = state.costProjections.find(c => c.department === dept);
  const detail = state.departmentDetails.find(d => d.department === dept);

  let result = `🏢 ${dept}\n\n`;
  result += `Trưởng phòng: ${detail?.headName || 'N/A'}\n`;
  result += `Nhân sự:      ${deptEmps.length} người\n`;
  result += `KPI TB:       ${detail?.avgKPI || 0}%\n`;
  result += `Chi phí/T:    ${cost ? formatCurrency(cost.totalCost) : 'N/A'} đ\n`;
  result += `Biên LN:      ${detail?.contributionMargin || 0}%\n\n`;
  result += `━━━ CÔNG VIỆC ━━━\n`;
  result += `Tổng: ${deptPlans.length} | Xong: ${completed} | Rủi ro: ${atRisk}\n\n`;
  result += `━━━ NHÂN VIÊN ━━━\n`;
  deptEmps.forEach(e => {
    const career = employeeCareers.find(c => c.employeeId === e.id);
    result += `${e.name.padEnd(20)} ${(career?.levelCode || 'L3').padEnd(4)} ${e.chucVu}\n`;
  });
  return result;
}

// ============ MAIN PROCESSOR ============

export function processUserChat(input: string, state: AgentCoordinationState): ChatMessage[] {
  const trimmed = input.trim();

  // Check for exact commands first
  const cmd = findCommand(trimmed);
  if (cmd) {
    const args = extractArgs(trimmed, cmd);

    // Handle commands with employee args
    if ((cmd.name === '/emp' || cmd.name === '/salary' || cmd.name === '/kpi') && args) {
      const result = handleEmpCommand(cmd.name, args, state);
      if (result) {
        return [{ id: genId(), sender: cmd.agent, senderName: agentProfiles[cmd.agent].name, content: result, timestamp: now() }];
      }
    }

    // Handle dept command
    if (cmd.name === '/dept' && args) {
      return [{ id: genId(), sender: 'dept_manager', senderName: 'AI Dept Manager', content: handleDeptCommand(args, state), timestamp: now() }];
    }

    const result = cmd.handler(args, state);
    return [{ id: genId(), sender: cmd.agent, senderName: agentProfiles[cmd.agent].name, content: result, timestamp: now() }];
  }

  // Natural language fallback — try to match employee/dept names or keywords
  const lower = trimmed.toLowerCase();

  // Check for employee names
  for (const emp of employees) {
    if (lower.includes(emp.name.toLowerCase())) {
      const result = handleEmpCommand('/emp', emp.name, state);
      if (result) {
        return [{ id: genId(), sender: 'performance_coach', senderName: 'AI Coach', content: result, timestamp: now() }];
      }
    }
  }

  // Check for department names
  for (const dept of departments) {
    if (lower.includes(dept.toLowerCase()) || lower.includes(dept.replace('Phòng ', '').toLowerCase())) {
      return [{ id: genId(), sender: 'dept_manager', senderName: 'AI Dept Manager', content: handleDeptCommand(dept, state), timestamp: now() }];
    }
  }

  // Keyword routing (original logic enhanced)
  if (['doanh thu', 'revenue'].some(kw => lower.includes(kw))) {
    return processUserChat('/revenue', state);
  }
  if (['chi phí', 'cost'].some(kw => lower.includes(kw))) {
    return processUserChat('/costs', state);
  }
  if (['lương', 'salary'].some(kw => lower.includes(kw))) {
    return processUserChat('/staff', state);
  }
  if (['rủi ro', 'risk', 'cảnh báo'].some(kw => lower.includes(kw))) {
    return processUserChat('/risk', state);
  }
  if (['thưởng', 'bonus'].some(kw => lower.includes(kw))) {
    return processUserChat('/bonus', state);
  }
  if (['mục tiêu', 'target', 'okr'].some(kw => lower.includes(kw))) {
    return processUserChat('/targets', state);
  }
  if (['tài chính', 'sức khỏe'].some(kw => lower.includes(kw))) {
    return processUserChat('/health', state);
  }
  if (['pnl', 'lãi lỗ', 'kết quả'].some(kw => lower.includes(kw))) {
    return processUserChat('/pnl', state);
  }

  // Default: show overview + help hint
  return [{
    id: genId(),
    sender: 'ceo',
    senderName: 'AI CEO',
    content: `Tôi không hiểu rõ câu hỏi "${trimmed}".\n\nGõ /help để xem danh sách lệnh, hoặc thử:\n• Tên nhân viên (VD: "Hoang Thai Son")\n• Tên phòng ban (VD: "CNTT")\n• Từ khóa: doanh thu, chi phí, rủi ro, thưởng, mục tiêu...`,
    timestamp: now(),
  }];
}
