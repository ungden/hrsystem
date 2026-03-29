interface StatusConfig {
  label: string;
  color: string;
  bg: string;
}

interface StatusBadgeProps {
  status: string;
  config?: Record<string, StatusConfig>;
}

const defaultConfig: Record<string, StatusConfig> = {
  da_duyet: {
    label: "Đã duyệt",
    color: "bg-green-500",
    bg: "bg-green-50 text-green-700",
  },
  cho_duyet: {
    label: "Chờ duyệt",
    color: "bg-yellow-500",
    bg: "bg-yellow-50 text-yellow-700",
  },
  da_thanh_toan: {
    label: "Đã thanh toán",
    color: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700",
  },
  dang_lam: {
    label: "Đang làm",
    color: "bg-green-500",
    bg: "bg-green-50 text-green-700",
  },
  nghi_phep: {
    label: "Nghỉ phép",
    color: "bg-orange-500",
    bg: "bg-orange-50 text-orange-700",
  },
  da_nghi: {
    label: "Đã nghỉ",
    color: "bg-red-500",
    bg: "bg-red-50 text-red-700",
  },
  todo: {
    label: "Chờ làm",
    color: "bg-slate-400",
    bg: "bg-slate-100 text-slate-600",
  },
  in_progress: {
    label: "Đang làm",
    color: "bg-blue-500",
    bg: "bg-blue-50 text-blue-700",
  },
  review: {
    label: "Đang review",
    color: "bg-purple-500",
    bg: "bg-purple-50 text-purple-700",
  },
  done: {
    label: "Hoàn thành",
    color: "bg-green-500",
    bg: "bg-green-50 text-green-700",
  },
  du_diem: {
    label: "Đủ điểm",
    color: "bg-green-500",
    bg: "bg-green-50 text-green-700",
  },
  chua_du: {
    label: "Chưa đủ",
    color: "bg-red-500",
    bg: "bg-red-50 text-red-700",
  },
};

export default function StatusBadge({ status, config }: StatusBadgeProps) {
  const mergedConfig = { ...defaultConfig, ...config };
  const statusInfo = mergedConfig[status];

  if (!statusInfo) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusInfo.bg}`}
    >
      <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
      {statusInfo.label}
    </span>
  );
}
