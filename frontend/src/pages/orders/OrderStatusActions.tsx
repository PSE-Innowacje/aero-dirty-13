/**
 * OrderStatusActions -- status transition buttons for detail mode.
 *
 * Renders Submit (Pilot, status=1), Accept/Reject (Supervisor, status=2),
 * and settlement actions (Pilot, status=4).
 */
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export interface OrderStatusActionsProps {
  status: number;
  isPilot: boolean;
  isSupervisor: boolean;
  hasActualTimes: boolean;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onCompletePartial: () => void;
  onCompleteFull: () => void;
  onNotCompleted: () => void;
  submitPending: boolean;
  acceptPending: boolean;
  rejectPending: boolean;
  completePartialPending: boolean;
  completeFullPending: boolean;
  notCompletedPending: boolean;
}

export function OrderStatusActions({
  status,
  isPilot,
  isSupervisor,
  hasActualTimes,
  onSubmit,
  onAccept,
  onReject,
  onCompletePartial,
  onCompleteFull,
  onNotCompleted,
  submitPending,
  acceptPending,
  rejectPending,
  completePartialPending,
  completeFullPending,
  notCompletedPending,
}: OrderStatusActionsProps) {
  const { t } = useTranslation();
  const showSubmit = isPilot && status === 1;
  const showSupervisorActions = isSupervisor && status === 2;
  const showSettlement = isPilot && status === 4;

  if (!showSubmit && !showSupervisorActions && !showSettlement) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      {showSubmit && (
        <Button onClick={onSubmit} disabled={submitPending}>
          {submitPending ? t('orders.submitting') : t('orders.submitForAcceptance')}
        </Button>
      )}
      {showSupervisorActions && (
        <>
          <Button
            onClick={onAccept}
            disabled={acceptPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {acceptPending ? t('orders.accepting') : t('orders.accept')}
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={rejectPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            {rejectPending ? t('orders.rejecting') : t('orders.reject')}
          </Button>
        </>
      )}
      {showSettlement && (
        <>
          <Button
            onClick={onCompletePartial}
            disabled={completePartialPending || !hasActualTimes}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {completePartialPending
              ? t('orders.processing')
              : t('orders.completePartial')}
          </Button>
          <Button
            onClick={onCompleteFull}
            disabled={completeFullPending || !hasActualTimes}
            className="bg-green-600 hover:bg-green-700"
          >
            {completeFullPending
              ? t('orders.processing')
              : t('orders.completeFull')}
          </Button>
          <Button
            variant="destructive"
            onClick={onNotCompleted}
            disabled={notCompletedPending}
          >
            {notCompletedPending ? t('orders.processing') : t('orders.notCompleted')}
          </Button>
        </>
      )}
    </div>
  );
}
