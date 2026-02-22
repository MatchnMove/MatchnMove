"use client";

import { Nav } from "@/components/site-shell";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function MoverLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/mover/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) return setError("Invalid credentials");
    router.push("/mover/dashboard");
  };

  return (
    <>
      <Nav />
      <section className="min-h-screen bg-slate-100 py-12">
        <div className="container-shell">
          <h1 className="text-6xl font-bold mb-8">Movers <span className="text-brandBlue">Login</span></h1>
          <form onSubmit={onSubmit} className="card max-w-2xl p-8 space-y-4">
            <input required className="w-full border p-3 rounded" placeholder="Email address" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="password" className="w-full border p-3 rounded" placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <a className="text-brandBlue" href="#">Forgot password</a>
            <button className="w-full rounded bg-brandBlue text-white py-3">Log in</button>
            {error && <p className="text-red-600">{error}</p>}
          </form>
        </div>
      </section>
    </>
  );
}
