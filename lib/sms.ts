export async function sendPhoneVerificationSms(phone: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMS verification is not configured.");
    }
    console.info(`[development] Match 'n Move phone verification code for ${phone}: ${code}`);
    return { sent: false, developmentCode: code };
  }

  const body = new URLSearchParams({
    To: phone,
    From: fromNumber,
    Body: `Your Match 'n Move verification code is ${code}. It expires in 10 minutes.`,
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(result?.message || "SMS provider rejected the verification message.");
  }

  return { sent: true, developmentCode: null };
}
