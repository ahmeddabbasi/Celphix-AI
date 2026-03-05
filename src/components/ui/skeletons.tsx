import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Skeleton Loading Components for Sub-200ms Perceived Performance
 * 
 * These components match the exact layout of their final rendered counterparts
 * to prevent Cumulative Layout Shift (CLS). They appear instantly (<16ms) while
 * data loads in the background via TanStack Query's SWR caching.
 */

// ============================================================================
// Dashboard Skeletons
// ============================================================================

export function DashboardSkeletons() {
  return (
    <div className="space-y-6 p-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Top Assistants Table */}
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Admin Portal Skeletons
// ============================================================================

export function AdminPortalSkeletons() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-pulse">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-12 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* God View Table */}
      <GodViewTableSkeleton />

      {/* Activity Stream */}
      <Card className="animate-pulse">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Skeleton className="h-6 w-16 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function GodViewTableSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-96 mt-2" />
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {["User", "Role", "Assistants", "Active Calls", "Total Duration", "Last Login", "Actions"].map((header) => (
                <TableHead key={header}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Analytics Dashboard Skeleton
// ============================================================================

// Fake line-graph skeleton: X-axis ticks + a series of vertical bars that
// mimic the varying heights of a real multi-line chart.
function LineGraphSkeleton() {
  // Pre-defined heights so it looks like real data, not a flat rectangle
  const bars = [28, 52, 38, 70, 44, 85, 60, 48, 76, 55, 40, 65, 50, 72, 36, 80, 58, 45, 68, 53];
  return (
    <div className="w-full h-[300px] flex flex-col gap-2">
      {/* Chart area */}
      <div className="flex-1 flex items-end gap-[3px] px-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-muted rounded-t animate-pulse"
            style={{ height: `${h}%`, animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      {/* X-axis tick labels */}
      <div className="flex justify-between px-1">
        {[0, 4, 9, 14, 19].map((i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

// Fake donut/pie skeleton: outer ring with a punched-out centre hole.
function PieChartSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut ring */}
      <div className="relative w-44 h-44">
        <div className="w-full h-full rounded-full bg-muted animate-pulse" />
        {/* Centre cutout */}
        <div className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-card" />
      </div>
      {/* Legend rows */}
      <div className="flex flex-col gap-2 w-full max-w-[180px]">
        {[80, 60, 100, 70, 50].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-2.5 h-2.5 rounded-full shrink-0" />
            <Skeleton className={`h-3`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// Leaderboard table rows skeleton
function LeaderboardSkeleton() {
  // Column widths mimick: rank | assistant name | calls | interested | conv% | score
  const cols = ["w-8", "w-32", "w-16", "w-16", "w-14", "w-14"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {["Rank", "Assistant", "Calls", "Interested", "Conv%", "Score"].map((h) => (
              <th key={h} className="px-4 py-2 text-left">
                <Skeleton className="h-3 w-14" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="border-b last:border-0 animate-pulse">
              {cols.map((w, j) => (
                <td key={j} className="px-4 py-3">
                  {j === 0 ? (
                    <Skeleton className="h-8 w-8 rounded-full" />
                  ) : (
                    <Skeleton className={`h-4 ${w}`} style={{ animationDelay: `${i * 60}ms` }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-[280px]" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Call Volume — line graph skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent>
          <LineGraphSkeleton />
          {/* Legend pills */}
          <div className="flex gap-3 mt-3 flex-wrap">
            {[64, 80, 56, 72].map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-3" style={{ width: w }} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: Sentiment pie + Leaderboard table */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sentiment / Interest — donut skeleton */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-44 mb-1" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <PieChartSkeleton />
          </CardContent>
        </Card>

        {/* Leaderboard — table rows skeleton */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-3 w-56" />
          </CardHeader>
          <CardContent className="p-0">
            <LeaderboardSkeleton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Granular Component Skeletons
// ============================================================================

export function MetricCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className={`${height} w-full`} />
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <TableRow className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-4 w-20" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-2 animate-pulse">
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-20" />
    </div>
  );
}

// ============================================================================
// Activity Stream Skeleton (with pagination hint)
// ============================================================================

export function ActivityStreamSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
          <Skeleton className="h-6 w-16 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
      
      {/* Load More Button Skeleton */}
      <div className="flex justify-center pt-4">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
