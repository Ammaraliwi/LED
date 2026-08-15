import { z } from "zod";
import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { assertSameOrigin, clientAddress } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2).max(255),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10).max(8_000),
}).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const limit = await consumeRateLimit("contact", clientAddress(request));
    if (!limit.allowed) return Response.json({ error: "Please wait before sending another message." }, { status: 429 });
    const body = schema.parse(await request.json());
    await db.insert(contactSubmissions).values({
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone || null,
      message: body.message,
    });
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : "Please check your inputs and try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
