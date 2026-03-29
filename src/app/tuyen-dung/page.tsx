import { Construction } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function TuyenDungPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={Construction}
        title="Tuyển dụng"
        description="Tính năng đang được phát triển"
      />
    </div>
  );
}
