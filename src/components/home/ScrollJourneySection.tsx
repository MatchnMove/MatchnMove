import Link from "next/link";
import { FileText, MessagesSquare, Truck, Sparkles } from "lucide-react";
export function ScrollJourneySection() {
  return (
    <section id="how-it-works" className="bg-white py-12 sm:py-20">
      <div className="container-shell">
        <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">
          A clear process, your choice
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
          From one request to your next move.
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              Icon: FileText,
              title: "1. Tell us about your move",
              text: "Add pickup and destination details, your preferred date and what needs moving. Requesting quotes is free.",
            },
            {
              Icon: MessagesSquare,
              title: "2. Receive and compare quotes",
              text: "Your enquiry can be shared with companies covering your route. Responses depend on availability; companies contact you directly.",
            },
            {
              Icon: Truck,
              title: "3. Choose the right mover",
              text: "Compare scope, price and terms with each company. You decide whether to book, with no obligation to accept an offer.",
            },
          ].map(({ Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 p-6"
            >
              <Icon aria-hidden="true" className="h-7 w-7 text-teal-700" />
              <h3 className="mt-4 text-xl font-semibold text-slate-950">
                {title}
              </h3>
              <p className="mt-3 leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-6 rounded-3xl bg-slate-950 p-6 text-white sm:p-10 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold text-teal-200">
              <Truck size={20} /> MOVING QUOTES <span className="mx-2">+</span>
              <Sparkles size={20} /> CLEANING QUOTES
            </p>
            <h2 className="mt-4 text-3xl font-bold">
              One move. Two things sorted.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-300">
              Organise moving and optional move-out or move-in cleaning quotes
              through one request. Choose the property to clean and the services
              you need. Cleaners receive information relevant to that property.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <Link
              className="min-h-12 rounded-xl bg-teal-300 px-5 py-3 text-center font-semibold text-slate-950"
              href="/quote?cleaning=1"
            >
              Get moving &amp; cleaning quotes
            </Link>
            <Link
              className="py-2 text-center underline underline-offset-4"
              href="/cleaning-quotes"
            >
              How cleaning quotes work
            </Link>
            <p className="text-center text-sm text-slate-300">
              Optional cleaning. Free to request. No obligation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
