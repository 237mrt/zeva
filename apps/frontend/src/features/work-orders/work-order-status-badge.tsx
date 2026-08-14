import type { WorkOrderStatus } from './work-order.types';
import { workOrderStatusLabels } from './work-order.types';

const statusStyles: Record<WorkOrderStatus, string> = {
  WAITING: 'border-[#5a5038] bg-[#282319] text-[#dfc17d]',
  IN_PROGRESS: 'border-[#365166] bg-[#192530] text-[#91bddf]',
  READY: 'border-[#3d5946] bg-[#1c2a20] text-[#9bcea9]',
  DELIVERED: 'border-[#4b4965] bg-[#232231] text-[#b4afe0]',
  CLOSED: 'border-[#454c47] bg-[#222724] text-[#b6beb8]',
  CANCELLED: 'border-[#603f3f] bg-[#2b1d1d] text-[#e4a0a0]',
};

export function WorkOrderStatusBadge({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`inline-flex w-fit shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles[status]}`}>
      {workOrderStatusLabels[status]}
    </span>
  );
}
