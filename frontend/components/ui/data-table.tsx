'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type RowSelectionState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Download,
  Search,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

// ─── Types ──────────────────────────────────────────────────────────
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enableExport?: boolean;
  onRowClick?: (row: TData) => void;
  onSelectionChange?: (rows: TData[]) => void;
  bulkActions?: React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  serverSidePagination?: {
    pageCount: number;
    page: number;
    onPageChange: (page: number) => void;
  };
}

// ─── Sort Header ────────────────────────────────────────────────────
export function SortableHeader({ column, children }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void }; children: React.ReactNode }): React.ReactElement {
  const sorted = column.getIsSorted();
  return (
    <button
      className="flex items-center gap-1.5 hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors -ml-1 px-1 py-0.5 rounded"
      onClick={() => column.toggleSorting(sorted === 'asc')}
    >
      {children}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

// ─── Skeleton Rows ──────────────────────────────────────────────────
function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }): React.ReactElement {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border-default)] dark:border-[var(--border-default)]">
          {Array.from({ length: columns }).map((__, j) => (
            <td key={j} className="px-4 py-3.5">
              <div className="h-4 bg-[var(--border-default)] dark:bg-[var(--surface-hover)] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main DataTable ─────────────────────────────────────────────────
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Cerca...',
  pageSize = 20,
  enableRowSelection = false,
  enableColumnVisibility = false,
  enableExport = false,
  onRowClick,
  onSelectionChange,
  bulkActions,
  isLoading = false,
  emptyMessage = 'Nessun risultato',
  emptyDescription = 'Non ci sono dati da visualizzare.',
  serverSidePagination,
}: DataTableProps<TData, TValue>): React.ReactElement {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize });
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [showColumnMenu, setShowColumnMenu] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: serverSidePagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
      globalFilter,
    },
    ...(serverSidePagination && {
      pageCount: serverSidePagination.pageCount,
      manualPagination: true,
    }),
  });

  // Notify parent about selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  const selectedCount = Object.keys(rowSelection).length;

  // Export to CSV
  const handleExport = React.useCallback((): void => {
    const headers = table.getVisibleFlatColumns()
      .filter((c) => c.id !== 'select' && c.id !== 'actions')
      .map((c) => typeof c.columnDef.header === 'string' ? c.columnDef.header : c.id);

    const rows = table.getFilteredRowModel().rows.map((row) =>
      table.getVisibleFlatColumns()
        .filter((c) => c.id !== 'select' && c.id !== 'actions')
        .map((c) => {
          const value = row.getValue(c.id);
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value ?? '');
        })
    );

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [table]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {/* Search */}
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] text-[var(--text-primary)] dark:text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] transition-all"
            />
            {(table.getColumn(searchKey)?.getFilterValue() as string) && (
              <button
                onClick={() => table.getColumn(searchKey)?.setFilterValue('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--surface-hover)] dark:hover:bg-[var(--surface-hover)]"
              >
                <X className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* Column Visibility */}
          {enableColumnVisibility && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColumnMenu(!showColumnMenu)}
                className="gap-1.5"
              >
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline">Colonne</span>
              </Button>
              {showColumnMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowColumnMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)] border border-[var(--border-default)] dark:border-[var(--border-default)] rounded-lg shadow-lg py-1">
                    {table.getAllColumns()
                      .filter((c) => c.getCanHide() && c.id !== 'select' && c.id !== 'actions')
                      .map((column) => (
                        <label
                          key={column.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={column.getIsVisible()}
                            onChange={column.getToggleVisibilityHandler()}
                            className="rounded border-[var(--border-default)] dark:border-[var(--border-default)]"
                          />
                          <span className="text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                            {typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}
                          </span>
                        </label>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export */}
          {enableExport && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Esporta</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--brand)]/5 dark:bg-[var(--brand)]/10/30 border border-[var(--brand)]/20 dark:border-[var(--status-info)] rounded-lg">
          <span className="text-sm font-medium text-[var(--brand)] dark:text-[var(--brand)]">
            {selectedCount} selezionat{selectedCount === 1 ? 'o' : 'i'}
          </span>
          <div className="h-4 w-px bg-[var(--status-info)]/20 dark:bg-[var(--status-info)]" />
          {bulkActions}
          <button
            onClick={() => table.toggleAllRowsSelected(false)}
            className="ml-auto text-sm text-[var(--brand)] dark:text-[var(--brand)] hover:underline"
          >
            Deseleziona tutto
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] dark:border-[var(--border-default)] overflow-hidden bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-[var(--border-default)] dark:border-[var(--border-default)] bg-[var(--surface-secondary)] dark:bg-[var(--surface-primary)]/50">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]"
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows columns={columns.length} />
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface-hover)] dark:bg-[var(--surface-elevated)] flex items-center justify-center">
                        <Search className="h-5 w-5 text-[var(--text-tertiary)]" />
                      </div>
                      <p className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">{emptyMessage}</p>
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'border-b border-[var(--border-default)] dark:border-[var(--border-default)]/50 transition-colors',
                      row.getIsSelected()
                        ? 'bg-[var(--brand)]/5/50 dark:bg-[var(--brand)]/10/20'
                        : 'hover:bg-[var(--surface-secondary)] dark:hover:bg-[var(--surface-hover)]/50',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {(table.getPageCount() > 1 || serverSidePagination) && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-tertiary)]">
            {enableRowSelection && selectedCount > 0 ? (
              <>{selectedCount} di {table.getFilteredRowModel().rows.length} selezionat{selectedCount === 1 ? 'o' : 'i'}</>
            ) : (
              <>
                Pagina {table.getState().pagination.pageIndex + 1} di {table.getPageCount()} ({table.getFilteredRowModel().rows.length} risultati)
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                table.setPageIndex(0);
                serverSidePagination?.onPageChange(1);
              }}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                table.previousPage();
                serverSidePagination?.onPageChange(table.getState().pagination.pageIndex);
              }}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                table.nextPage();
                serverSidePagination?.onPageChange(table.getState().pagination.pageIndex + 2);
              }}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => {
                table.setPageIndex(table.getPageCount() - 1);
                serverSidePagination?.onPageChange(table.getPageCount());
              }}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
