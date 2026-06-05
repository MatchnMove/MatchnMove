import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getOrCreateStripeCustomer, requireAuthenticatedMoverWithBilling } from "@/lib/mover-billing";
import { stripe } from "@/lib/stripe";

function getCheckoutReturnOrigin(req: NextRequest) {
  if (process.env.NODE_ENV !== "production") return req.nextUrl.origin;
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  try {
    const mover = await requireAuthenticatedMoverWithBilling();
    if (!mover) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!stripe) return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });

    const customerId = await getOrCreateStripeCustomer(mover);
    if (!customerId) return NextResponse.json({ error: "Could not create a billing customer." }, { status: 500 });

    const origin = getCheckoutReturnOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "setup",
      customer: customerId,
      success_url: `${origin}/mover/dashboard?tab=payments&billing=updated`,
      cancel_url: `${origin}/mover/dashboard?tab=payments`,
      payment_method_types: ["card"],
      client_reference_id: mover.id,
      setup_intent_data: {
        metadata: {
          moverCompanyId: mover.id,
          purpose: "billing_payment_method",
        },
      },
      metadata: {
        moverCompanyId: mover.id,
        purpose: "billing_payment_method",
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Stripe did not return a billing session URL." }, { status: 502 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Stripe.errors.StripeAuthenticationError
        ? "Stripe billing is misconfigured. Please update STRIPE_SECRET_KEY."
        : error instanceof Error && error.message
          ? error.message
          : "Could not open Stripe billing setup.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
