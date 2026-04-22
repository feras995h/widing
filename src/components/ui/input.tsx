import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, lang, dir, ...props }, ref) => {
    const isNumericLike =
      type === "number" ||
      type === "date" ||
      type === "time" ||
      type === "month" ||
      type === "datetime-local";

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isNumericLike && "latin-digits",
          className,
        )}
        {...props}
        lang={isNumericLike ? "en" : lang}
        dir={isNumericLike ? "ltr" : dir}
        ref={ref}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
