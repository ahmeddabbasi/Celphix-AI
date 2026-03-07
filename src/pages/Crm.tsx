import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Trash2, Upload, Database, Phone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBulkDeleteCrmLeads,
  useCrmLeads,
  useCallingCrm,
  useUpdateCallingCrm,
} from "@/hooks/use-crm-queries";
import { parseCsv } from "@/lib/csv";
import { api } from "@/lib/api";
import { ColumnMapper } from "@/components/ColumnMapper";
import { ReorderableTable, ColumnConfig } from "@/components/EnhancedReorderableTable";
import { useColumnOrder } from "@/hooks/use-preferences";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function Crm() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  
  // View mode toggle
  const [viewMode, setViewMode] = useState<"dashboard" | "calling">("dashboard");
  
  // Editable notes state for calling CRM
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  
  // Column order state with persistence
  const [callingColumnOrder, setCallingColumnOrder] = useColumnOrder("calling");

  type ImportStep = "idle" | "mapping" | "importing";
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  
  // Simple mapping state: array of {source_field, target_field}
  const [columnMappings, setColumnMappings] = useState<Array<{source_field: string, target_field: string | null}>>([]);
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);

  // Debounce search to avoid firing a request per keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = qInput.trim();
      setQ(next ? next : null);
      setOffset(0);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const leadsQ = useCrmLeads({ limit, offset, q });
  const callingQ = useCallingCrm({ limit, offset, q });
  const bulkDeleteM = useBulkDeleteCrmLeads();
  const updateCallingM = useUpdateCallingCrm();

  const leads = leadsQ.data?.leads ?? [];
  const calling = callingQ.data?.calling ?? [];
  const loading = viewMode === "dashboard" ? leadsQ.isPending : callingQ.isPending;
  const isRefreshing = viewMode === "dashboard" 
    ? (leadsQ.isFetching && !leadsQ.isPending)
    : (callingQ.isFetching && !callingQ.isPending);
  const error = viewMode === "dashboard" 
    ? ((leadsQ.error as any)?.message ?? null)
    : ((callingQ.error as any)?.message ?? null);

  // Prefetch next page when we have a full page.
  useEffect(() => {
    if (viewMode === "dashboard" && leadsQ.data && leads.length >= limit) {
      const nextOffset = offset + limit;
      qc.prefetchQuery({
        queryKey: ["crm", "leads", { limit, offset: nextOffset, q }],
        queryFn: () => api.crm.listLeads({ limit, offset: nextOffset, q }),
        staleTime: 60_000,
      });
    } else if (viewMode === "calling" && callingQ.data && calling.length >= limit) {
      const nextOffset = offset + limit;
      qc.prefetchQuery({
        queryKey: ["crm", "calling", { limit, offset: nextOffset, q }],
        queryFn: () => api.crm.listCalling({ limit, offset: nextOffset, q }),
        staleTime: 60_000,
      });
    }
  }, [qc, viewMode, leadsQ.data, callingQ.data, leads.length, calling.length, limit, offset, q]);

  const dynamicKeys = useMemo(() => {
    // Only show dynamic columns in dashboard view
    if (viewMode !== "dashboard") return [];
    
    const s = new Set<string>();
    for (const l of leads) {
      const data = (l as any)?.data as Record<string, any> | null | undefined;
      if (!data) continue;
      for (const k of Object.keys(data)) s.add(k);
    }
    // Sort and return all dynamic columns
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [viewMode, leads]);
  
  // Column configurations for calling CRM with drag-and-drop
  const baseCallingColumns: ColumnConfig[] = useMemo(() => [
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
        <div className="truncate max-w-[180px] font-medium" title={row.customername || "—"}>
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
              ? "bg-primary/10 text-primary"
              : row.leadstatus === "failed"
              ? "bg-destructive/10 text-destructive"
              : row.leadstatus === "calling"
              ? "bg-accent/10 text-accent-foreground"
              : "bg-muted text-muted-foreground"
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
        <div className="truncate max-w-[200px] text-sm" title={row.callsummary || "—"}>
          {row.callsummary || "—"}
        </div>
      ),
    },
    {
      id: "interest",
      label: "Interest",
      minWidth: "min-w-[120px]",
      render: (row) => <span className="text-sm">{row.interest || "—"}</span>,
    },
    {
      id: "notes",
      label: "Notes (Editable)",
      minWidth: "min-w-[250px]",
      render: (row) => {
        const isEditing = editingNotes.hasOwnProperty(row.id);
        const currentNotes = isEditing ? editingNotes[row.id] : row.notes || "";

        return isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={currentNotes}
              onChange={(e) =>
                setEditingNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
              }
              className="h-8 text-sm"
              placeholder="Add notes..."
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => saveNotes(row.id, currentNotes)}
              disabled={updateCallingM.isPending}
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
          <div
            className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 transition-colors"
            onClick={() =>
              setEditingNotes((prev) => ({ ...prev, [row.id]: row.notes || "" }))
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
      render: (row) => <span className="text-sm">{row.assistantcalling || "—"}</span>,
    },
  ], [editingNotes, updateCallingM.isPending]);
  
  // Apply saved column order
  const applyColumnOrder = useCallback((columns: ColumnConfig[], savedOrder?: string[]) => {
    if (!savedOrder || savedOrder.length === 0) return columns;
    
    const columnMap = new Map(columns.map((c) => [c.id, c]));
    const reordered = savedOrder
      .map((id) => columnMap.get(id))
      .filter((c): c is ColumnConfig => c !== undefined);
    
    const existingIds = new Set(savedOrder);
    const newColumns = columns.filter((c) => !existingIds.has(c.id));
    
    return [...reordered, ...newColumns];
  }, []);
  
  const callingColumns = useMemo(
    () => applyColumnOrder(baseCallingColumns, callingColumnOrder),
    [baseCallingColumns, callingColumnOrder, applyColumnOrder]
  );
  
  // Handle column reorder
  const handleCallingColumnReorder = useCallback(
    async (newColumns: ColumnConfig[]) => {
      await setCallingColumnOrder(newColumns.map((c) => c.id));
      toast({
        title: "Column order saved",
        description: "Your layout has been persisted",
        duration: 2000,
      });
    },
    [setCallingColumnOrder, toast]
  );

  const colCount = useMemo(() => {
    if (viewMode === "dashboard") {
      return 4 + dynamicKeys.length; // checkbox + 3 system fields + dynamic
    } else {
      return 9; // # + name + number + status + callsummary + interest + notes + calltime + assistant
    }
  }, [viewMode, dynamicKeys.length]);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)), [selected]);

  async function refresh() {
    try {
      if (viewMode === "dashboard") {
        await leadsQ.refetch();
      } else {
        await callingQ.refetch();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "CRM", description: e?.message ?? "Failed to refresh" });
    }
  }

  async function bulkDeleteSelected() {
    if (selectedIds.length === 0) return;
    try {
      const res = await bulkDeleteM.mutateAsync(selectedIds);
      setSelected({});
      toast({ title: "CRM", description: `Deleted ${res.deleted_count} lead(s)` });
      // If we deleted everything on the page, go back a page.
      if (selectedIds.length >= leads.length && offset > 0) {
        setOffset(Math.max(0, offset - limit));
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "CRM", description: e?.message ?? "Failed to delete" });
    }
  }

  async function onCsvFile(file: File) {
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast({ variant: "destructive", title: "CRM Import", description: "CSV is empty" });
      return;
    }

    const headers = Object.keys(rows[0] ?? {});
    setImportFileName(file.name);
    setImportHeaders(headers);
    setImportRows(rows);

    // Initialize mappings - ALL unmapped by default (user decides everything)
    const initial = headers.map(h => ({
      source_field: h,
      target_field: null
    }));
    
    setColumnMappings(initial);
    setImportStep("mapping");
  }

  function resetImport() {
    setImportStep("idle");
    setImportFileName(null);
    setImportHeaders([]);
    setImportRows([]);
    setColumnMappings([]);
    setImporting(null);
  }

  function hasRequiredMappings() {
    const mapped = columnMappings.map(m => m.target_field);
    return (
      mapped.includes("customer_index") &&
      mapped.includes("customername") &&
      mapped.includes("customernumber")
    );
  }

  async function finalizeImport() {
    if (!hasRequiredMappings()) {
      toast({ 
        variant: "destructive", 
        title: "CRM Import", 
        description: "Please map Index Number, Customer Name, and Customer Number." 
      });
      return;
    }
    
    setImportStep("importing");
    setImporting({ done: 0, total: importRows.length });

    try {
      // Send mappings and rows to backend
      const payload = {
        source: "csv",
        rows: importRows,
        mappings: columnMappings
      };

      const res = await api.crm.importFinalize(payload);
      
      toast({ 
        title: "CRM Import", 
        description: `✓ Imported ${res.created} leads (skipped ${res.skipped} duplicates)` 
      });
      resetImport();
      await leadsQ.refetch();
      
    } catch (e: any) {
      setImportStep("mapping");
      const msg = e?.message ?? "Import failed";
      
      if (msg.includes("lock") || msg.includes("progress")) {
        toast({ 
          variant: "destructive", 
          title: "Import Blocked", 
          description: "Another import is running. Please wait.",
          duration: 6000,
        });
      } else if (msg.includes("timeout")) {
        toast({ 
          variant: "destructive", 
          title: "Import Timeout", 
          description: "File too large. Try splitting into smaller batches (500 rows each).",
          duration: 8000,
        });
      } else {
        toast({ variant: "destructive", title: "Import Failed", description: msg });
      }
    } finally {
      setImporting(null);
    }
  }

  /**
   * Save notes with Optimistic UI Update
   * 
   * Workflow:
   * 1. Update local client state immediately for instant feedback
   * 2. Trigger background PATCH request
   * 3. On error: Rollback to previous value and show toast
   * 4. On success: Server state syncs via mutation's onSettled
   */
  async function saveNotes(callingId: number, notes: string) {
    try {
      // Mutation handles optimistic update automatically
      await updateCallingM.mutateAsync({ callingId, payload: { notes } });
      
      // Success: Clear editing state
      setEditingNotes(prev => {
        const next = { ...prev };
        delete next[callingId];
        return next;
      });
      
      toast({ 
        title: "Saved", 
        description: "Notes updated successfully",
        duration: 2000,
      });
    } catch (e: any) {
      // Error: Mutation already rolled back via onError
      toast({ 
        variant: "destructive", 
        title: "Failed to save notes", 
        description: e?.message || "Please try again",
        duration: 4000,
      });
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">CRM</h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "dashboard" ? "Master data storage" : "Active workspace - Monitor call activity"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
            <button
              onClick={() => {
                setViewMode("dashboard");
                setOffset(0);
                setSelected({});
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "dashboard"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Database className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => {
                setViewMode("calling");
                setOffset(0);
                setSelected({});
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === "calling"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="h-4 w-4" />
              Calling CRM
            </button>
          </div>

          <Button variant="outline" onClick={refresh} disabled={loading || isRefreshing}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
          
          {viewMode === "dashboard" && (
            <Button
              variant="destructive"
              onClick={bulkDeleteSelected}
              disabled={bulkDeleteM.isPending || selectedIds.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete selected ({selectedIds.length})
            </Button>
          )}
        </div>
      </motion.div>

      <motion.div variants={item} className="relative max-w-md">
        <Input
          placeholder="Search by name/number/status…"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          className="bg-muted/50 border-0"
        />
      </motion.div>

      {viewMode === "dashboard" && (
        <motion.div variants={item} className="rounded-lg border border-border bg-card shadow-sm max-w-[1400px]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Import Leads</h2>
            <p className="text-xs text-muted-foreground mt-1">Upload CSV and map columns</p>
          </div>
          {importing ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-md border border-primary/20">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-primary">
                  Processing {importing.total} rows...
                </p>
                <p className="text-xs text-muted-foreground">
                  Please wait, do not close or refresh
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-border p-3 space-y-2">
            <p className="text-sm font-medium">CSV upload</p>
            {importStep === "idle" ? (
              <p className="text-xs text-muted-foreground">
                Upload a CSV. Next you’ll map your columns (Phone Number is required).
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                File: <span className="font-mono">{importFileName}</span> ({importHeaders.length} columns, {importRows.length} rows)
              </p>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={importStep === "importing"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onCsvFile(f);
                // allow re-selecting same file
                e.currentTarget.value = "";
              }}
            />

            {importStep !== "idle" ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={resetImport} disabled={importStep === "importing"}>
                  Cancel
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {importStep === "mapping" ? (
          <div className="rounded-md border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Column Mapping</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Map your CSV columns to system fields
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetImport}>
                  Cancel
                </Button>
                <Button 
                  onClick={finalizeImport} 
                  disabled={!hasRequiredMappings() || importing !== null}
                >
                  {importing ? `Importing ${importing.done}/${importing.total}...` : "Import Now"}
                </Button>
              </div>
            </div>

            <ColumnMapper
              headers={importHeaders}
              mappings={columnMappings}
              onChange={setColumnMappings}
            />

            <div className="space-y-1 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Preview (first 3 rows)</p>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted/30 p-3 text-xs font-mono">
                {JSON.stringify(importRows.slice(0, 3), null, 2)}
              </pre>
            </div>
          </div>
        ) : null}
      </motion.div>
      )}

      <motion.div variants={item} className="flex items-center justify-between gap-3 pt-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => {
              setSelected({});
              setOffset(Math.max(0, offset - limit));
            }}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={loading || (viewMode === "dashboard" ? leads.length : calling.length) < limit}
            onClick={() => {
              setSelected({});
              setOffset(offset + limit);
            }}
          >
            Next
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {viewMode === "dashboard" ? leads.length : calling.length} {viewMode === "dashboard" ? "lead" : "call"}(s)
          {offset ? ` • offset ${offset}` : ""}
          {q ? ` • search: ${q}` : ""}
          {dynamicKeys.length ? ` • dynamic columns: ${dynamicKeys.length}` : ""}
        </p>
      </motion.div>

      <motion.div variants={item} className="rounded-lg border border-border bg-card shadow-sm">
        {viewMode === "calling" ? (
          // Calling CRM with draggable columns
          <div className="max-h-[70vh] overflow-auto">
            <ReorderableTable
              columns={callingColumns}
              data={calling}
              rowKey="id"
              onColumnOrderChange={handleCallingColumnReorder}
              emptyMessage="No calling activity yet. Import leads in Dashboard first."
              className="w-full"
            />
          </div>
        ) : (
          // Dashboard view with standard table
          <div className="max-h-[70vh] overflow-auto">
            <Table>
            <TableHeader className="sticky top-0 z-10 bg-card border-b-2 border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px] px-4 py-3 font-semibold">
                  <input type="checkbox" className="cursor-pointer" disabled />
                </TableHead>
                <TableHead className="w-[100px] px-4 py-3 font-semibold">#</TableHead>
                <TableHead className="min-w-[180px] px-4 py-3 font-semibold">Customer Name</TableHead>
                <TableHead className="min-w-[140px] px-4 py-3 font-semibold">Phone Number</TableHead>
                {dynamicKeys.map((k) => (
                  <TableHead key={k} className="min-w-[150px] max-w-[240px] px-4 py-3 font-semibold">
                    <span className="font-mono text-xs truncate block">{k}</span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {error ? (
                <TableRow className="border-border hover:bg-muted/30">
                  <TableCell colSpan={colCount} className="py-12 text-center">
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </TableCell>
                </TableRow>
              ) : loading ? (
                Array.from({ length: 10 }).map((_, idx) => (
                  <TableRow key={`sk-${idx}`} className="border-border hover:bg-muted/30">
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    {dynamicKeys.map((k) => (
                      <TableCell key={k} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (viewMode === "dashboard" ? leads : calling).length === 0 ? (
                <TableRow className="border-border hover:bg-muted/30">
                  <TableCell colSpan={colCount} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      {viewMode === "dashboard" 
                        ? "No leads found. Upload a CSV to get started."
                        : "No calling activity yet. Import leads in Dashboard first."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : viewMode === "dashboard" ? (
                leads.map((l) => {
                  const data = (l as any)?.data as Record<string, any> | null | undefined;

                  return (
                    <TableRow key={l.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="cursor-pointer"
                          checked={Boolean(selected[l.id])}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [l.id]: e.target.checked }))}
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-sm text-muted-foreground font-medium">
                        {l.customer_index}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-foreground font-medium">
                        <div className="truncate max-w-[180px]" title={l.customername || "—"}>
                          {l.customername || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground font-mono text-sm">
                        <div className="truncate max-w-[140px]" title={l.customernumber || "—"}>
                          {l.customernumber || "—"}
                        </div>
                      </TableCell>
                      {dynamicKeys.map((k) => {
                        const v = data?.[k];
                        const text = v === null || v === undefined ? "—" : typeof v === "string" ? v : String(v);
                        return (
                          <TableCell key={k} className="px-4 py-3 text-muted-foreground text-sm">
                            <div className="truncate max-w-[200px]" title={text}>
                              {text}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              ) : null}
          </TableBody>
        </Table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}