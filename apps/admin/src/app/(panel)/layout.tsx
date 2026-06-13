import AdminShell from "@/components/admin-shell";

// Все разделы админки (кроме /login) живут в этой группе — за гейтом AdminShell.
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
