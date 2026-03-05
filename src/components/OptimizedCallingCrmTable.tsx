/**
 * DEMO: Optimistic UI + Column Reordering Integration
 * 
 * This file demonstrates how both features work together seamlessly.
 */

import React, { useState, useMemo, useCallback } from "react";
import { ReorderableTable, ColumnConfig } from "@/components/EnhancedReorderableTable";
import { useColumnOrder } from "@/hooks/use-preferences";
import { useUpdateCallingCrm } from "@/hooks/use-crm-queries";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CallingCrmRow {
  id: number;
  customer_index: number;
  customername: string;
  customernumber: string;
  leadstatus: string;
  callsummary: string;
  interest: string;
  notes: string;
  calltime: string;
  assistantcalling: number;
}

export function OptimizedCallingCrmTable({ data }: { data: CallingCrmRow[] }) {
  const { toast } = useToast();
  const updateMutation = useUpdateCallingCrm();
  
  // Column order state with persistence
  const [columnOrder, setColumnOrder] = useColumnOrder("calling");
  
  // Editable notes state
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  
  /**
   * FEATURE 1: Column Configuration with Drag-and-Drop
   */
  const baseColumns: ColumnConfig[] = useMemo(() => [
    {
      id: "index",
      label: "#",
      minWidth: "w-[100px]",
      render: (row) => (
        <span className="font-mono text-sm text-muted-foreground font-medium">
          {row.customer_index}
        </span>
      ),
    },
    {
      id: "customername",
      label: "Customer Name",
      minWidth: "min-w-[180px]",
      render: (row) => (
        <div className="truncate max-w-[180px] font-medium" title={row.customername}>
          {row.customername || "—"}
        </div>
      ),
    },
    {
      id: "customernumber",
      label: "Phone Number",
      minWidth: "min-w-[140px]",
      render: (row) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.customernumber || "—"}
        </span>
      ),
    },
    {
      id: "leadstatus",
      label: "Status",
      minWidth: "min-w-[120px]",
      render: (row) => (
        <span
          className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
            row.leadstatus === "completed"
              ? "bg-green-500/10 text-green-500"
              : row.leadstatus === "failed"
              ? "bg-red-500/10 text-red-500"
              : row.leadstatus === "calling"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-gray-500/10 text-gray-500"
          }`}
        >
          {row.leadstatus || "pending"}
        </span>
      ),
    },
    {
      id: "callsummary",
      label: "Call Summary",
      minWidth: "min-w-[200px]",
      render: (row) => (
        <div className="truncate max-w-[200px] text-sm" title={row.callsummary}>
          {row.callsummary || "—"}
        </div>
      ),
    },
    {
      id: "interest",
      label: "Interest",
      minWidth: "min-w-[120px]",
      render: (row) => (
        <span className="text-sm">{row.interest || "—"}</span>
      ),
    },
    {
      id: "notes",
      label: "Notes (Editable)",
      minWidth: "min-w-[250px]",
      render: (row) => {
        const isEditing = editingNotes.hasOwnProperty(row.id);
        const currentNotes = isEditing ? editingNotes[row.id] : row.notes || "";
        
        return (
          <div>
            {isEditing ? (
              // EDITING MODE: Inline input with save/cancel
              <div className="flex items-center gap-2">
                <Input
                  value={currentNotes}
                  onChange={(e) =>
                    setEditingNotes((prev) => ({
                      ...prev,
                      [row.id]: e.target.value,
                    }))
                  }
                  className="h-8 text-sm"
                  placeholder="Add notes..."
                  autoFocus
                />
                <Button
                  size="sm"
                  onClick={() => saveNotesOptimistic(row.id, currentNotes)}
                  disabled={updateMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setEditingNotes((prev) => {
                      const next = { ...prev };
                      delete next[row.id];
                      return next;
                    })
                  }
                >
                  Cancel
                </Button>
              </div>
            ) : (
              // VIEW MODE: Click to edit
              <div
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 transition-colors"
                onClick={() =>
                  setEditingNotes((prev) => ({
                    ...prev,
                    [row.id]: row.notes || "",
                  }))
                }
              >
                <span
                  className="truncate max-w-[200px] text-sm"
                  title={row.notes || "Click to edit"}
                >
                  {row.notes || "—"}
                </span>
                <span className="text-xs text-muted-foreground">✎</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "calltime",
      label: "Call Time",
      minWidth: "min-w-[140px]",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.calltime ? new Date(row.calltime).toLocaleString() : "—"}
        </span>
      ),
    },
    {
      id: "assistantcalling",
      label: "Assistant",
      minWidth: "min-w-[100px]",
      render: (row) => (
        <span className="text-sm">{row.assistantcalling || "—"}</span>
      ),
    },
  ], [editingNotes]);
  
  /**
   * Apply saved column order
   */
  const orderedColumns = useMemo(() => {
    if (!columnOrder || columnOrder.length === 0) return baseColumns;
    
    const columnMap = new Map(baseColumns.map((c) => [c.id, c]));
    const reordered = columnOrder
      .map((id) => columnMap.get(id))
      .filter((c): c is ColumnConfig => c !== undefined);
    
    // Add any new columns not in saved order
    const existingIds = new Set(columnOrder);
    const newColumns = baseColumns.filter((c) => !existingIds.has(c.id));
    
    return [...reordered, ...newColumns];
  }, [baseColumns, columnOrder]);
  
  /**
   * FEATURE 2: Optimistic Update for Notes
   * 
   * Workflow:
   * 1. UI updates INSTANTLY (optimistic)
   * 2. Background API call
   * 3. On error: Automatic rollback + toast
   * 4. On success: Server sync + toast
   */
  const saveNotesOptimistic = useCallback(
    async (callingId: number, notes: string) => {
      try {
        // Mutation handles optimistic update automatically via onMutate
        await updateMutation.mutateAsync({ callingId, payload: { notes } });
        
        // Success: Clear editing state
        setEditingNotes((prev) => {
          const next = { ...prev };
          delete next[callingId];
          return next;
        });
        
        // Success toast
        toast({
          title: "✓ Saved",
          description: "Notes updated successfully",
          duration: 2000,
        });
      } catch (e: any) {
        // Error: Mutation already rolled back via onError
        // User sees previous value restored automatically
        toast({
          variant: "destructive",
          title: "✗ Failed to save notes",
          description: e?.message || "Please try again",
          duration: 4000,
        });
      }
    },
    [updateMutation, toast]
  );
  
  /**
   * Handle column reorder
   * CRITICAL: Does NOT trigger data refetch
   */
  const handleColumnReorder = useCallback(
    async (newColumns: ColumnConfig[]) => {
      await setColumnOrder(newColumns.map((c) => c.id));
      
      toast({
        title: "Column order saved",
        description: "Your layout has been persisted",
        duration: 2000,
      });
    },
    [setColumnOrder, toast]
  );
  
  return (
    <div className="space-y-4">
      {/* Feature indicator */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-sm font-medium">Column DnD Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-green-500">✓</span>
          <span className="text-sm font-medium">Optimistic Updates Active</span>
        </div>
      </div>
      
      {/* Reorderable table with optimistic updates */}
      <ReorderableTable
        columns={orderedColumns}
        data={data}
        rowKey="id"
        onColumnOrderChange={handleColumnReorder}
        emptyMessage="No calling activity yet"
        className="w-full"
      />
      
      {/* Performance notes */}
      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
        <p className="text-sm font-medium text-blue-500 mb-2">Performance Tips:</p>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Drag columns by the grip handle (⋮⋮) - text selection works normally</li>
          <li>• Notes save instantly with optimistic UI - no waiting for server</li>
          <li>• Only changed rows re-render - 100+ row tables stay smooth</li>
          <li>• Column order persists in database + localStorage fallback</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * USAGE EXAMPLE:
 * 
 * import { OptimizedCallingCrmTable } from "./OptimizedCallingCrmTable";
 * import { useCallingCrm } from "@/hooks/use-crm-queries";
 * 
 * function CallingCrmPage() {
 *   const { data } = useCallingCrm({ limit: 50, offset: 0 });
 *   
 *   return (
 *     <OptimizedCallingCrmTable data={data?.calling || []} />
 *   );
 * }
 */
