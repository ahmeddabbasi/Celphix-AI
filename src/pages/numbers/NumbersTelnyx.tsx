import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export default function NumbersTelnyx() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Numbers · Telnyx</h1>
        <p className="text-sm text-muted-foreground">Plugin placeholder for Telnyx numbers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Telnyx</CardTitle>
          <CardDescription>Manage Telnyx phone numbers and credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No configuration yet.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
