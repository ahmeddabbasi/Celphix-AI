import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export default function NumbersCustomSip() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Numbers · Custom SIP</h1>
        <p className="text-sm text-muted-foreground">
          Single provider page for custom SIP integrations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom SIP</CardTitle>
          <CardDescription>Configure your SIP trunk/provider settings here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No configuration yet.</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
