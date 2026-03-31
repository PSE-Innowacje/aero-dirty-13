import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  const variantClasses = {
    default: "bg-primary-container text-primary-foreground shadow",
    secondary: "bg-surface-container-high text-foreground",
    destructive: "bg-destructive text-destructive-foreground shadow",
    outline: "border border-outline-variant text-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
