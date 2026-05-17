import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLANS: Record<string, { credits: number; name: string }> = {
  price_starter: { credits: 30,  name: "Starter — 30 min" },
  price_pro:     { credits: 120, name: "Pro — 120 min" },
  price_studio:  { credits: 400, name: "Studio — 400 min" },
};

export async function POST(req: NextRequest) {
  const { priceId, email } = await req.json() as { priceId: string; email?: string };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    metadata: { priceId, credits: String(PLANS[priceId]?.credits ?? 0) },
    success_url: `${siteUrl}/?success=1`,
    cancel_url:  `${siteUrl}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
