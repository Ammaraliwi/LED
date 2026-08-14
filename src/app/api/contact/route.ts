import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    // In production this would dispatch to email/CRM (e.g. via a notifications queue).
    console.log("New contact inquiry:", body);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Please check your inputs and try again." }, { status: 400 });
  }
}
