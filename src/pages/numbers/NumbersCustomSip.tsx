import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NumbersCustomSip() {
  return (
    <div className="space-y-[clamp(1.25rem,2.4vw,2.25rem)]">
      <div data-reveal>
        <h1 className="font-display text-h1 text-foreground">Numbers · Custom SIP</h1>
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
    </div>
  );
}
