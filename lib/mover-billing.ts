import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { requireAuthenticatedMover } from "@/lib/mover-profile";
import { stripe } from "@/lib/stripe";

export async function requireAuthenticatedMoverWithBilling() {
  return requireAuthenticatedMover();
}

export async function getOrCreateStripeCustomer(mover: { id: string; stripeCustomerId: string | null; user: { email: string }; companyName: string }) {
  if (!stripe) return null;

  if (mover.stripeCustomerId) {
    try {
      const existingCustomer = await stripe.customers.retrieve(mover.stripeCustomerId);
      if (!existingCustomer.deleted) {
        return existingCustomer.id;
      }
    } catch {
      await prisma.moverCompany.update({
        where: { id: mover.id },
        data: { stripeCustomerId: null },
      });
    }
  }

  const customer = await stripe.customers.create({
    email: mover.user.email,
    name: mover.companyName,
    metadata: {
      moverCompanyId: mover.id,
    },
  });

  await prisma.moverCompany.update({
    where: { id: mover.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function getCustomerPaymentMethod(customerId: string) {
  if (!stripe) return null;

  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) return null;

  const defaultPaymentMethodId =
    typeof customer.invoice_settings.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings.default_payment_method?.id ?? null;

  let paymentMethod: Stripe.PaymentMethod | null = null;
  if (defaultPaymentMethodId) {
    const result = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
    paymentMethod = result.type === "card" ? result : result;
  }

  if (!paymentMethod) {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
      limit: 1,
    });
    paymentMethod = methods.data[0] ?? null;
  }

  return paymentMethod;
}
