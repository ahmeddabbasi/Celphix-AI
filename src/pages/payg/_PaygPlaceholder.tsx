/**
 * Shared PAYG page scaffold.
 * Renders a consistent layout shell for pages that are still being built.
 */

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

const item      = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

interface PaygPlaceholderProps {
  title: string;
  subtitle: string;
  Icon: LucideIcon;
}

export function PaygPlaceholder({ title, subtitle, Icon }: PaygPlaceholderProps) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
            <Icon className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">12</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">This week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">84</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Estimated cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">$0.00</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <motion.div variants={item}>
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
              {[
                { name: `${title} A`, status: "Active", updated: "2m ago" },
                { name: `${title} B`, status: "Idle", updated: "12m ago" },
                { name: `${title} C`, status: "Queued", updated: "1h ago" },
                { name: `${title} D`, status: "Active", updated: "3h ago" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="grid grid-cols-3 gap-3 px-3 py-2 text-sm text-foreground"
                >
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="text-muted-foreground">{row.status}</span>
                  <span className="text-right text-muted-foreground">{row.updated}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
