/**
 * DataTable — Reusable list-page component that consolidates the common pattern
 * shared across UserListPage, HelicopterListPage, CrewListPage, LandingSiteListPage:
 *   1. Loading state (centered muted text)
 *   2. Error state (destructive/10 box)
 *   3. Page header (h1 title + p subtitle + optional add button)
 *   4. Table wrapper with configurable columns
 *   5. Empty state (centered row spanning all columns)
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  title: string;
  subtitle: string;
  columns: DataTableColumn<T>[];
  data: T[] | undefined;
  isLoading: boolean;
  error: Error | null;
  loadingMessage: string;
  errorMessage: string;
  emptyMessage: string;
  addButton?: {
    href: string;
    label: string;
  };
  rowKey: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  actionsHeader?: string;
  filter?: React.ReactNode;
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  isLoading,
  error,
  loadingMessage,
  errorMessage,
  emptyMessage,
  addButton,
  rowKey,
  onRowClick,
  actions,
  actionsHeader,
  filter,
}: DataTableProps<T>) {
  const errorText = error
    ? `${errorMessage}: ${error.message}`
    : "";
  /* ---------- Loading state ---------- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{loadingMessage}</p>
      </div>
    );
  }

  /* ---------- Error state ---------- */
  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4">
        <p className="text-sm text-destructive-foreground">
          {errorText}
        </p>
      </div>
    );
  }

  const items = data ?? [];
  const totalColumns = columns.length + (actions ? 1 : 0);

  return (
    <div>
      {/* ---------- Page header ---------- */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {addButton && (
          <Link to={addButton.href}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {addButton.label}
            </Button>
          </Link>
        )}
      </div>

      {/* ---------- Optional filter slot ---------- */}
      {filter && <div className="mb-4">{filter}</div>}

      {/* ---------- Table ---------- */}
      <div className="rounded-md bg-surface-container-low">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {actions && (
                <TableHead className="text-right">
                  {actionsHeader ?? ""}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="text-center text-muted-foreground py-8"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={rowKey(item)}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render(item)}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell className="text-right">
                      {actions(item)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
