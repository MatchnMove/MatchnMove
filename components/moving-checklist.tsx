"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  CHECKLIST_TASKS,
  checklistDate,
  parseChecklist,
} from "@/lib/moving-checklist";
import { trackAnalyticsEvent } from "@/lib/analytics";
const KEY = "mm_moving_checklist_v1";
export function MovingChecklist() {
  const savedSignature = useRef("");
  const [date, setDate] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(KEY);
        const saved = parseChecklist(raw);
        if (saved) {
          savedSignature.current = JSON.stringify([saved.date, saved.done]);
          setDate(saved.date);
          setDone(saved.done);
          trackAnalyticsEvent("checklist_revisited", { source: "checklist" });
        } else if (raw) localStorage.removeItem(KEY);
      } catch {
        setStorageError(true);
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || (!date && !done.length)) return;
    const signature = JSON.stringify([date, done]);
    if (signature === savedSignature.current) return;
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          date,
          done,
          expiresAt: Date.now() + 90 * 86400000,
        }),
      );
      savedSignature.current = signature;
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [date, done, ready]);
  function exportList() {
    const text = [
      "My moving checklist",
      date ? "Moving date: " + date : "Date not confirmed",
      "",
      ...CHECKLIST_TASKS.map(
        (t) =>
          (done.includes(t.id) ? "[x] " : "[ ] ") +
          t.text +
          (date ? " \u00b7 " + checklistDate(date, t.days) : ""),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-moving-checklist.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="container-shell my-10 max-w-4xl print:my-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="font-semibold text-teal-700">Your personal plan</p>
        <h2 className="mt-3 text-3xl font-bold">Make the checklist yours.</h2>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          No account required. Only your moving date and completed task IDs are
          saved on this browser, for 90 days after your last change. No address
          or contact details are stored here.
        </p>
        <label className="mt-5 block font-semibold">
          Moving date (optional)
          <input
            type="date"
            className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 p-3 sm:w-72"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              trackAnalyticsEvent("checklist_started", { source: "checklist" });
            }}
          />
        </label>
        <p className="mt-4 font-semibold" role="status">
          {done.length} of {CHECKLIST_TASKS.length} complete
        </p>
        <progress
          className="mt-3 h-3 w-full accent-teal-700"
          max={CHECKLIST_TASKS.length}
          value={done.length}
          aria-label="Checklist progress"
        />
        {Array.from(new Set(CHECKLIST_TASKS.map((t) => t.group))).map(
          (group) => (
            <fieldset className="mt-7" key={group}>
              <legend className="text-lg font-bold">{group}</legend>
              <div className="mt-3 space-y-3">
                {CHECKLIST_TASKS.filter((t) => t.group === group).map(
                  (task) => (
                    <div
                      className="flex items-start gap-3 rounded-xl bg-slate-50 p-4"
                      key={task.id}
                    >
                      <input
                        id={"check-" + task.id}
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
                        checked={done.includes(task.id)}
                        onChange={(e) => {
                          setDone((current) =>
                            e.target.checked
                              ? [...current, task.id]
                              : current.filter((v) => v !== task.id),
                          );
                          trackAnalyticsEvent("checklist_started", {
                            source: "checklist",
                          });
                        }}
                      />
                      <div>
                        <label
                          className={
                            "cursor-pointer leading-7 " +
                            (done.includes(task.id)
                              ? "text-slate-500 line-through"
                              : "text-slate-800")
                          }
                          htmlFor={"check-" + task.id}
                        >
                          {task.text}
                        </label>
                        {date && (
                          <p className="text-sm text-slate-500">
                            Plan for {checklistDate(date, task.days)}
                          </p>
                        )}
                        {"href" in task && (
                          <Link
                            className="mt-1 inline-block py-1 text-sm font-semibold text-teal-700 underline"
                            href={task.href}
                          >
                            Open tool
                          </Link>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </fieldset>
          ),
        )}
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            onClick={exportList}
            className="min-h-11 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white"
          >
            Export checklist
          </button>
          <button
            className="min-h-11 px-3 text-sm underline"
            onClick={() => {
              setDate("");
              setDone([]);
              try {
                localStorage.removeItem(KEY);
              } catch {}
            }}
          >
            Clear checklist
          </button>
        </div>
        {storageError && (
          <p role="status" className="mt-4 text-sm">
            Browser saving is unavailable. Export your checklist to keep a copy.
          </p>
        )}
      </div>
    </section>
  );
}
