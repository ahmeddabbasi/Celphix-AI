/**
 * ActiveAssistants — donut chart of assistants currently on live calls.
 * Centre label is rendered as SVG <text> inside the chart — no DOM overlap hacks.
 * Data from /api/dashboard/active-assistants (refreshes every 60s).
 */

import { Bot, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveAssistants } from "@/hooks/use-milestone-queries";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLOR_ACTIVE = "#008613";
const COLOR_IDLE = "hsl(var(--muted))";

function CentreLabel({
  viewBox,
  count,
}: {
  viewBox?: { cx?: number; cy?: number };
  count: number;
}) {
  const cx = viewBox?.cx ?? 0;
  const cy = viewBox?.cy ?? 0;
  return (
    <>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 28, fontWeight: 700, fill: "hsl(var(--foreground))" }}
      >
        {count}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: 11,
          fill: "hsl(var(--muted-foreground))",
          letterSpacing: "0.06em",
        }}
      >
        {count === 1 ? "ON CALL" : "ON CALLS"}
      </text>
    </>
  );
}

interface TooltipEntry {
  name: string;
  value: number;
}
function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
}) {
  if (!active || !payload?.length || payload[0].name === "Idle") return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-1.5 text-xs shadow-md">
      <span className="font-medium text-primary">{payload[0].value} live</span>
    </div>
  );
}

export function ActiveAssistants() {
  const { data, isLoading } = useActiveAssistants();

  const activeCount = data?.active_count ?? 0;
  const activeNames = data?.active_names ?? [];

  const chartData =
    activeCount > 0
      ? [{ name: "On Call", value: activeCount }]
      : [{ name: "Idle", value: 1 }];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Phone className="h-4 w-4 text-primary" />
            Active Assistants
          </CardTitle>
          {!isLoading && (
            <Badge
              variant={activeCount > 0 ? "default" : "secondary"}
              className={activeCount > 0 ? "bg-primary text-primary-foreground" : ""}
            >
              {activeCount > 0 ? `${activeCount} live` : "None"}
            </Badge>
          )}
        </div>
        <CardDescription>Assistants currently on live calls.</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3 pb-5">
        {isLoading ? (
          <Skeleton className="mt-2 h-40 w-40 rounded-full" />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={0}
                  dataKey="value"
                  strokeWidth={0}
                  labelLine={false}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={(props: any) => (
                    <CentreLabel viewBox={props.viewBox} count={activeCount} />
                  )}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.name === "On Call" ? COLOR_ACTIVE : COLOR_IDLE}
                    />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {activeCount > 0 ? (
              <div className="flex flex-wrap justify-center gap-1.5">
                {activeNames.map((name, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-primary/10 border-primary/30 text-primary gap-1.5 text-xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {name}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <Bot className="h-4 w-4 opacity-30" />
                <p className="text-xs">No assistants on calls right now.</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
