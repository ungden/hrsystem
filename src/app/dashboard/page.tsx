"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Users, UserCheck, CalendarOff, DollarSign, TrendingUp, Award, Layers } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import {
  dashboardStats,
  departmentDistribution,
  recentActivities,
  formatCurrency,
  employees,
  employeeCareers,
  calculatePromotionReadiness,
  getCareerLevel,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="p-6">
      <PageHeader title="Dashboard" subtitle="Tổng quan hệ thống" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Tổng nhân viên"
          value={dashboardStats.totalEmployees}
          color="blue"
        />
        <StatCard
          icon={UserCheck}
          label="Có mặt hôm nay"
          value={dashboardStats.coMatHomNay}
          color="green"
        />
        <StatCard
          icon={CalendarOff}
          label="Đang nghỉ phép"
          value={dashboardStats.nghiPhep}
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Lương chờ duyệt"
          value={dashboardStats.luongChoDuyet}
          color="purple"
        />
      </div>

      {/* Career Quick Stats */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Lộ trình nghề nghiệp</h2>
          <Link href="/nhan-su/career-framework" className="text-xs text-blue-600 hover:text-blue-800 font-medium">
            Xem chi tiết
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            const activeEmps = employees.filter(e => e.trangThai !== "da_nghi");
            const eligible = activeEmps.filter(e => calculatePromotionReadiness(e.id)?.overallReady).length;
            const levelCounts: Record<string, number> = {};
            employeeCareers.forEach(c => { levelCounts[c.levelCode] = (levelCounts[c.levelCode] || 0) + 1; });
            const topLevel = Object.entries(levelCounts).sort((a, b) => b[1] - a[1])[0];

            return (
              <>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-blue-700">{employeeCareers.length}</p>
                  <p className="text-[11px] text-blue-500 mt-0.5">Có lộ trình</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{eligible}</p>
                  <p className="text-[11px] text-green-500 mt-0.5">Đủ ĐK thăng tiến</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-purple-700">{topLevel ? topLevel[0] : "-"}</p>
                  <p className="text-[11px] text-purple-500 mt-0.5">Level phổ biến nhất</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-orange-700">{Object.keys(levelCounts).length}</p>
                  <p className="text-[11px] text-orange-500 mt-0.5">Levels đang dùng</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Phân bổ nhân sự theo phòng ban
          </h2>
          <div className="h-[300px]">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={true}
                  >
                    {departmentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Hoạt động gần đây
          </h2>
          <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-600">
                    {activity.employee.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 leading-snug">
                    {activity.description}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
