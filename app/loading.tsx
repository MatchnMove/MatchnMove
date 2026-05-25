import Image from "next/image";

export default function Loading() {
  return (
    <main className="match-loading-screen" aria-busy="true" aria-live="polite">
      <div className="match-loading-grid" aria-hidden="true" />
      <section className="match-loading-panel">
        <div className="match-loading-logo-wrap">
          <Image src="/logo-mark.png" alt="" width={66} height={66} className="match-loading-logo" priority />
          <span className="match-loading-pulse" aria-hidden="true" />
        </div>

        <div className="match-loading-copy">
          <p className="match-loading-kicker">Match &apos;n Move</p>
          <h1>Getting your move ready</h1>
          <p>Finding the clearest path from quote request to moving day.</p>
        </div>

        <div className="match-loading-route" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="match-loading-bar" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
