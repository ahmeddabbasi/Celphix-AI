/**
 * Shared PAYG page scaffold.
 * Renders a consistent layout shell for pages that are still being built.
 */

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface PaygPlaceholderProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

export function PaygPlaceholder({ title, subtitle, Icon }: PaygPlaceholderProps) {
  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-display text-h1">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>

      <div data-reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">—</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">This week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">—</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Estimated cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">—</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div data-reveal>
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-accent-foreground" />
              Pay-As-You-Go — {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Overview and recent activity.</p>

            <div className="rounded-md border border-border">
              <div className="grid grid-cols-3 gap-3 border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                <span>Item</span>
                <span>Status</span>
                <span className="text-right">Updated</span>
              </div>
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                No items yet.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
