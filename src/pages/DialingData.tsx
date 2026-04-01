import { useMemo, useRef, useState } from "react";
import { RefreshCw, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useDeleteDialingFile, useDialingFiles, useImportDialingFile, useSetDialingFileLinkedAssistant } from "@/hooks/use-dialing-data-queries";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { LinkedAssistantSelect, type AssistantOption } from "@/pages/dialing-data/LinkedAssistantSelect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CsvPreview = {
  headers: string[];
  sampleRows: string[][];
  phoneHeader: string | null;
  nameHeader: string | null;
  issues: string[];
};

const PHONE_ALIASES = new Set([
  "phone",
  "phone_number",
  "number",
  "mobile",
  "cell",
  "customernumber",
  "customer_number",
]);

const NAME_ALIASES = new Set([
  "name",
  "full_name",
  "customername",
  "customer_name",
]);

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectDelimiter(headerLine: string): string {
  const candidates = [",", ";", "\t", "|"];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

function normalizeHeader(h: string): string {
  // Normalize common variants:
  // - "Phone Number" -> "phone_number"
  // - "phone-number" -> "phone_number"
  // - "Customer Number" -> "customer_number"
  return (h || "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function buildCsvPreview(file: File): Promise<CsvPreview> {
  const issues: string[] = [];

  const nameLower = (file.name || "").toLowerCase();
  const typeLower = (file.type || "").toLowerCase();
  const looksLikeCsv = nameLower.endsWith(".csv") || typeLower.includes("csv") || typeLower.includes("comma-separated");
  if (!looksLikeCsv) {
    issues.push("File must be a .csv (CSV only).");
  }

  const sampleTextRaw = await file.slice(0, 200_000).text();
  const sampleText = sampleTextRaw.replace(/^\uFEFF/, "");

  const lines = sampleText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      headers: [],
      sampleRows: [],
      phoneHeader: null,
      nameHeader: null,
      issues: ["CSV is empty."],
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map((h) => h.replace(/^\uFEFF/, "").trim());
  if (headers.length === 0 || headers.every((h) => !h)) {
    return {
      headers: [],
      sampleRows: [],
      phoneHeader: null,
      nameHeader: null,
      issues: ["CSV has no headers."],
    };
  }

  const firstHeaderNorm = normalizeHeader(headers[0] || "");
  const phoneHeader = PHONE_ALIASES.has(firstHeaderNorm) ? headers[0] : null;
  if (!phoneHeader) {
    issues.push(
      "First column must be the phone number (header: phone, number, phone_number, customernumber, …).",
    );
  }

  const secondHeaderNorm = normalizeHeader(headers[1] || "");
  const nameHeader = NAME_ALIASES.has(secondHeaderNorm) ? headers[1] : null;

  const sampleRows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const row = parseCsvLine(lines[i], delimiter);
    if (row.length === 0) continue;
    sampleRows.push(row);
  }

  if (sampleRows.length === 0) {
    issues.push("CSV contains headers but no data rows.");
  }

  return { headers, sampleRows, phoneHeader, nameHeader, issues };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.replace("T", " ").slice(0, 19);
  }
}

export default function DialingData() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoCloseTimerRef = useRef<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const filesQ = useDialingFiles();
  const importM = useImportDialingFile();
  const deleteM = useDeleteDialingFile();
  const setLinkedAssistantM = useSetDialingFileLinkedAssistant();

  const assistantsQ = useQuery({
    queryKey: ["assistants", "with-stats"],
    queryFn: () => api.dashboard.assistantsWithStats(),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => filesQ.data?.files ?? [], [filesQ.data]);
  const assistants: AssistantOption[] = useMemo(
    () => (assistantsQ.data?.assistants ?? []) as AssistantOption[],
    [assistantsQ.data],
  );

  async function openPreviewForFile(file: File) {
    setPendingFile(file);
    setPreview(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const p = await buildCsvPreview(file);
      setPreview(p);
    } catch (e: any) {
      setPreview({
        headers: [],
        sampleRows: [],
        phoneHeader: null,
        nameHeader: null,
        issues: [e?.message ?? "Failed to read CSV."],
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function onUploadSelected() {
    const input = fileInputRef.current;
    const file = input?.files?.[0];
    if (!file) return;
    await openPreviewForFile(file);
  }

  async function onConfirmImport() {
    if (!pendingFile) return;
    const file = pendingFile;

    // Track progress outside the modal so closing doesn't lose feedback.
    const t = toast({
      title: "Import started",
      description: `Importing ${file.name} in the background…`,
    });

    // Non-blocking UX: close the modal automatically after ~5s.
    // This does NOT cancel the import request.
    if (autoCloseTimerRef.current != null) {
      window.clearTimeout(autoCloseTimerRef.current);
    }
    autoCloseTimerRef.current = window.setTimeout(() => {
      setPreviewOpen(false);
      autoCloseTimerRef.current = null;
    }, 5000);

    importM.mutate(file, {
      onSuccess: () => {
        t.update({ id: t.id, title: "Imported", description: `${file.name} added to Dialing Data.` });
        const input = fileInputRef.current;
        if (input) input.value = "";
        setPendingFile(null);
        setPreview(null);
        setPreviewLoading(false);
      },
      onError: (e: any) => {
        t.update({
          id: t.id,
          variant: "destructive",
          title: "Import failed",
          description: e?.message ?? "Failed to import CSV",
        });
        // Clear state so user can try again cleanly.
        const input = fileInputRef.current;
        if (input) input.value = "";
        setPendingFile(null);
        setPreview(null);
        setPreviewLoading(false);
      },
    });
  }

  async function onDelete(fileId: number) {
    try {
      await deleteM.mutateAsync(fileId);
      toast({ title: "Deleted", description: "Dialing file deleted." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Delete failed", description: e?.message ?? "Failed to delete file" });
    }
  }

  async function onSetLinkedAssistant(fileId: number, nextAssistantId: number | null, currentAssistantId: number | null) {
    try {
      await setLinkedAssistantM.mutateAsync({ fileId, nextAssistantId, currentAssistantId });
      toast({ title: "Saved", description: "Linked assistant updated." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Save failed", description: e?.message ?? "Failed to update link" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dialing Data</h1>
          <p className="text-muted-foreground">Upload CSVs and link one file to each assistant.</p>
        </div>

        <Button
          variant="outline"
          onClick={() => filesQ.refetch()}
          disabled={filesQ.isFetching}
          className="gap-2"
        >
          <RefreshCw className={"h-4 w-4 " + (filesQ.isFetching ? "animate-spin" : "")} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            CSV format: first column must be phone number (header: phone/number/customernumber). Second column may be name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-input p-6 text-center"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer?.files?.[0];
              if (f) void openPreviewForFile(f);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onUploadSelected}
              className="hidden"
              disabled={importM.isPending}
            />

            <div className="text-sm text-muted-foreground">
              Drag and drop a CSV here, or choose a file.
            </div>

            <Button
              className="gap-2"
              disabled={importM.isPending}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {importM.isPending ? "Uploading…" : "Choose CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={previewOpen}
        onOpenChange={(v) => {
          setPreviewOpen(v);
          if (!v && !importM.isPending) {
            setPendingFile(null);
            setPreview(null);
            setPreviewLoading(false);
            const input = fileInputRef.current;
            if (input) input.value = "";
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm CSV Import</DialogTitle>
            <DialogDescription>
              Review the detected columns and a small preview. Import is blocked until the first column is a phone number.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">File:</span> {pendingFile?.name ?? "—"}
            </div>

            {previewLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : preview ? (
              <>
                {preview.issues.length > 0 && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    <ul className="list-disc pl-5">
                      {preview.issues.map((msg) => (
                        <li key={msg}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Detected phone column:</span>{" "}
                    {preview.phoneHeader ? <span className="font-medium">{preview.phoneHeader}</span> : "—"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Detected name column:</span>{" "}
                    {preview.nameHeader ? <span className="font-medium">{preview.nameHeader}</span> : "(none)"}
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.headers.slice(0, 6).map((h, idx) => (
                          <TableHead key={`${h}-${idx}`} className={idx === 0 ? "font-semibold" : ""}>
                            {h || "(blank)"}
                          </TableHead>
                        ))}
                        {preview.headers.length > 6 && <TableHead>…</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.sampleRows.slice(0, 5).map((r, i) => (
                        <TableRow key={i}>
                          {preview.headers.slice(0, 6).map((_, colIdx) => (
                            <TableCell key={colIdx} className={colIdx === 0 ? "font-mono text-xs" : "text-xs"}>
                              {(r[colIdx] ?? "").slice(0, 80) || "—"}
                            </TableCell>
                          ))}
                          {preview.headers.length > 6 && <TableCell className="text-xs">…</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No preview available.</div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              {importM.isPending ? "Close" : "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={onConfirmImport}
              disabled={importM.isPending || previewLoading || !pendingFile || !preview || preview.issues.length > 0}
            >
              {importM.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>Deleting a file removes its leads from the dial queue.</CardDescription>
        </CardHeader>
        <CardContent>
          {filesQ.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filesQ.isError ? (
            <div className="text-sm text-destructive">{(filesQ.error as any)?.message ?? "Failed to load files"}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No dialing files yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-[120px]">Rows</TableHead>
                  <TableHead>Linked Assistant</TableHead>
                  <TableHead className="w-[220px]">Created</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.original_filename}</TableCell>
                    <TableCell>{f.row_count}</TableCell>
                    <TableCell>
                      <LinkedAssistantSelect
                        currentAssistantId={f.linked_assistant?.assistant_id ?? null}
                        assistants={assistants}
                        disabled={assistantsQ.isLoading || assistantsQ.isError}
                        isSaving={setLinkedAssistantM.isPending}
                        onChange={(nextAssistantId) =>
                          onSetLinkedAssistant(f.id, nextAssistantId, f.linked_assistant?.assistant_id ?? null)
                        }
                      />
                    </TableCell>
                    <TableCell>{fmtDateTime(f.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(f.id)}
                        disabled={deleteM.isPending}
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
