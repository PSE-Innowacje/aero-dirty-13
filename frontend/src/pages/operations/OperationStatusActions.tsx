/**
 * OperationStatusActions — status transition buttons for detail mode.
 *
 * Renders Confirm/Reject (Supervisor, status=1) and Resign (Planner, status 1/3/4).
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, LogOut } from "lucide-react";
import { OPERATION_STATUS } from "@/lib/constants";

export interface OperationStatusActionsProps {
  status: number;
  isSupervisor: boolean;
  isPlanner: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onResign: () => void;
  rejectPending: boolean;
  resignPending: boolean;
}

export function OperationStatusActions({
  status,
  isSupervisor,
  isPlanner,
  onConfirm,
  onReject,
  onResign,
  rejectPending,
  resignPending,
}: OperationStatusActionsProps) {
  const { t } = useTranslation();
  const showSupervisorActions = isSupervisor && status === OPERATION_STATUS.INTRODUCED;
  const showResign =
    isPlanner &&
    ([OPERATION_STATUS.INTRODUCED, OPERATION_STATUS.CONFIRMED, OPERATION_STATUS.ORDERED] as number[]).includes(status);

  if (!showSupervisorActions && !showResign) return null;

  return (
    <div className="mb-6 flex gap-3">
      {showSupervisorActions && (
        <>
          <Button onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            {t('operations.confirm')}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={rejectPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {rejectPending ? t('operations.rejecting') : t('operations.reject')}
          </Button>
        </>
      )}
      {showResign && (
        <Button
          variant="outline"
          onClick={onResign}
          disabled={resignPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {resignPending ? t('operations.resigning') : t('operations.resign')}
        </Button>
      )}
    </div>
  );
}
