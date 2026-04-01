import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-sm border-b-2 border-transparent bg-input px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-b-ring focus-visible:outline-none focus-visible:shadow-[0_0_0_4px_rgba(72,162,206,0.1)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
