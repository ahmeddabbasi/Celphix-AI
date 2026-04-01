import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[12px] text-sm font-semibold ring-offset-background transition-[transform,box-shadow,background-color,border-color,color] duration-300 ease-spring active:scale-[0.97] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-ambient hover:shadow-elevated",
        destructive:
          "bg-destructive text-destructive-foreground shadow-ambient hover:shadow-elevated",
        outline:
          "border border-border/20 bg-transparent text-foreground shadow-ambient hover:bg-muted/40 hover:shadow-elevated",
        secondary:
          "bg-secondary/70 text-secondary-foreground shadow-ambient hover:bg-secondary/80 hover:shadow-elevated",
        ghost:
          "relative bg-transparent text-foreground/80 shadow-none hover:text-foreground focus-visible:text-foreground after:absolute after:inset-x-2 after:bottom-2 after:h-[2px] after:origin-left after:scale-x-0 after:bg-foreground/70 after:transition-transform after:duration-300 after:ease-out-expo hover:after:scale-x-100 focus-visible:after:scale-x-100",
        link:
          "bg-transparent text-primary shadow-none hover:text-primary/90",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-11 w-11 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
