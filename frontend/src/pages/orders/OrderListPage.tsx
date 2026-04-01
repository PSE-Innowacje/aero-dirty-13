/**
 * OrderListPage — list flight orders with status filter and RBAC actions.
 * Default filter: status=2 (Przekazane do akceptacji) per PRD 6.6.g.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import {
  ORDER_STATUS_KEYS,
  ORDER_STATUS_BADGE_VARIANT,
  ORDER_STATUS_BADGE_CLASS,
  SYSTEM_ROLE,
} from "@/lib/constants";

interface OrderListItem {
  id: number;
  planned_start_datetime: string;
  helicopter_registration: string;
  pilot_name: string;
  status: number;
}

export function OrderListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  // Default filter: status=2 per PRD 6.6.g
  const [statusFilter, setStatusFilter] = useState<string>("2");

  const canCreate = user?.system_role === SYSTEM_ROLE.PILOT;

  const queryParams =
    statusFilter === "" ? "" : `?order_status=${statusFilter}`;

  const {
    data: orders = [],
    isLoading,
    error,
  } = useQuery<OrderListItem[]>({
    queryKey: ["orders", statusFilter],
    queryFn: () => apiFetch<OrderListItem[]>(`/orders${queryParams}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{t('orders.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive-foreground">
          {t('orders.loadingError')}:{" "}
          {error instanceof Error ? error.message : t('orders.unknownError')}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('orders.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('orders.subtitle')}
          </p>
        </div>
        {canCreate && (
          <Link to="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('orders.addOrder')}
            </Button>
          </Link>
        )}
      </div>

      {/* Status filter */}
      <div className="mb-4 flex items-center gap-3">
        <label className="text-sm font-medium text-foreground">
          {t('orders.filterByStatus')}
        </label>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-56"
        >
          <option value="">{t('orders.allStatuses')}</option>
          {ORDER_STATUS_KEYS.map((val) => (
            <option key={val} value={val}>
              {t(`orders.status${val}`)}
            </option>
          ))}
        </Select>
      </div>

      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('orders.id')}</TableHead>
              <TableHead>{t('orders.plannedStart')}</TableHead>
              <TableHead>{t('orders.helicopter')}</TableHead>
              <TableHead>{t('orders.pilot')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {t('orders.noOrders')}
                </TableCell>
              </TableRow>
            ) : (
              [...orders]
                .sort((a, b) => a.planned_start_datetime.localeCompare(b.planned_start_datetime))
                .map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    {new Date(order.planned_start_datetime).toLocaleString(
                      "pl-PL"
                    )}
                  </TableCell>
                  <TableCell>{order.helicopter_registration}</TableCell>
                  <TableCell>{order.pilot_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ORDER_STATUS_BADGE_VARIANT[order.status] ?? "secondary"
                      }
                      className={ORDER_STATUS_BADGE_CLASS[order.status] ?? ""}
                    >
                      {t(`orders.status${order.status}`, { defaultValue: `Status ${order.status}` })}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
