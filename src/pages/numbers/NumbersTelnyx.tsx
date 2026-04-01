import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NumbersTelnyx() {
  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal>
        <h1 className="font-display text-h1 text-foreground">Numbers · Telnyx</h1>
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
    </div>
  );
}
