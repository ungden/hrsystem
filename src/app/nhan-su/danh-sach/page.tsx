"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { employees, Employee, getCareerLevel } from "@/lib/mock-data";

type EmployeeRow = Employee & Record<string, unknown>;

const columns = [
  {
    key: "name",
    label: "Nhân viên",
    render: (row: EmployeeRow) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-blue-600">
            {row.name.charAt(0)}
          </span>
        </div>
        <div>
          <Link href={`/nhan-su/career/${row.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline">
            {row.name}
          </Link>
          <p className="text-xs text-slate-400">{row.phongBan}</p>
        </div>
      </div>
    ),
  },
  {
    key: "maSo",
    label: "Mã số",
  },
  {
    key: "chucVu",
    label: "Chức vụ",
  },
  {
    key: "levelCode",
    label: "Cấp bậc",
    render: (row: EmployeeRow) => {
      const level = row.levelCode ? getCareerLevel(row.levelCode as string) : null;
      if (!level) return <span className="text-xs text-slate-400">-</span>;
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
          {level.code}
        </span>
      );
    },
  },
  {
    key: "email",
    label: "Email",
  },
  {
    key: "ngayVaoLam",
    label: "Ngày vào làm",
  },
  {
    key: "trangThai",
    label: "Trạng thái",
    render: (row: EmployeeRow) => <StatusBadge status={row.trangThai} />,
  },
];

export default function DanhSachNhanVienPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Danh sách nhân viên"
        breadcrumbs={[
          { label: "Nhân sự" },
          { label: "Danh sách nhân viên" },
        ]}
      />

      <DataTable
        columns={columns}
        data={employees as EmployeeRow[]}
        searchable
        searchPlaceholder="Tìm nhân viên..."
        searchKey={(item, query) =>
          (item.name as string).toLowerCase().includes(query) ||
          (item.email as string).toLowerCase().includes(query)
        }
        pageSize={10}
      />
    </div>
  );
}
