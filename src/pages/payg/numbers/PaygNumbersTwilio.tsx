import { motion } from "framer-motion";
import { Link2, Phone, PhoneCall, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const rows = [
  {
    id: "num_1",
    phone: "+1 (415) 555-0149",
    label: "Outbound – West",
    assistant: "Inbound Sales",
    added: "Mar 12, 2026",
    status: "Connected" as const,
  },
  {
    id: "num_2",
    phone: "+1 (212) 555-0184",
    label: "Follow‑ups",
    assistant: "Follow‑ups",
    added: "Mar 10, 2026",
    status: "Connected" as const,
  },
  {
    id: "num_3",
    phone: "+1 (305) 555-0102",
    label: "",
    assistant: "Unlinked",
    added: "Mar 02, 2026",
    status: "Ready" as const,
  },
];

export default function PaygNumbersTwilio() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Numbers · Twilio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and link phone numbers.</p>
        </div>
        <Button disabled>
          <Plus className="h-4 w-4 mr-2" />
          Add Number
        </Button>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Your Twilio Numbers
            </CardTitle>
            <CardDescription>Each assistant can be linked to one number at a time.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Linked Assistant</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.label ? r.label : <span className="italic opacity-50">—</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.assistant === "Unlinked" ? (
                        <span className="text-muted-foreground">Unlinked</span>
                      ) : (
                        <span className="font-medium text-foreground">{r.assistant}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.added}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "Connected" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" disabled>
                          <Link2 className="h-3.5 w-3.5 mr-1.5" />
                          Link
                        </Button>
                        <Button size="sm" disabled>
                          <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
                          Start Call
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
