import { auth } from "@/auth";
import { db } from "@/db";
import { bookings, bookingDocuments } from "@/db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { Container } from "@/components/ui/container";
import { FileText, Image as ImageIcon, FolderOpen } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const session = await auth();
  const customerId = Number(session!.user!.customerId);

  const myBookings = await db.select().from(bookings).where(eq(bookings.customerId, customerId));
  const bookingIds = myBookings.map((b) => b.id);
  const documents = bookingIds.length
    ? await db.select().from(bookingDocuments).where(inArray(bookingDocuments.bookingId, bookingIds)).orderBy(desc(bookingDocuments.uploadedAt))
    : [];

  return (
    <Container className="!px-0 max-w-none">
      <h1 className="font-display text-2xl font-semibold text-foreground">Documents</h1>
      <p className="mt-1 text-sm text-muted">Venue photos, floor plans and reference files across all your bookings.</p>

      {documents.length === 0 ? (
        <div className="surface-card mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl p-14 text-center">
          <FolderOpen className="h-8 w-8 text-muted-2" />
          <p className="text-sm text-muted">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const booking = myBookings.find((b) => b.id === doc.bookingId);
            return (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="surface-card surface-card-hover flex items-center gap-3 rounded-2xl p-4"
              >
                {doc.category === "pdf" ? (
                  <FileText className="h-5 w-5 shrink-0 text-accent" />
                ) : (
                  <ImageIcon className="h-5 w-5 shrink-0 text-accent" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{doc.fileName}</div>
                  <div className="truncate text-xs text-muted-2">{booking?.eventName}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </Container>
  );
}
