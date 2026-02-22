import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function MoverDashboardPage() {
  const session = auth();
  if (!session?.user?.email) redirect("/mover/login");
  const mover = await prisma.moverCompany.findFirst({ where: { user: { email: session.user.email } }, include: { leads: { include: { quoteRequest: true } } } });
  if (!mover) return <div>No mover profile.</div>;
  return (
    <section className="min-h-screen bg-slate-100 p-6">
      <div className="container-shell grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="bg-slateBlue text-white rounded-xl p-4 space-y-4"><div className="card text-slate-900 p-4"><p className="text-2xl font-bold">{mover.companyName}</p><p className="text-green-600">Active</p></div><ul className="space-y-2 text-lg"><li>Overview</li><li>Company Profile</li><li>Documents</li><li>Pricing</li><li>Reviews</li><li>Settings</li><li className="font-semibold">Leads</li></ul></aside>
        <main className="space-y-4">
          <div className="card p-6"><h1 className="text-6xl font-black">Set up your mover profile</h1><p>Complete your profile to start receiving moving leads.</p><div className="h-4 rounded-full bg-slate-200 mt-4"><div className="h-full w-1/2 rounded-full bg-brandBlue"/></div></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5"><h2 className="text-3xl font-bold">Company details</h2><p>{mover.companyName}</p><p>NZBN: {mover.nzbn}</p><p>Years operating: {mover.yearsOperating}</p></div>
            <div className="card p-5"><h2 className="text-3xl font-bold">Contact details</h2><p>{mover.contactPerson}</p><p>{mover.phone}</p></div>
            <div className="card p-5"><h2 className="text-3xl font-bold">Add company profile picture</h2><input type="file" /></div>
            <div className="card p-5"><h2 className="text-3xl font-bold">Insurance document</h2><button className="rounded bg-brandBlue text-white px-4 py-2">Upload document</button></div>
          </div>
          <div className="card p-5"><h2 className="text-4xl font-bold">Leads</h2><div className="space-y-3 mt-4">{mover.leads.map((l)=><div key={l.id} className="border rounded p-3"><p className="font-semibold">{l.quoteRequest.fromCity} → {l.quoteRequest.toCity}</p><p>Status: {l.status}</p><p>Price: ${(l.price/100).toFixed(2)}</p>{l.status !== "PURCHASED" && <form action={`/api/mover/leads/${l.id}/unlock`} method="post"><button className="bg-accentOrange text-white px-4 py-1 rounded mt-2">Unlock lead</button></form>}</div>)}</div></div>
        </main>
      </div>
    </section>
  );
}
