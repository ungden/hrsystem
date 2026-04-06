import { ChatMessage, AgentCoordinationState, AgentRole } from '../agent-types';
import { getEmployees, getEmployeeCareers, getCareerLevel, calculatePromotionReadiness } from '@/lib/supabase-data';
import { formatCurrency } from '../format';
import { agentProfiles } from './agent-profiles';
import { generateEmployeeKPICard } from '../payslip-data';
import { generatePayslip } from '../payslip-data';
import { getActionLog } from './agent-skills';
import { runWorkflow } from './workflow-engine';

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
    description: 'Hiển thị danh sách lệnh',
    agent: 'ceo',
    handler: () => {
      return `DANH SÁCH LỆNH AI AGENTS\n\n` +
        `--- TỔNG QUAN ---\n` +
        `/overview -- Tổng quan doanh nghiệp\n` +
        `/targets -- Mục tiêu kinh doanh\n` +
        `/health -- Sức khỏe tài chính\n\n` +
        `--- TÀI CHÍNH ---\n` +
        `/revenue -- Phân tích doanh thu\n` +
        `/costs -- Phân tích chi phí\n` +
        `/pnl -- Báo cáo lãi lỗ\n` +
        `/cashflow -- Dòng tiền\n\n` +
        `--- NHÂN SỰ ---\n` +
        `/staff -- Tổng quan nhân sự\n` +
        `/dept [tên] -- Phân tích phòng ban\n` +
        `/emp [tên] -- Thông tin nhân viên\n` +
        `/salary [tên] -- Bảng lương nhân viên\n` +
        `/kpi [tên] -- KPI scorecard\n` +
        `/risk -- Nhân viên rủi ro\n` +
        `/top -- Top performers\n\n` +
        `--- BONUS ---\n` +
        `/bonus -- Bảng tính thưởng\n` +
        `/promotion -- Sẵn sàng thăng tiến\n\n` +
        `--- KÊNH BÁN HÀNG ---\n` +
        `/channels -- Phân tích 5 kênh bán\n` +
        `/ads -- ROAS & chi phí quảng cáo\n\n` +
        `--- KHO & SẢN XUẤT ---\n` +
        `/inventory -- Tồn kho & cảnh báo\n` +
        `/forecast -- Dự báo nhu cầu\n\n` +
        `--- BỘ SƯU TẬP ---\n` +
        `/collections -- 12 BST trong năm\n` +
        `/bestsellers -- Sản phẩm bán chạy\n\n` +
        `--- VẬN HÀNH (WORKFLOW) ---\n` +
        `/workflow -- Khởi chạy workflow CEO → Agents\n` +
        `/status -- Trạng thái workflow hiện tại\n` +
        `/proposals -- Xem tất cả đề xuất\n` +
        `/timeline -- Lịch sử workflow\n\n` +
        `--- HỆ THỐNG ---\n` +
        `/actions -- Lịch sử hành động AI\n\n` +
        `Hoặc gõ câu hỏi tự nhiên bằng tiếng Việt.`;
    }
  },
  {
    name: '/overview',
    aliases: ['overview', 'tong quan', 'bao cao'],
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

      return `TỔNG QUAN DOANH NGHIỆP\n\n` +
        `--- TÀI CHÍNH (12 tháng) ---\n` +
        `Doanh thu:     ${formatCurrency(totalRev12m)} đ\n` +
        `Lợi nhuận:     ${formatCurrency(totalProfit12m)} đ\n` +
        `Biên LN ròng:  ${Math.round(totalProfit12m / totalRev12m * 100)}%\n` +
        `EBITDA tháng:  ${formatCurrency(lastPnL.ebitda)} đ\n\n` +
        `--- NHÂN SỰ ---\n` +
        `Tổng nhân sự:  ${headcount} người\n` +
        `Chi phí NS/T:  ${formatCurrency(totalCost)} đ\n` +
        `Bình quân/NV:  ${formatCurrency(Math.round(totalCost / headcount))} đ\n\n` +
        `--- MỤC TIÊU Q2/2026 ---\n` +
        `Doanh thu MT:  ${rev ? formatCurrency(rev.targetValue) : 'N/A'} đ (${rev ? Math.round(rev.currentValue / rev.targetValue * 100) : 0}%)\n` +
        `OKR hoàn thành: ${completed}/${total} (${Math.round(completed / total * 100)}%)\n` +
        `Nhân viên rủi ro: ${atRisk}`;
    }
  },
  {
    name: '/targets',
    aliases: ['targets', 'muc tieu', 'okr'],
    description: 'Mục tiêu kinh doanh',
    agent: 'ceo',
    handler: (_, state) => {
      let result = `MỤC TIÊU KINH DOANH Q2/2026\n\n`;
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
    description: 'Sức khỏe tài chính',
    agent: 'finance',
    handler: (_, state) => {
      const h = state.financialHealth;
      const bs = state.financials.balanceSheet.data;
      return `SỨC KHỎE TÀI CHÍNH\n\n` +
        `Current Ratio:    ${h.currentRatio}x ${h.currentRatio >= 1.5 ? '[OK] Tốt' : '[!!] Cần chú ý'}\n` +
        `Nợ/Vốn CSH:      ${h.debtToEquity}x ${h.debtToEquity <= 1 ? '[OK] An toàn' : '[!!] Cao'}\n` +
        `Biên LN ròng:     ${h.profitMargin}% ${h.profitMargin >= 15 ? '[OK] Khỏe' : '[!!]'}\n` +
        `Biên EBITDA:       ${h.operatingMargin}%\n` +
        `Tăng trưởng DT:   ${h.revenueGrowth > 0 ? '+' : ''}${h.revenueGrowth}%\n` +
        `Burn Rate:         ${formatCurrency(h.burnRate)} đ/tháng\n\n` +
        `--- BẢNG CÂN ĐỐI ---\n` +
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
      let result = `PHÂN TÍCH DOANH THU\n\n--- 3 THÁNG GẦN NHẤT ---\n`;
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
    aliases: ['costs', 'chi phi'],
    description: 'Chi phí nhân sự',
    agent: 'finance',
    handler: (_, state) => {
      const costs = state.costProjections;
      const total = costs.reduce((s, c) => s + c.totalCost, 0);
      let result = `CHI PHÍ NHÂN SỰ THEO PHÒNG BAN\n\n`;
      costs.sort((a, b) => b.totalCost - a.totalCost).forEach(c => {
        const pct = Math.round(c.totalCost / total * 100);
        result += `${c.department.padEnd(12)} ${c.headcount} NV | ${formatCurrency(c.totalCost).padStart(15)} đ (${pct}%)\n`;
      });
      result += `${'─'.repeat(50)}\n`;
      result += `${'TỔNG'.padEnd(12)} ${costs.reduce((s, c) => s + c.headcount, 0)} NV | ${formatCurrency(total).padStart(15)} đ`;
      return result;
    }
  },
  {
    name: '/pnl',
    aliases: ['pnl', 'lai lo', 'ket qua'],
    description: 'Báo cáo P&L',
    agent: 'finance',
    handler: (_, state) => {
      const last = state.financials.incomeStatements[state.financials.incomeStatements.length - 1];
      return `BÁO CÁO KẾT QUẢ KINH DOANH - ${last.month}\n\n` +
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
    aliases: ['staff', 'nhan su', 'team'],
    description: 'Tổng quan nhân sự',
    agent: 'hr_director',
    handler: async () => {
      const employees = await getEmployees();
      const employeeCareers = await getEmployeeCareers();
      const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

      const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
      const levelCounts: Record<string, number> = {};
      employeeCareers.forEach((c: { level_code: string }) => { levelCounts[c.level_code] = (levelCounts[c.level_code] || 0) + 1; });

      let result = `TỔNG QUAN NHÂN SỰ\n\n`;
      result += `Tổng: ${active.length} nhân viên hoạt động\n\n`;
      result += `--- THEO PHÒNG BAN ---\n`;
      departments.forEach((d: string) => {
        const count = active.filter((e: { department: string }) => e.department === d).length;
        result += `${d.padEnd(12)} ${count} người\n`;
      });
      result += `\n--- THEO LEVEL ---\n`;
      for (const [level, count] of Object.entries(levelCounts).sort()) {
        const levelData = await getCareerLevel(level);
        const name = levelData?.name_vi || level;
        result += `${level} (${name}): ${count} người\n`;
      }
      return result;
    }
  },
  {
    name: '/risk',
    aliases: ['risk', 'rui ro', 'canh bao'],
    description: 'Nhân viên rủi ro',
    agent: 'performance_coach',
    handler: async (_, state) => {
      const employees = await getEmployees();
      const employeeCareers = await getEmployeeCareers();

      const atRiskPlans = state.individualPlans.filter(p => p.status === 'at_risk');
      const riskEmps = [...new Set(atRiskPlans.map(p => p.employeeId))];

      let result = `NHÂN VIÊN RỦI RO (${riskEmps.length} người)\n\n`;
      riskEmps.forEach(empId => {
        const emp = employees.find((e: { id: number }) => String(e.id) === empId);
        const empPlans = atRiskPlans.filter(p => p.employeeId === empId);
        if (emp) {
          result += `[!] ${emp.name} (${emp.role}, ${emp.department})\n`;
          result += `   Rủi ro: ${empPlans.length} nhiệm vụ\n\n`;
        }
      });
      if (riskEmps.length === 0) result += `[OK] Không có nhân viên nào đang gặp rủi ro.`;
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

      let result = `TOP 10 NHÂN VIÊN XUẤT SẮC\n\n`;
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
    description: 'Bảng tính thưởng',
    agent: 'finance',
    handler: async () => {
      const employees = await getEmployees();
      const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
      let totalBonus = 0;
      let result = `BẢNG TÍNH THƯỞNG Q2/2026\n\n`;
      result += `${'Nhân viên'.padEnd(22)} ${'KPI'.padStart(5)} ${'Loại'.padStart(8)} ${'Thưởng'.padStart(14)}\n`;
      result += `${'─'.repeat(52)}\n`;

      for (const emp of active) {
        const card = await generateEmployeeKPICard(String(emp.id));
        if (card) {
          totalBonus += card.bonusAmount;
          result += `${emp.name.padEnd(22)} ${(card.totalWeightedScore + '%').padStart(5)} ${card.bonusTier.padStart(8)} ${formatCurrency(card.bonusAmount).padStart(14)}\n`;
        }
      }
      result += `${'─'.repeat(52)}\n`;
      result += `${'TỔNG QUỸ THƯỞNG'.padEnd(37)} ${formatCurrency(totalBonus).padStart(14)} đ`;
      return result;
    }
  },
  {
    name: '/promotion',
    aliases: ['promotion', 'thang tien'],
    description: 'Sẵn sàng thăng tiến',
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
          notReady.push(`[..] ${emp.name}: ${p.missingCriteria[0] || 'Chưa đủ ĐK'}`);
        }
      }

      return `ĐÁNH GIÁ THĂNG TIẾN\n\n` +
        `--- ĐỦ ĐIỀU KIỆN (${ready.length}) ---\n${ready.join('\n') || 'Không có'}\n\n` +
        `--- CHƯA ĐỦ (${notReady.length}) ---\n${notReady.slice(0, 8).join('\n')}${notReady.length > 8 ? `\n... và ${notReady.length - 8} người nữa` : ''}`;
    }
  },
  // ============ CHANNEL OPTIMIZER COMMANDS ============
  {
    name: '/channels',
    aliases: ['channels', 'kenh ban', 'kenh'],
    description: 'Phân tích 5 kênh bán hàng',
    agent: 'channel_optimizer' as AgentRole,
    handler: (_, state) => {
      const channels = state.channelAnalysis;
      if (!channels || channels.length === 0) return 'Chưa có dữ liệu kênh bán hàng. Chạy lại coordination.';
      let result = `PHÂN TÍCH 5 KÊNH BÁN HÀNG\n\n`;
      result += `${'Kênh'.padEnd(20)} ${'DT'.padStart(12)} ${'Margin'.padStart(8)} ${'ROAS'.padStart(6)} ${'Đề xuất'.padStart(10)}\n`;
      result += `${'─'.repeat(58)}\n`;
      channels.forEach(ch => {
        const rec = ch.recommendation === 'increase' ? '[TĂNG]' : ch.recommendation === 'decrease' ? '[GIẢM]' : ch.recommendation === 'optimize' ? '[TỐI ƯU]' : '[GIỮ]';
        result += `${ch.channel.padEnd(20)} ${formatCurrency(ch.revenue).padStart(12)} ${(ch.margin_pct + '%').padStart(8)} ${(ch.roas + 'x').padStart(6)} ${rec.padStart(10)}\n`;
      });
      const totalRev = channels.reduce((s, c) => s + c.revenue, 0);
      result += `${'─'.repeat(58)}\n`;
      result += `${'TỔNG'.padEnd(20)} ${formatCurrency(totalRev).padStart(12)}\n\n`;
      result += `Chiến lược: Push Website (margin 40.9%) > Social > Shopee (18.5%)`;
      return result;
    }
  },
  {
    name: '/ads',
    aliases: ['ads', 'quang cao', 'roas'],
    description: 'ROAS và chi phí quảng cáo',
    agent: 'channel_optimizer' as AgentRole,
    handler: (_, state) => {
      const channels = state.channelAnalysis;
      if (!channels || channels.length === 0) return 'Chưa có dữ liệu quảng cáo.';
      let result = `CHI PHÍ QUẢNG CÁO & ROAS\n\n`;
      channels.forEach(ch => {
        const bar = ch.roas >= 6 ? '█'.repeat(Math.min(Math.round(ch.roas), 15)) : '▓'.repeat(Math.min(Math.round(ch.roas), 15));
        const status = ch.roas >= 6 ? '[OK]' : ch.roas >= 4 ? '[>>]' : '[!!]';
        result += `${status} ${ch.channel.padEnd(20)} Ad: ${formatCurrency(ch.adSpend).padStart(10)} → ROAS ${ch.roas}x ${bar}\n`;
      });
      const totalAd = channels.reduce((s, c) => s + c.adSpend, 0);
      result += `\nTổng budget ads: ${formatCurrency(totalAd)} đ`;
      return result;
    }
  },
  // ============ INVENTORY COMMANDS ============
  {
    name: '/inventory',
    aliases: ['inventory', 'ton kho', 'kho'],
    description: 'Tồn kho và cảnh báo',
    agent: 'inventory_planner' as AgentRole,
    handler: (_, state) => {
      const alerts = state.stockAlerts;
      if (!alerts || alerts.length === 0) return 'Chưa có dữ liệu tồn kho.';
      const critical = alerts.filter(a => a.status === 'critical');
      const low = alerts.filter(a => a.status === 'low');
      const dead = alerts.filter(a => a.status === 'dead');
      const ok = alerts.filter(a => a.status === 'ok');

      let result = `TỒN KHO & CẢNH BÁO\n\n`;
      if (critical.length > 0) {
        result += `[!!!] HẾT HÀNG (${critical.length}):\n`;
        critical.forEach(a => result += `  ${a.itemName}: ${a.currentStock} (min: ${a.minStock}) → ${a.action}\n`);
        result += `\n`;
      }
      if (low.length > 0) {
        result += `[!!] SẮP HẾT (${low.length}):\n`;
        low.forEach(a => result += `  ${a.itemName}: ${a.currentStock}/${a.minStock}\n`);
        result += `\n`;
      }
      if (dead.length > 0) {
        result += `[--] TỒN CAO (${dead.length}):\n`;
        dead.forEach(a => result += `  ${a.itemName}: ${a.currentStock} → Xem xét clear stock\n`);
        result += `\n`;
      }
      result += `[OK] Ổn định: ${ok.length} items`;
      return result;
    }
  },
  {
    name: '/forecast',
    aliases: ['forecast', 'du bao', 'san xuat', 'production'],
    description: 'Dự báo nhu cầu 3 tháng',
    agent: 'inventory_planner' as AgentRole,
    handler: (_, state) => {
      const forecasts = state.inventoryForecasts;
      if (!forecasts || forecasts.length === 0) return 'Chưa có dữ liệu dự báo.';
      let result = `DỰ BÁO NHU CẦU & SẢN XUẤT\n\n`;
      forecasts.forEach(f => {
        const reorder = f.reorderNeeded ? '[ĐẶT HÀNG]' : '[OK]';
        result += `T${f.month}/2026:\n`;
        result += `  Nhu cầu:    ${f.demandUnits.toLocaleString()} áo\n`;
        result += `  Tồn kho:    ${f.currentStock.toLocaleString()} áo ${reorder}\n`;
        result += `  Sản xuất:   ${f.productionBatches} lô x 500 áo\n`;
        result += `  Nguyên liệu: ${f.rawMaterialNeeded.toLocaleString()} áo trắng\n\n`;
      });
      return result;
    }
  },
  // ============ COLLECTION COMMANDS ============
  {
    name: '/collections',
    aliases: ['collections', 'bst', 'bo suu tap'],
    description: '12 BST trong năm',
    agent: 'collection_director' as AgentRole,
    handler: (_, state) => {
      const plans = state.collectionPlans;
      if (!plans || plans.length === 0) return 'Chưa có dữ liệu BST.';
      let result = `12 BỘ SƯU TẬP 2026\n\n`;
      plans.forEach(p => {
        const icon = p.status === 'launched' ? '[LIVE]' : p.status === 'completed' ? '[XONG]' : p.status === 'in_production' ? '[SX]' : p.status === 'in_design' ? '[TK]' : '[KH]';
        result += `T${String(p.month).padStart(2, '0')} ${icon} ${p.name.padEnd(22)} ${p.theme}\n`;
        result += `    SKU: ${p.targetSKUs} | Best sellers: ${p.topSellers}\n`;
      });
      const totalSKU = plans.reduce((s, p) => s + p.targetSKUs, 0);
      result += `\nTổng: ${totalSKU} SKU/năm. Workflow: Brief → AI design → Curate → Print → Launch (7 ngày)`;
      return result;
    }
  },
  {
    name: '/bestsellers',
    aliases: ['bestsellers', 'ban chay', 'top sp'],
    description: 'Sản phẩm bán chạy',
    agent: 'collection_director' as AgentRole,
    handler: (_, state) => {
      const plans = state.collectionPlans;
      if (!plans || plans.length === 0) return 'Chưa có dữ liệu BST.';
      const launched = plans.filter(p => p.status === 'launched' || p.status === 'completed');
      let result = `SẢN PHẨM BÁN CHẠY THEO BST\n\n`;
      launched.forEach(p => {
        result += `${p.name} (T${p.month}): ${p.topSellers} best sellers / ${p.targetSKUs} SKU\n`;
      });
      if (launched.length === 0) result += 'Chưa có BST nào được launch.';
      result += `\nNgưỡng reprint: >50 bán/tháng. Ngưỡng retire: <5 bán/tháng sau 2 tháng.`;
      return result;
    }
  },
  // ============ SYSTEM COMMANDS ============
  {
    name: '/actions',
    aliases: ['actions', 'hanh dong', 'log'],
    description: 'Lịch sử hành động AI',
    agent: 'ceo' as AgentRole,
    handler: () => {
      const actions = getActionLog();
      if (actions.length === 0) return 'Chưa có hành động nào được ghi nhận trong phiên này.';
      let result = `LỊCH SỬ HÀNH ĐỘNG AI (${actions.length})\n\n`;
      actions.slice(-20).forEach(a => {
        const icon = a.success ? '[OK]' : '[X]';
        const time = new Date(a.timestamp).toLocaleTimeString('vi');
        result += `${icon} ${time} [${a.agentRole}] ${a.description}\n`;
      });
      if (actions.length > 20) result += `\n... và ${actions.length - 20} hành động trước đó`;
      return result;
    }
  },
  // ============ WORKFLOW COMMANDS ============
  {
    name: '/workflow',
    aliases: ['workflow', 'van hanh', 'chay'],
    description: 'Khởi chạy workflow CEO → Agents',
    agent: 'ceo' as AgentRole,
    handler: async (_, state) => {
      // This is a special command — handled in processUserChat directly
      return 'WORKFLOW_TRIGGER';
    }
  },
  {
    name: '/status',
    aliases: ['status', 'trang thai'],
    description: 'Trạng thái workflow hiện tại',
    agent: 'ceo' as AgentRole,
    handler: (_, state) => {
      const wf = state.workflowRun;
      if (!wf) return 'Chưa có workflow nào. Gõ /workflow để khởi chạy.';
      const phaseLabels: Record<string, string> = {
        idle: 'Chờ', strategy: 'Chiến lược', proposals: 'Đề xuất',
        review: 'Review', debate: 'Thảo luận', execution: 'Thực thi',
        monitoring: 'Giám sát', complete: 'Hoàn tất',
      };
      const approved = wf.approvedProposals.length;
      const rejected = wf.rejectedProposals.length;
      const pending = wf.proposals.length - approved - rejected;
      return `TRẠNG THÁI WORKFLOW\n\n` +
        `  ID: ${wf.id}\n` +
        `  Phase: ${phaseLabels[wf.phase] || wf.phase}\n` +
        `  Bắt đầu: ${new Date(wf.startedAt).toLocaleString('vi')}\n` +
        `  ${wf.completedAt ? `Hoàn tất: ${new Date(wf.completedAt).toLocaleString('vi')}\n` : ''}` +
        `  Chiến lược: ${wf.strategy?.focus || 'N/A'}\n\n` +
        `  Đề xuất: ${wf.proposals.length} (${approved} duyệt, ${rejected} từ chối, ${pending} chờ)\n` +
        `  Debates: ${wf.debates.length} lượt\n` +
        `  Events: ${wf.timeline.length}`;
    }
  },
  {
    name: '/proposals',
    aliases: ['proposals', 'de xuat'],
    description: 'Xem tất cả đề xuất',
    agent: 'ceo' as AgentRole,
    handler: (_, state) => {
      const wf = state.workflowRun;
      if (!wf || wf.proposals.length === 0) return 'Chưa có đề xuất nào. Gõ /workflow để khởi chạy.';
      let result = `TẤT CẢ ĐỀ XUẤT (${wf.proposals.length})\n\n`;
      wf.proposals.forEach(p => {
        const icon = p.status === 'approved' ? '[V]' : p.status === 'rejected' ? '[X]' : '[?]';
        const profile = agentProfiles[p.agentRole];
        result += `${icon} ${(profile?.name || p.agentRole).padEnd(24)} ${(p.reviewScore || 0) + '/100'.padStart(7)} ${p.title}\n`;
        result += `   ${p.summary.slice(0, 80)}${p.summary.length > 80 ? '...' : ''}\n\n`;
      });
      return result;
    }
  },
  {
    name: '/timeline',
    aliases: ['timeline', 'lich su wf'],
    description: 'Lịch sử workflow',
    agent: 'ceo' as AgentRole,
    handler: (_, state) => {
      const wf = state.workflowRun;
      if (!wf || wf.timeline.length === 0) return 'Chưa có workflow nào. Gõ /workflow để khởi chạy.';
      let result = `TIMELINE WORKFLOW (${wf.timeline.length} events)\n\n`;
      let currentPhase = '';
      wf.timeline.forEach(e => {
        if (e.phase !== currentPhase) {
          currentPhase = e.phase;
          result += `\n--- ${currentPhase.toUpperCase()} ---\n`;
        }
        const time = new Date(e.timestamp).toLocaleTimeString('vi');
        const icon = e.type === 'approved' ? '[V]' : e.type === 'rejected' ? '[X]' : e.type === 'debate' ? '[?]' : '[>]';
        result += `${time} ${icon} [${e.agentRole}] ${e.description}\n`;
      });
      return result;
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
  if (!emp) return `Không tìm thấy nhân viên "${empName}". Thử gõ tên đầy đủ.`;

  const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
  const plans = state.individualPlans.filter(p => p.employeeId === String(emp.id));
  const completed = plans.filter(p => p.status === 'completed').length;
  const salary = state.salaryProjections.find(s => s.employeeId === String(emp.id));

  if (prefix === '/emp' || prefix === 'emp') {
    return `${emp.name}\n\n` +
      `Chức vụ:    ${emp.role}\n` +
      `Phòng ban:  ${emp.department}\n` +
      `Level:      ${career?.level_code || 'N/A'}\n` +
      `Lương:      ${salary ? formatCurrency(salary.projectedTotal) : 'N/A'} đ\n` +
      `Công việc:  ${completed}/${plans.length} hoàn thành`;
  }

  if (prefix === '/salary' || prefix === 'salary' || prefix === 'luong') {
    const payslip = await generatePayslip(String(emp.id), 4);
    if (!payslip) return `Không có dữ liệu lương cho ${emp.name}.`;
    return `BẢNG LƯƠNG ${emp.name} - ${payslip.month}\n\n` +
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
    const card = await generateEmployeeKPICard(String(emp.id));
    if (!card) return `Không có dữ liệu KPI cho ${emp.name}.`;
    let result = `KPI SCORECARD - ${emp.name}\n\n`;
    result += `Điểm tổng hợp: ${card.totalWeightedScore}% | Xếp loại: ${card.bonusTier} | Thưởng: ${formatCurrency(card.bonusAmount)} đ\n\n`;
    card.kpis.forEach(k => {
      const icon = k.status === 'exceeded' ? '[OK]' : k.status === 'met' ? '[>>]' : k.status === 'near' ? '[!!]' : '[XX]';
      result += `${icon} ${k.name.padEnd(25)} ${k.weight}% | ${k.actual}/${k.target} ${k.unit} (${k.achievement}%)\n`;
    });
    return result;
  }

  return `Không hiểu lệnh "${prefix}" cho ${emp.name}. Thử: /emp, /salary, /kpi + tên nhân viên.`;
}

// Handle dept-specific commands
async function handleDeptCommand(deptName: string, state: AgentCoordinationState): Promise<string> {
  const employees = await getEmployees();
  const employeeCareers = await getEmployeeCareers();
  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  const dept = departments.find((d: string) => d.toLowerCase().includes(deptName.toLowerCase()));
  if (!dept) return `Không tìm thấy phòng ban "${deptName}". Các PB: ${departments.join(', ')}`;

  const deptEmps = employees.filter((e: { department: string; status: string }) => e.department === dept && e.status === 'Đang làm việc');
  const deptPlans = state.individualPlans.filter(p => deptEmps.some((e: { id: number }) => String(e.id) === p.employeeId));
  const completed = deptPlans.filter(p => p.status === 'completed').length;
  const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;
  const cost = state.costProjections.find(c => c.department === dept);
  const detail = state.departmentDetails.find(d => d.department === dept);

  let result = `${dept}\n\n`;
  result += `Trưởng phòng: ${detail?.headName || 'N/A'}\n`;
  result += `Nhân sự:      ${deptEmps.length} người\n`;
  result += `KPI TB:       ${detail?.avgKPI || 0}%\n`;
  result += `Chi phí/T:    ${cost ? formatCurrency(cost.totalCost) : 'N/A'} đ\n`;
  result += `Biên LN:      ${detail?.contributionMargin || 0}%\n\n`;
  result += `--- CÔNG VIỆC ---\n`;
  result += `Tổng: ${deptPlans.length} | Xong: ${completed} | Rủi ro: ${atRisk}\n\n`;
  result += `--- NHÂN VIÊN ---\n`;
  deptEmps.forEach((e: { id: number; name: string; role: string }) => {
    const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === e.id);
    result += `${e.name.padEnd(20)} ${(career?.level_code || 'L3').padEnd(4)} ${e.role}\n`;
  });
  return result;
}

// ============ MAIN PROCESSOR ============

/** Run workflow with progressive updates — returns final state */
export async function processWorkflowCommand(
  state: AgentCoordinationState,
  onProgress: (messages: ChatMessage[]) => void,
): Promise<AgentCoordinationState> {
  const wfRun = await runWorkflow(state, onProgress);
  return { ...state, workflowRun: wfRun };
}

export async function processUserChat(input: string, state: AgentCoordinationState): Promise<ChatMessage[]> {
  const trimmed = input.trim();

  // Check for exact commands first
  const cmd = findCommand(trimmed);
  if (cmd) {
    const args = extractArgs(trimmed, cmd);

    // Workflow is handled specially via processWorkflowCommand
    if (cmd.name === '/workflow') {
      return [{ id: genId(), sender: 'ceo', senderName: 'AI CEO', content: 'Đang khởi chạy workflow... Vui lòng chờ.', timestamp: now() }];
    }

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
  if (['kenh', 'channel', 'shopee', 'tiktok', 'website'].some(kw => lower.includes(kw))) {
    return processUserChat('/channels', state);
  }
  if (['quang cao', 'ads', 'roas'].some(kw => lower.includes(kw))) {
    return processUserChat('/ads', state);
  }
  if (['ton kho', 'inventory', 'kho'].some(kw => lower.includes(kw))) {
    return processUserChat('/inventory', state);
  }
  if (['du bao', 'forecast', 'san xuat', 'production'].some(kw => lower.includes(kw))) {
    return processUserChat('/forecast', state);
  }
  if (['bst', 'bo suu tap', 'collection'].some(kw => lower.includes(kw))) {
    return processUserChat('/collections', state);
  }
  if (['ban chay', 'bestseller', 'best seller'].some(kw => lower.includes(kw))) {
    return processUserChat('/bestsellers', state);
  }
  if (['workflow', 'van hanh', 'khoi chay', 'kich hoat'].some(kw => lower.includes(kw))) {
    return processUserChat('/workflow', state);
  }
  if (['de xuat', 'proposals'].some(kw => lower.includes(kw))) {
    return processUserChat('/proposals', state);
  }

  // Default: show overview + help hint
  return [{
    id: genId(),
    sender: 'ceo',
    senderName: 'AI CEO',
    content: `Tôi không hiểu rõ câu hỏi "${trimmed}".\n\nGõ /help để xem danh sách lệnh, hoặc thử:\n- Tên nhân viên (VD: "Hoang Thai Son")\n- Tên phòng ban (VD: "Sales")\n- Từ khóa: doanh thu, chi phí, rủi ro, thưởng, mục tiêu...`,
    timestamp: now(),
  }];
}
