import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * يفرض عرض أرقام 0–9 بأشكالها اللاتينية على الصفحات العربية/RTL
 * (بدون ١٢٣ حتى عند استخدام خط Cairo وغيره بميزات local digits).
 */
export function LatinDigits({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span lang="en" dir="ltr" className={cn("latin-digits tabular-nums", className)} translate="no">
      {children}
    </span>
  );
}
