"use client";

import { useState, useEffect } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, ArrowRight, Brain, LayoutDashboard, Users, Sparkles } from 'lucide-react';

const STEPS = [
  {
    icon: <Brain size={40} className="text-white" />,
    gradient: 'from-indigo-500 to-violet-600',
    title: 'Chào mừng đến Teeworld!',
    body: '11 AI Agents đang làm việc cho bạn 24/7 — phân tích doanh thu, theo dõi KPI nhân viên, quản lý tồn kho, và dự báo chiến lược. Bạn chỉ cần xem kết quả và ra quyết định.',
  },
  {
    icon: <LayoutDashboard size={40} className="text-white" />,
    gradient: 'from-emerald-500 to-teal-600',
    title: 'Mỗi sáng, bắt đầu ở đây',
    body: 'Trang chính hiển thị "Việc cần làm hôm nay" — những vấn đề cần bạn xử lý ngay. Bên dưới là tóm tắt từ AI. Không cần lướt qua hàng chục biểu đồ.',
  },
  {
    icon: <LayoutDashboard size={40} className="text-white" />,
    gradient: 'from-violet-500 to-purple-600',
    title: 'Menu bên trái = lịch trình của bạn',
    body: '5 mục chính trên menu: Tổng quan, Đội ngũ, Duyệt báo cáo, Kinh doanh, Hỏi AI. Mục "Thêm" chứa tất cả các trang nâng cao khi cần.',
  },
  {
    icon: <Users size={40} className="text-white" />,
    gradient: 'from-amber-500 to-orange-600',
    title: 'Nhân viên tự biết phải làm gì',
    body: 'AI tạo task cho từng nhân viên mỗi sáng — target dựa trên dữ liệu thực tế. Nhân viên xem task, làm việc, và nộp báo cáo cuối ngày. Bạn chỉ cần duyệt.',
  },
];

function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in-up">
        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${current.gradient} p-8 pb-10 text-center`}>
          <div className="mb-4 flex justify-center drop-shadow-lg">{current.icon}</div>
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
        </div>

        {/* Body */}
        <div className="px-8 pt-6 pb-2 text-center">
          <p className="text-sm text-slate-600 leading-relaxed">{current.body}</p>
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8 pt-4">
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? `w-8 bg-gradient-to-r ${current.gradient}` : i < step ? 'w-4 bg-indigo-200' : 'w-4 bg-slate-200'
              }`} />
            ))}
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
                Quay lại
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} className="flex-1 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2">
                Tiếp theo <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={onComplete} className="flex-1 py-3 text-sm font-bold text-white rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2">
                <Sparkles size={16} /> Bắt đầu sử dụng!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const DAILY_STEPS = [
  { text: 'Xem "Việc cần làm" và xử lý các vấn đề cần chú ý', time: 'Sáng' },
  { text: 'Đọc tóm tắt AI — nắm tình hình doanh nghiệp', time: 'Sáng' },
  { text: 'Duyệt báo cáo hàng ngày từ nhân viên', time: 'Chiều' },
  { text: 'Chat với AI nếu cần tư vấn chiến lược', time: 'Khi cần' },
];

function DailyGuidePanel() {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ceo_guide_collapsed');
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('ceo_guide_collapsed', String(next));
  }

  return (
    <div className="rounded-2xl border border-indigo-200/60 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-indigo-50/50 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
            <Lightbulb size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-indigo-800">Quy trình hôm nay</span>
        </div>
        {collapsed ? <ChevronDown size={16} className="text-indigo-300" /> : <ChevronUp size={16} className="text-indigo-300" />}
      </button>
      {!collapsed && (
        <div className="px-5 pb-4 pt-0">
          <ol className="space-y-2.5">
            {DAILY_STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5 shadow-sm shadow-indigo-500/20">{i + 1}</span>
                <div>
                  <span className="text-sm text-slate-700">{s.text}</span>
                  <span className="text-xs text-indigo-400 ml-2 font-medium">({s.time})</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function CEOGuide() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('ceo_onboarded')) {
      setShowOnboarding(true);
    }
  }, []);

  function handleOnboardingComplete() {
    localStorage.setItem('ceo_onboarded', 'true');
    setShowOnboarding(false);
  }

  return (
    <>
      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} />}
      <DailyGuidePanel />
    </>
  );
}
