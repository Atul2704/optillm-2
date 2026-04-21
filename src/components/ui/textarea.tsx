import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[160px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white placeholder:text-white/40 outline-none focus:border-white/20",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

