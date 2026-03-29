import { Construction } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function ReportsPage() {
  return (
    <div className="p-6">
      <EmptyState
        icon={Construction}
        title="Reports"
        description="Tính năng đang được phát triển"
      />
    </div>
  );
}
