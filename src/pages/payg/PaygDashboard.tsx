/**
 * PAYG Dashboard — placeholder page.
 * Functionality will be customised for Pay-As-You-Go use cases.
 */

import { motion } from "framer-motion";
import { LayoutDashboard, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export default function PaygDashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15">
            <LayoutDashboard className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Your Pay-As-You-Go overview.</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-accent-foreground" />
              Pay-As-You-Go Interface
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This dashboard is reserved for Pay-As-You-Go metrics and quick-access tools.
              Content will be customised in a future update.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
