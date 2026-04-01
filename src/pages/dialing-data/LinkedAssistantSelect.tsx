import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AssistantOption = {
  assistant_id: number;
  display_name: string;
  agent_key: string | null;
  is_active: boolean;
  is_in_call: boolean;
};

export function LinkedAssistantSelect({
  currentAssistantId,
  assistants,
  disabled,
  isSaving,
  onChange,
}: {
  currentAssistantId: number | null;
  assistants: AssistantOption[];
  disabled?: boolean;
  isSaving?: boolean;
  onChange: (nextAssistantId: number | null) => void;
}) {
  const value = currentAssistantId != null ? String(currentAssistantId) : "__none__";

  const items = useMemo(() => {
    return assistants
      .slice()
      .sort((a, b) => {
        // Keep currently-live assistants first, then active, then alpha by name.
        if (a.is_in_call !== b.is_in_call) return a.is_in_call ? -1 : 1;
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (a.display_name ?? "").localeCompare(b.display_name ?? "");
      });
  }, [assistants]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value}
        onValueChange={(v) => onChange(v === "__none__" ? null : Number(v))}
        disabled={disabled || isSaving}
      >
        <SelectTrigger className="min-w-[220px]">
          <SelectValue placeholder="Select assistant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {items.map((a) => (
            <SelectItem key={a.assistant_id} value={String(a.assistant_id)}>
              {a.display_name || a.agent_key || `Assistant ${a.assistant_id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
