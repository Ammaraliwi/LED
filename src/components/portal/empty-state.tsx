import { CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return <div className="surface-card mt-5 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center"><CalendarCheck className="h-8 w-8 text-muted-2" /><p className="text-sm text-muted">You don&apos;t have any bookings yet.</p><Button href="/configure" size="sm">Build Your First Screen</Button></div>;
}
