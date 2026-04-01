import React, { useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ColumnConfig {
  id: string;
  label: string;
  minWidth?: string;
  render?: (row: any) => React.ReactNode;
  editable?: boolean;
}

interface ReorderableTableProps {
  columns: ColumnConfig[];
  data: any[];
  rowKey: string;
  onColumnOrderChange?: (newColumns: ColumnConfig[]) => void;
  fixedColumns?: string[]; // Column IDs that cannot be reordered (e.g., checkbox)
  className?: string;
  emptyMessage?: string;
}

/**
 * Sortable header component with scoped drag handle
 * CRITICAL: Drag handle is isolated to prevent text selection conflicts
 */
const SortableHeader: React.FC<{
  column: ColumnConfig;
  isFixed: boolean;
}> = React.memo(({ column, isFixed }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    disabled: isFixed,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`${column.minWidth || "min-w-[150px]"} relative group`}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle - scoped to prevent text selection conflicts */}
        {!isFixed && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity touch-none p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label={`Drag to reorder ${column.label}`}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <span className={isFixed ? "ml-2" : ""}>{column.label}</span>
      </div>
    </TableHead>
  );
});

SortableHeader.displayName = "SortableHeader";

/**
 * Memoized row component to prevent unnecessary re-renders
 * CRITICAL: Custom comparison function ensures only changed rows re-render
 */
const MemoizedTableRow: React.FC<{
  row: any;
  columns: ColumnConfig[];
  rowKey: string;
}> = React.memo(
  ({ row, columns, rowKey }) => {
    return (
      <TableRow key={row[rowKey]}>
        {columns.map((col) => (
          <TableCell key={`${row[rowKey]}-${col.id}`} className={col.minWidth}>
            {col.render ? col.render(row) : row[col.id]}
          </TableCell>
        ))}
      </TableRow>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if data actually changed
    const prevRow = prevProps.row;
    const nextRow = nextProps.row;
    
    if (prevRow[prevProps.rowKey] !== nextRow[nextProps.rowKey]) {
      return false; // Different row ID, must re-render
    }
    
    // CRITICAL: Check if column ORDER changed
    if (prevProps.columns.length !== nextProps.columns.length) {
      return false; // Column count changed, must re-render
    }
    
    // Check if column IDs are in different order
    for (let i = 0; i < prevProps.columns.length; i++) {
      if (prevProps.columns[i].id !== nextProps.columns[i].id) {
        return false; // Column order changed, must re-render
      }
    }
    
    // CRITICAL: Check if columns array reference changed
    // This ensures editable fields re-render when state changes
    if (prevProps.columns !== nextProps.columns) {
      return false; // Column configuration changed, must re-render
    }
    
    // Check if any column values changed
    for (const col of prevProps.columns) {
      if (prevRow[col.id] !== nextRow[col.id]) {
        return false; // Value changed, must re-render
      }
    }
    
    return true; // No changes, skip re-render
  }
);

MemoizedTableRow.displayName = "MemoizedTableRow";

/**
 * ReorderableTable - High-performance table with column DnD
 * 
 * KEY FEATURES:
 * 1. Scoped drag handles prevent text selection conflicts
 * 2. Column reordering does NOT trigger data refetch
 * 3. Memoized rows prevent unnecessary re-renders
 * 4. Fixed columns (like checkbox) stay in place
 * 5. 8px activation distance prevents accidental drags
 */
export const ReorderableTable: React.FC<ReorderableTableProps> = ({
  columns,
  data,
  rowKey,
  onColumnOrderChange,
  fixedColumns = [],
  className = "",
  emptyMessage = "No data available",
}) => {
  // Configure sensors with activation constraints to prevent conflicts
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize column IDs for SortableContext
  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  /**
   * Handle drag end WITHOUT triggering data refetch
   * CRITICAL: This only updates column order state, not data queries
   */
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return; // No change
      }

      const oldIndex = columns.findIndex((c) => c.id === active.id);
      const newIndex = columns.findIndex((c) => c.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Reorder columns using arrayMove
      const reorderedColumns = arrayMove(columns, oldIndex, newIndex);

      // Persist the new order (does NOT trigger data refetch)
      onColumnOrderChange?.(reorderedColumns);
    },
    [columns, onColumnOrderChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className={`rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              <SortableContext
                items={columnIds}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((col) => (
                  <SortableHeader
                    key={col.id}
                    column={col}
                    isFixed={fixedColumns.includes(col.id)}
                  />
                ))}
              </SortableContext>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <MemoizedTableRow
                  key={row[rowKey]}
                  row={row}
                  columns={columns}
                  rowKey={rowKey}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </DndContext>
  );
};

ReorderableTable.displayName = "ReorderableTable";
