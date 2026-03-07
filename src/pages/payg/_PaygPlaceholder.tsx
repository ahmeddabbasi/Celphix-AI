/**
 * Shared placeholder factory for PAYG pages.
 * Each page is a thin wrapper that renders a consistent "coming soon" card
 * with a page-specific icon and title.
 * Functionality will be customised per page in future sprints.
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
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-accent-foreground" />
              Pay-As-You-Go — {title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This section is reserved for Pay-As-You-Go {title.toLowerCase()} features.
              Functionality will be tailored and implemented in a future update.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
