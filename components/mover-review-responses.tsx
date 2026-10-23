"use client";
import { useState } from "react";
export function MoverReviewResponses({
  reviews,
}: {
  reviews: {
    id: string;
    rating: number;
    text: string | null;
    response: string | null;
    approved: boolean;
  }[];
}) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-6 space-y-5">
      {reviews.length === 0 && <p>No reviews have been received yet.</p>}
      {reviews.map((review) => (
        <form
          key={review.id}
          className="rounded-2xl border border-slate-200 p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            const data = new FormData(e.currentTarget);
            try {
              const r = await fetch("/api/mover/review-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  reviewId: review.id,
                  response: data.get("response"),
                }),
              });
              if (!r.ok) throw Error();
              setStatus(
                "Response saved for moderation. It will appear publicly after approval.",
              );
            } catch {
              setStatus("The response could not be saved.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="font-semibold">{review.rating} / 5</p>
          <p className="mt-3 whitespace-pre-line">
            {review.text || "Rating without a written review"}
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Your factual response
            <textarea
              name="response"
              required
              minLength={10}
              maxLength={1500}
              defaultValue={review.response ?? ""}
              className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 font-normal"
            />
          </label>
          <p className="mt-2 text-sm text-slate-500">
            Avoid private customer details. Responses are moderated.{" "}
            {review.response
              ? review.approved
                ? "Current response approved."
                : "Current response awaiting review."
              : ""}
          </p>
          <button
            disabled={busy}
            className="mt-4 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            Submit response
          </button>
        </form>
      ))}
      <p role="status">{status}</p>
    </div>
  );
}
