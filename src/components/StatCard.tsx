import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

type ColorVariant = "blue" | "green" | "orange" | "red" | "purple" | "yellow";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: ColorVariant;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
}

const colorMap: Record<
  ColorVariant,
  { border: string; bg: string; text: string; iconBg: string }
> = {
  blue: {
    border: "border-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-600",
    iconBg: "bg-blue-100",
  },
  green: {
    border: "border-green-500",
    bg: "bg-green-50",
    text: "text-green-600",
    iconBg: "bg-green-100",
  },
  orange: {
    border: "border-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-600",
    iconBg: "bg-orange-100",
  },
  red: {
    border: "border-red-500",
    bg: "bg-red-50",
    text: "text-red-600",
    iconBg: "bg-red-100",
  },
  purple: {
    border: "border-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-600",
    iconBg: "bg-purple-100",
  },
  yellow: {
    border: "border-yellow-500",
    bg: "bg-yellow-50",
    text: "text-yellow-600",
    iconBg: "bg-yellow-100",
  },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${colors.border} p-5`}
    >
      <div className="flex items-start justify-between">
        <div className={`${colors.iconBg} rounded-full p-2.5`}>
          <Icon className={`w-5 h-5 ${colors.text}`} />
        </div>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.direction === "up"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
