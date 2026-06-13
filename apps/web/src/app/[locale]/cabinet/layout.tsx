import type { ReactNode } from "react";
import { CabinetShell } from "@/components/cabinet/cabinet-shell";

/**
 * /cabinet/* layout: the client-side CabinetShell gates the session
 * (guests → /auth?next=…) and renders the sidebar / mobile tabs.
 */
export default function CabinetLayout({ children }: { children: ReactNode }) {
  return <CabinetShell>{children}</CabinetShell>;
}
