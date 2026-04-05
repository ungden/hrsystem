import { ChatMessage, AgentCoordinationState, AgentRole } from '../agent-types';
import { getEmployees, getEmployeeCareers, getCareerLevel, calculatePromotionReadiness } from '@/lib/supabase-data';
import { formatCurrency } from '../format';
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
  handler: (args: string, state: AgentCoordinationState) => string | Promise<string>;
}

const commands: Command[] = [
  {
    name: '/help',
    aliases: ['help', 'tro giup', '?'],
    description: 'Hien thi danh sach lenh',
    agent: 'ceo',
    handler: () => {
      return `DANH SACH LENH AI AGENTS\n\n` +
        `--- TONG QUAN ---\n` +
        `/overview -- Tong quan doanh nghiep\n` +
        `/targets -- Muc tieu kinh doanh\n` +
        `/health -- Suc khoe tai chinh\n\n` +
        `--- TAI CHINH ---\n` +
        `/revenue -- Phan tich doanh thu\n` +
        `/costs -- Phan tich chi phi\n` +
        `/pnl -- Bao cao lai lo\n` +
        `/cashflow -- Dong tien\n\n` +
        `--- NHAN SU ---\n` +
        `/staff -- Tong quan nhan su\n` +
        `/dept [ten] -- Phan tich phong ban\n` +
        `/emp [ten] -- Thong tin nhan vien\n` +
        `/salary [ten] -- Bang luong nhan vien\n` +
        `/kpi [ten] -- KPI scorecard\n` +
        `/risk -- Nhan vien rui ro\n` +
        `/top -- Top performers\n\n` +
        `--- BONUS ---\n` +
        `/bonus -- Bang tinh thuong\n` +
        `/promotion -- San sang thang tien\n\n` +
        `Hoac go cau hoi tu nhien bang tieng Viet.`;
    }
  },
  {
    name: '/overview',
    aliases: ['overview', 'tong quan', 'bao cao'],
    description: 'Tong quan doanh nghiep',
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

      return `TONG QUAN DOANH NGHIEP\n\n` +
        `--- TAI CHINH (12 thang) ---\n` +
        `Doanh thu:     ${formatCurrency(totalRev12m)} d\n` +
        `Loi nhuan:     ${formatCurrency(totalProfit12m)} d\n` +
        `Bien LN rong:  ${Math.round(totalProfit12m / totalRev12m * 100)}%\n` +
        `EBITDA thang:  ${formatCurrency(lastPnL.ebitda)} d\n\n` +
        `--- NHAN SU ---\n` +
        `Tong nhan su:  ${headcount} nguoi\n` +
        `Chi phi NS/T:  ${formatCurrency(totalCost)} d\n` +
        `Binh quan/NV:  ${formatCurrency(Math.round(totalCost / headcount))} d\n\n` +
        `--- MUC TIEU Q2/2026 ---\n` +
        `Doanh thu MT:  ${rev ? formatCurrency(rev.targetValue) : 'N/A'} d (${rev ? Math.round(rev.currentValue / rev.targetValue * 100) : 0}%)\n` +
        `OKR hoan thanh: ${completed}/${total} (${Math.round(completed / total * 100)}%)\n` +
        `Nhan vien rui ro: ${atRisk}`;
    }
  },
  {
    name: '/targets',
    aliases: ['targets', 'muc tieu', 'okr'],
    description: 'Muc tieu kinh doanh',
    agent: 'ceo',
    handler: (_, state) => {
      let result = `MUC TIEU KINH DOANH Q2/2026\n\n`;
      state.businessTargets.forEach(t => {
        const pct = Math.round(t.currentValue / t.targetValue * 100);
        const bar = '#'.repeat(Math.round(pct / 5)) + '.'.repeat(20 - Math.round(pct / 5));
        const icon = t.status === 'achieved' ? '[OK]' : t.status === 'on_track' ? '[>>]' : t.status === 'at_risk' ? '[!!]' : '[XX]';
        result += `${icon} ${t.name}\n   ${bar} ${pct}%\n   ${formatCurrency(t.currentValue)} / ${formatCurrency(t.targetValue)} ${t.unit}\n\n`;
      });
      return result;
    }
  },
  {
    name: '/health',
    aliases: ['health', 'suc khoe', 'tai chinh'],
    description: 'Suc khoe tai chinh',
    agent: 'finance',
    handler: (_, state) => {
      const h = state.financialHealth;
      const bs = state.financials.balanceSheet.data;
      return `SUC KHOE TAI CHINH\n\n` +
        `Current Ratio:    ${h.currentRatio}x ${h.currentRatio >= 1.5 ? '[OK] Tot' : '[!!] Can chu y'}\n` +
        `No/Von CSH:      ${h.debtToEquity}x ${h.debtToEquity <= 1 ? '[OK] An toan' : '[!!] Cao'}\n` +
        `Bien LN rong:     ${h.profitMargin}% ${h.profitMargin >= 15 ? '[OK] Khoe' : '[!!]'}\n` +
        `Bien EBITDA:       ${h.operatingMargin}%\n` +
        `Tang truong DT:   ${h.revenueGrowth > 0 ? '+' : ''}${h.revenueGrowth}%\n` +
        `Burn Rate:         ${formatCurrency(h.burnRate)} d/thang\n\n` +
        `--- BANG CAN DOI ---\n` +
        `Tong tai san:  ${formatCurrency(bs.tongTaiSan)} d\n` +
        `Tong no:       ${formatCurrency(bs.noPhaiTra.tongNoPhaiTra)} d\n` +
        `Von CSH:       ${formatCurrency(bs.vonChuSoHuu.tongVon)} d\n` +
        `Tien mat:      ${formatCurrency(bs.taiSanNganHan.tienMat)} d`;
    }
  },
  {
    name: '/revenue',
    aliases: ['revenue', 'doanh thu'],
    description: 'Phan tich doanh thu',
    agent: 'ceo',
    handler: (_, state) => {
      const is = state.financials.incomeStatements;
      const last3 = is.slice(-3);
      let result = `PHAN TICH DOANH THU\n\n--- 3 THANG GAN NHAT ---\n`;
      last3.forEach(m => {
        result += `${m.month}: ${formatCurrency(m.doanhThu.tongDoanhThu)} d\n` +
          `  KD: ${formatCurrency(m.doanhThu.kinhdoanh)} | MKT: ${formatCurrency(m.doanhThu.marketing)} | CNTT: ${formatCurrency(m.doanhThu.cntt)}\n`;
      });
      const totalRev = is.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
      result += `\nTong 12 thang: ${formatCurrency(totalRev)} d`;
      return result;
    }
  },
  {
    name: '/costs',
    aliases: ['costs', 'chi phi'],
    description: 'Chi phi nhan su',
    agent: 'finance',
    handler: (_, state) => {
      const costs = state.costProjections;
      const total = costs.reduce((s, c) => s + c.totalCost, 0);
      let result = `CHI PHI NHAN SU THEO PHONG BAN\n\n`;
      costs.sort((a, b) => b.totalCost - a.totalCost).forEach(c => {
        const pct = Math.round(c.totalCost / total * 100);
        result += `${c.department.padEnd(12)} ${c.headcount} NV | ${formatCurrency(c.totalCost).padStart(15)} d (${pct}%)\n`;
      });
      result += `${'─'.repeat(50)}\n`;
      result += `${'TONG'.padEnd(12)} ${costs.reduce((s, c) => s + c.headcount, 0)} NV | ${formatCurrency(total).padStart(15)} d`;
      return result;
    }
  },
  {
    name: '/pnl',
    aliases: ['pnl', 'lai lo', 'ket qua'],
    description: 'Bao cao P&L',
    agent: 'finance',
    handler: (_, state) => {
      const last = state.financials.incomeStatements[state.financials.incomeStatements.length - 1];
      return `BAO CAO KET QUA KINH DOANH - ${last.month}\n\n` +
        `Doanh thu:         ${formatCurrency(last.doanhThu.tongDoanhThu)} d\n` +
        `Chi phi hoat dong: ${formatCurrency(last.chiPhi.tongChiPhi)} d\n` +
        `${'─'.repeat(40)}\n` +
        `EBITDA:            ${formatCurrency(last.ebitda)} d\n` +
        `Khau hao:         -${formatCurrency(last.khauHao)} d\n` +
        `LN truoc thue:     ${formatCurrency(last.loiNhuanTruocThue)} d\n` +
        `Thue TNDN (20%):  -${formatCurrency(last.thueDoanhNghiep)} d\n` +
        `${'─'.repeat(40)}\n` +
        `LOI NHUAN RONG:   ${formatCurrency(last.loiNhuanSauThue)} d\n` +
        `Bien LN rong:      ${Math.round(last.loiNhuanSauThue / last.doanhThu.tongDoanhThu * 100)}%`;
    }
  },
  {
    name: '/staff',
    aliases: ['staff', 'nhan su', 'team'],
    description: 'Tong quan nhan su',
    agent: 'hr_director',
    handler: async () => {
      const employees = await getEmployees();
      const employeeCareers = await getEmployeeCareers();
      const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

      const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
      const levelCounts: Record<string, number> = {};
      employeeCareers.forEach((c: { level_code: string }) => { levelCounts[c.level_code] = (levelCounts[c.level_code] || 0) + 1; });

      let result = `TONG QUAN NHAN SU\n\n`;
      result += `Tong: ${active.length} nhan vien hoat dong\n\n`;
      result += `--- THEO PHONG BAN ---\n`;
      departments.forEach((d: string) => {
        const count = active.filter((e: { department: string }) => e.department === d).length;
        result += `${d.padEnd(12)} ${count} nguoi\n`;
      });
      result += `\n--- THEO LEVEL ---\n`;
      for (const [level, count] of Object.entries(levelCounts).sort()) {
        const levelData = await getCareerLevel(level);
        const name = levelData?.name_vi || level;
        result += `${level} (${name}): ${count} nguoi\n`;
      }
      return result;
    }
  },
  {
    name: '/risk',
    aliases: ['risk', 'rui ro', 'canh bao'],
    description: 'Nhan vien rui ro',
    agent: 'performance_coach',
    handler: async (_, state) => {
      const employees = await getEmployees();
      const employeeCareers = await getEmployeeCareers();

      const atRiskPlans = state.individualPlans.filter(p => p.status === 'at_risk');
      const riskEmps = [...new Set(atRiskPlans.map(p => p.employeeId))];

      let result = `NHAN VIEN RUI RO (${riskEmps.length} nguoi)\n\n`;
      riskEmps.forEach(empId => {
        const emp = employees.find((e: { id: number }) => String(e.id) === empId);
        const empPlans = atRiskPlans.filter(p => p.employeeId === empId);
        if (emp) {
          result += `[!] ${emp.name} (${emp.role}, ${emp.department})\n`;
          result += `   Rui ro: ${empPlans.length} nhiem vu\n\n`;
        }
      });
      if (riskEmps.length === 0) result += `[OK] Khong co nhan vien nao dang gap rui ro.`;
      return result;
    }
  },
  {
    name: '/top',
    aliases: ['top', 'xuat sac', 'best'],
    description: 'Top performers',
    agent: 'performance_coach',
    handler: async (_, state) => {
      const employees = await getEmployees();

      const empScores = employees.filter((e: { status: string }) => e.status === 'Đang làm việc').map((emp: { id: number; name: string }) => {
        const plans = state.individualPlans.filter(p => p.employeeId === String(emp.id));
        const completed = plans.filter(p => p.status === 'completed').length;
        return { emp, completed, total: plans.length, rate: plans.length > 0 ? Math.round(completed / plans.length * 100) : 0 };
      }).sort((a, b) => b.rate - a.rate);

      let result = `TOP 10 NHAN VIEN XUAT SAC\n\n`;
      empScores.slice(0, 10).forEach((s, i) => {
        const medal = i === 0 ? '[1]' : i === 1 ? '[2]' : i === 2 ? '[3]' : `${i + 1}.`;
        result += `${medal} ${s.emp.name.padEnd(20)} CV: ${s.completed}/${s.total} (${s.rate}%)\n`;
      });
      return result;
    }
  },
  {
    name: '/bonus',
    aliases: ['bonus', 'thuong', 'bang thuong'],
    description: 'Bang tinh thuong',
    agent: 'finance',
    handler: async () => {
      const employees = await getEmployees();
      const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
      let totalBonus = 0;
      let result = `BANG TINH THUONG Q2/2026\n\n`;
      result += `${'Nhan vien'.padEnd(22)} ${'KPI'.padStart(5)} ${'Loai'.padStart(8)} ${'Thuong'.padStart(14)}\n`;
      result += `${'─'.repeat(52)}\n`;

      for (const emp of active) {
        const card = await generateEmployeeKPICard(String(emp.id));
        if (card) {
          totalBonus += card.bonusAmount;
          result += `${emp.name.padEnd(22)} ${(card.totalWeightedScore + '%').padStart(5)} ${card.bonusTier.padStart(8)} ${formatCurrency(card.bonusAmount).padStart(14)}\n`;
        }
      }
      result += `${'─'.repeat(52)}\n`;
      result += `${'TONG QUY THUONG'.padEnd(37)} ${formatCurrency(totalBonus).padStart(14)} d`;
      return result;
    }
  },
  {
    name: '/promotion',
    aliases: ['promotion', 'thang tien'],
    description: 'San sang thang tien',
    agent: 'hr_director',
    handler: async () => {
      const employees = await getEmployees();
      const employeeCareers = await getEmployeeCareers();
      const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
      const ready: string[] = [];
      const notReady: string[] = [];

      for (const emp of active) {
        const p = await calculatePromotionReadiness(emp.id);
        const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
        if (p?.overallReady) {
          ready.push(`[OK] ${emp.name} (${career?.level_code || '?'} -> ${p.nextLevel?.code || '?'})`);
        } else if (p) {
          notReady.push(`[..] ${emp.name}: ${p.missingCriteria[0] || 'Chua du DK'}`);
        }
      }

      return `DANH GIA THANG TIEN\n\n` +
        `--- DU DIEU KIEN (${ready.length}) ---\n${ready.join('\n') || 'Khong co'}\n\n` +
        `--- CHUA DU (${notReady.length}) ---\n${notReady.slice(0, 8).join('\n')}${notReady.length > 8 ? `\n... va ${notReady.length - 8} nguoi nua` : ''}`;
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
async function handleEmpCommand(prefix: string, empName: string, state: AgentCoordinationState): Promise<string | null> {
  const employees = await getEmployees();
  const employeeCareers = await getEmployeeCareers();

  const emp = employees.find((e: { name: string }) => e.name.toLowerCase().includes(empName.toLowerCase()));
  if (!emp) return `Khong tim thay nhan vien "${empName}". Thu go ten day du.`;

  const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
  const plans = state.individualPlans.filter(p => p.employeeId === String(emp.id));
  const completed = plans.filter(p => p.status === 'completed').length;
  const salary = state.salaryProjections.find(s => s.employeeId === String(emp.id));

  if (prefix === '/emp' || prefix === 'emp') {
    return `${emp.name}\n\n` +
      `Chuc vu:    ${emp.role}\n` +
      `Phong ban:  ${emp.department}\n` +
      `Level:      ${career?.level_code || 'N/A'}\n` +
      `Luong:      ${salary ? formatCurrency(salary.projectedTotal) : 'N/A'} d\n` +
      `Cong viec:  ${completed}/${plans.length} hoan thanh`;
  }

  if (prefix === '/salary' || prefix === 'salary' || prefix === 'luong') {
    const payslip = await generatePayslip(String(emp.id), 4);
    if (!payslip) return `Khong co du lieu luong cho ${emp.name}.`;
    return `BANG LUONG ${emp.name} - ${payslip.month}\n\n` +
      `I. THU NHAP\n` +
      `   Luong CB:     ${formatCurrency(payslip.thuNhap.luongCoBan)} d\n` +
      `   Phu cap:      ${formatCurrency(payslip.thuNhap.tongThuNhap - payslip.thuNhap.luongCoBan)} d\n` +
      `   Tong TN:      ${formatCurrency(payslip.thuNhap.tongThuNhap)} d\n\n` +
      `II. THUONG (KPI ${payslip.thuong.kpiAchievement}%)\n` +
      `   Thuong KPI:   ${formatCurrency(payslip.thuong.thuongKPI)} d\n` +
      `   Thuong PB:    ${formatCurrency(payslip.thuong.thuongPhongBan)} d\n` +
      `   Thuong CT:    ${formatCurrency(payslip.thuong.thuongCongTy)} d\n` +
      `   Tong thuong:  ${formatCurrency(payslip.thuong.tongThuong)} d\n\n` +
      `III. KHAU TRU\n` +
      `   BHXH:         ${formatCurrency(Math.abs(payslip.khauTru.bhxh))} d\n` +
      `   BHYT:         ${formatCurrency(Math.abs(payslip.khauTru.bhyt))} d\n` +
      `   BHTN:         ${formatCurrency(Math.abs(payslip.khauTru.bhtn))} d\n` +
      `   Thue TNCN:    ${formatCurrency(Math.abs(payslip.khauTru.thueTNCN))} d\n` +
      `   Tong KT:      ${formatCurrency(Math.abs(payslip.khauTru.tongKhauTru))} d\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n` +
      `THUC NHAN:       ${formatCurrency(payslip.thucNhan)} d`;
  }

  if (prefix === '/kpi') {
    const card = await generateEmployeeKPICard(String(emp.id));
    if (!card) return `Khong co du lieu KPI cho ${emp.name}.`;
    let result = `KPI SCORECARD - ${emp.name}\n\n`;
    result += `Diem tong hop: ${card.totalWeightedScore}% | Xep loai: ${card.bonusTier} | Thuong: ${formatCurrency(card.bonusAmount)} d\n\n`;
    card.kpis.forEach(k => {
      const icon = k.status === 'exceeded' ? '[OK]' : k.status === 'met' ? '[>>]' : k.status === 'near' ? '[!!]' : '[XX]';
      result += `${icon} ${k.name.padEnd(25)} ${k.weight}% | ${k.actual}/${k.target} ${k.unit} (${k.achievement}%)\n`;
    });
    return result;
  }

  return null;
}

// Handle dept-specific commands
async function handleDeptCommand(deptName: string, state: AgentCoordinationState): Promise<string> {
  const employees = await getEmployees();
  const employeeCareers = await getEmployeeCareers();
  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  const dept = departments.find((d: string) => d.toLowerCase().includes(deptName.toLowerCase()));
  if (!dept) return `Khong tim thay phong ban "${deptName}". Cac PB: ${departments.join(', ')}`;

  const deptEmps = employees.filter((e: { department: string; status: string }) => e.department === dept && e.status === 'Đang làm việc');
  const deptPlans = state.individualPlans.filter(p => deptEmps.some((e: { id: number }) => String(e.id) === p.employeeId));
  const completed = deptPlans.filter(p => p.status === 'completed').length;
  const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;
  const cost = state.costProjections.find(c => c.department === dept);
  const detail = state.departmentDetails.find(d => d.department === dept);

  let result = `${dept}\n\n`;
  result += `Truong phong: ${detail?.headName || 'N/A'}\n`;
  result += `Nhan su:      ${deptEmps.length} nguoi\n`;
  result += `KPI TB:       ${detail?.avgKPI || 0}%\n`;
  result += `Chi phi/T:    ${cost ? formatCurrency(cost.totalCost) : 'N/A'} d\n`;
  result += `Bien LN:      ${detail?.contributionMargin || 0}%\n\n`;
  result += `--- CONG VIEC ---\n`;
  result += `Tong: ${deptPlans.length} | Xong: ${completed} | Rui ro: ${atRisk}\n\n`;
  result += `--- NHAN VIEN ---\n`;
  deptEmps.forEach((e: { id: number; name: string; role: string }) => {
    const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === e.id);
    result += `${e.name.padEnd(20)} ${(career?.level_code || 'L3').padEnd(4)} ${e.role}\n`;
  });
  return result;
}

// ============ MAIN PROCESSOR ============

export async function processUserChat(input: string, state: AgentCoordinationState): Promise<ChatMessage[]> {
  const trimmed = input.trim();

  // Check for exact commands first
  const cmd = findCommand(trimmed);
  if (cmd) {
    const args = extractArgs(trimmed, cmd);

    // Handle commands with employee args
    if ((cmd.name === '/emp' || cmd.name === '/salary' || cmd.name === '/kpi') && args) {
      const result = await handleEmpCommand(cmd.name, args, state);
      if (result) {
        return [{ id: genId(), sender: cmd.agent, senderName: agentProfiles[cmd.agent].name, content: result, timestamp: now() }];
      }
    }

    // Handle dept command
    if (cmd.name === '/dept' && args) {
      return [{ id: genId(), sender: 'dept_manager', senderName: 'AI Dept Manager', content: await handleDeptCommand(args, state), timestamp: now() }];
    }

    const result = await cmd.handler(args, state);
    return [{ id: genId(), sender: cmd.agent, senderName: agentProfiles[cmd.agent].name, content: result, timestamp: now() }];
  }

  // Natural language fallback -- try to match employee/dept names or keywords
  const lower = trimmed.toLowerCase();

  // Fetch employees for NLP matching
  const employees = await getEmployees();
  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  // Check for employee names
  for (const emp of employees) {
    if (lower.includes(emp.name.toLowerCase())) {
      const result = await handleEmpCommand('/emp', emp.name, state);
      if (result) {
        return [{ id: genId(), sender: 'performance_coach', senderName: 'AI Coach', content: result, timestamp: now() }];
      }
    }
  }

  // Check for department names
  for (const dept of departments) {
    if (lower.includes(dept.toLowerCase())) {
      return [{ id: genId(), sender: 'dept_manager', senderName: 'AI Dept Manager', content: await handleDeptCommand(dept, state), timestamp: now() }];
    }
  }

  // Keyword routing
  if (['doanh thu', 'revenue'].some(kw => lower.includes(kw))) {
    return processUserChat('/revenue', state);
  }
  if (['chi phi', 'cost'].some(kw => lower.includes(kw))) {
    return processUserChat('/costs', state);
  }
  if (['luong', 'salary'].some(kw => lower.includes(kw))) {
    return processUserChat('/staff', state);
  }
  if (['rui ro', 'risk', 'canh bao'].some(kw => lower.includes(kw))) {
    return processUserChat('/risk', state);
  }
  if (['thuong', 'bonus'].some(kw => lower.includes(kw))) {
    return processUserChat('/bonus', state);
  }
  if (['muc tieu', 'target', 'okr'].some(kw => lower.includes(kw))) {
    return processUserChat('/targets', state);
  }
  if (['tai chinh', 'suc khoe'].some(kw => lower.includes(kw))) {
    return processUserChat('/health', state);
  }
  if (['pnl', 'lai lo', 'ket qua'].some(kw => lower.includes(kw))) {
    return processUserChat('/pnl', state);
  }

  // Default: show overview + help hint
  return [{
    id: genId(),
    sender: 'ceo',
    senderName: 'AI CEO',
    content: `Toi khong hieu ro cau hoi "${trimmed}".\n\nGo /help de xem danh sach lenh, hoac thu:\n- Ten nhan vien (VD: "Hoang Thai Son")\n- Ten phong ban (VD: "Sales")\n- Tu khoa: doanh thu, chi phi, rui ro, thuong, muc tieu...`,
    timestamp: now(),
  }];
}
