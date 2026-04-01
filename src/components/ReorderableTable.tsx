import React, { useMemo, useState, useCallback } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export interface ColumnConfig {
  id: string;
  label: string;
  minWidth?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DraggableHeaderProps {
  column: ColumnConfig;
  className?: string;
}

// Memoized header cell to prevent re-renders
const DraggableHeader = ({ column, className }: DraggableHeaderProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`${className || ""} ${isDragging ? "z-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <span>{column.label}</span>
      </div>
    </th>
  );
};

interface ReorderableTableProps {
  columns: ColumnConfig[];
  data: any[];
  onColumnOrderChange: (newOrder: ColumnConfig[]) => void;
  rowKey: string;
  className?: string;
  fixedColumns?: string[]; // IDs of columns that should not be reorderable
}

export function ReorderableTable({
  columns,
  data,
  onColumnOrderChange,
  rowKey,
  className = "",
  fixedColumns = [],
}: ReorderableTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Separate fixed and draggable columns
  const { fixedCols, draggableCols } = useMemo(() => {
    const fixed = columns.filter(col => fixedColumns.includes(col.id));
    const draggable = columns.filter(col => !fixedColumns.includes(col.id));
    return { fixedCols: fixed, draggableCols: draggable };
  }, [columns, fixedColumns]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = draggableCols.findIndex(col => col.id === active.id);
      const newIndex = draggableCols.findIndex(col => col.id === over.id);
      
      const newDraggableOrder = arrayMove(draggableCols, oldIndex, newIndex);
      const newFullOrder = [...fixedCols, ...newDraggableOrder];
      
      onColumnOrderChange(newFullOrder);
    }
  }, [draggableCols, fixedCols, onColumnOrderChange]);

  // Memoize column IDs for DnD
  const columnIds = useMemo(() => draggableCols.map(col => col.id), [draggableCols]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <table className={className}>
        <thead className="sticky top-0 z-10 bg-card border-b-2 border-border">
          <tr className="hover:bg-transparent">
            {/* Fixed columns */}
            {fixedCols.map(column => (
              <th key={column.id} className={`px-4 py-3 font-semibold ${column.minWidth || ""}`}>
                {column.label}
              </th>
            ))}
            
            {/* Draggable columns */}
            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
              {draggableCols.map(column => (
                <DraggableHeader
                  key={column.id}
                  column={column}
                  className={`px-4 py-3 font-semibold ${column.minWidth || ""}`}
                />
              ))}
            </SortableContext>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <MemoizedTableRow
              key={row[rowKey]}
              row={row}
              columns={columns}
            />
          ))}
        </tbody>
      </table>
    </DndContext>
  );
}

// Memoized row component to prevent unnecessary re-renders
interface TableRowProps {
  row: any;
  columns: ColumnConfig[];
}

const TableRow = ({ row, columns }: TableRowProps) => {
  return (
    <tr className="border-border hover:bg-muted/50 transition-colors">
      {columns.map(column => (
        <td key={column.id} className="px-4 py-3 text-sm">
          {column.render ? column.render(row[column.id], row) : (row[column.id] || "—")}
        </td>
      ))}
    </tr>
  );
};

// Memoize row to prevent re-renders when dragging columns
const MemoizedTableRow = React.memo(TableRow, (prev, next) => {
  // Only re-render if row data actually changed
  return prev.row === next.row && prev.columns === next.columns;
});

export default ReorderableTable;
