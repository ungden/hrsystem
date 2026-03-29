import { Construction } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function NghiPhepPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={Construction}
        title="Nghỉ phép"
        description="Tính năng đang được phát triển"
      />
    </div>
  );
}
