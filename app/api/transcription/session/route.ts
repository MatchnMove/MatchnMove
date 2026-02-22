import { NextResponse } from "next/server";

export async function POST() {
  const mockSessionId = crypto.randomUUID();
  const extractedFields = {
    name: "Voice User",
    email: "voice@example.com",
    phone: "021 123 4567",
    fromCity: "Auckland",
    toCity: "Wellington"
  };

  if (process.env.N8N_WEBHOOK_URL) {
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: mockSessionId, provider: "elevenlabs" })
    }).catch(() => null);
  }

  return NextResponse.json({ sessionId: mockSessionId, status: "listening", extractedFields });
}
