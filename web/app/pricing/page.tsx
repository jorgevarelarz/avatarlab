"use client";

import { useState } from "react";

const plans = [
  { id: "price_starter", name: "Starter",  price: "9€",  minutes: 30,  color: "#4d7cff" },
  { id: "price_pro",     name: "Pro",       price: "29€", minutes: 120, color: "#a855f7", popular: true },
  { id: "price_studio",  name: "Studio",    price: "79€", minutes: 400, color: "#22d3ee" },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(priceId: string) {
    setLoading(priceId);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });
    const { url } = await res.json() as { url: string };
    window.location.href = url;
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0e1c", color: "#f4f6fb", fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Planes</h1>
        <p style={{ textAlign: "center", color: "#8b95b0", marginBottom: "3rem" }}>
          Pago único · Sin suscripción · Los créditos no caducan
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              borderRadius: 16, padding: "2rem",
              border: `1px solid ${plan.popular ? plan.color : "#1e2440"}`,
              background: plan.popular ? `rgba(168,85,247,0.06)` : "rgba(255,255,255,0.02)",
              position: "relative",
            }}>
              {plan.popular && (
                <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20 }}>
                  MÁS POPULAR
                </div>
              )}
              <div style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: 4, color: plan.color }}>{plan.price}</div>
              <div style={{ color: "#8b95b0", marginBottom: "1.5rem", fontSize: 14 }}>{plan.minutes} minutos de vídeo</div>
              <div style={{ color: "#8b95b0", fontSize: 13, marginBottom: "1.5rem", lineHeight: 1.7 }}>
                ≈ {Math.round(plan.minutes / 15)} lecciones de 15 min<br />
                ~{(plan.price.replace("€","") as string)} / {plan.minutes} min = {(parseFloat(plan.price) / plan.minutes).toFixed(2)}€/min
              </div>
              <button
                onClick={() => checkout(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: "100%", height: 44, borderRadius: 10, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg, ${plan.color}, ${plan.color}99)`,
                  color: "#fff", fontWeight: 600, fontSize: 15,
                }}
              >
                {loading === plan.id ? "Abriendo…" : "Comprar"}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", marginTop: "2rem", color: "#4a5270", fontSize: 13 }}>
          ¿Necesitas más volumen o API propia? Escríbenos a info@avatarlab.ai
        </p>
      </div>
    </main>
  );
}
