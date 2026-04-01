import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[12px] border-[1.5px] border-border/15 bg-card/50 px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground/70 transition-[border-color,box-shadow,background-color] duration-200 ease-out file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:border-ring/50 focus-visible:shadow-[0_0_0_4px_hsl(var(--ring)_/_0.08)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
