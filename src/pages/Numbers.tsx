import { motion } from "framer-motion";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Numbers() {
  useEffect(() => {
    // Placeholder hook: reserved for plugin initialization if needed later.
    return () => {
      // cleanup
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Numbers</h1>
        <p className="text-sm text-muted-foreground">
          Choose a provider from the left sidebar.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Numbers plugin</CardTitle>
          <CardDescription>Minimal placeholder page for the Numbers plugin.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This page is intentionally minimal. Use it as the starting place for a "Numbers" plugin.
          </p>

          <div className="flex gap-2">
            <Button onClick={() => alert("Numbers plugin placeholder action")}>Test action</Button>
            <Button variant="outline" onClick={() => navigator.clipboard?.writeText("numbers-plugin-placeholder")}>
              Copy id
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
