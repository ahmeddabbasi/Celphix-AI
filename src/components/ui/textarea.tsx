import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-[12px] border-[1.5px] border-border/15 bg-card/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/70 transition-[border-color,box-shadow,background-color] duration-200 ease-out focus-visible:outline-none focus-visible:border-ring/50 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)_/_0.08)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
