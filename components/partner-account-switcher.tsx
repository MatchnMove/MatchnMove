"use client";

import { useId, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, ChevronLeft, ChevronRight, FileText, MapPin, Sparkles, Truck } from "lucide-react";
import { cx } from "@/lib/utils";
import styles from "./partner-account-switcher.module.css";

export type PartnerAccessMode = "login" | "signup";
type BusinessType = "mover" | "cleaner";

const businessTypes = [
  {
    id: "mover", icon: Building2, name: "Moving", copy: "Create a mover account",
    image: "/images/partner-access/moving-truck.png",
    features: [
      { icon: Truck, label: "Manage your movers" },
      { icon: MapPin, label: "Showcase service areas" },
      { icon: FileText, label: "Receive and manage leads" },
    ],
  },
  {
    id: "cleaner", icon: Sparkles, name: "Cleaning", copy: "Create a cleaner account",
    image: "/images/partner-access/cleaning-spray.png",
    features: [
      { icon: Sparkles, label: "Manage your cleaners" },
      { icon: MapPin, label: "Showcase service areas" },
      { icon: FileText, label: "Receive and manage leads" },
    ],
  },
] as const;

function accountHref(business: BusinessType, mode: PartnerAccessMode) {
  return business === "mover"
    ? `/mover/login?mode=${mode}`
    : mode === "signup" ? "/cleaner/register" : "/cleaner/login";
}

export function PartnerAccountSwitcher({ active, mode, onModeChange, className }: {
  active: BusinessType;
  mode: PartnerAccessMode;
  onModeChange?: (mode: PartnerAccessMode) => void;
  className?: string;
}) {
  const router = useRouter();
  const headingId = useId();
  const descriptionId = useId();

  function selectBusiness(business: BusinessType) {
    if (business !== active) {
      router.push(accountHref(business, mode), { scroll: false });
    }
  }

  function switchBusiness() {
    selectBusiness(active === "mover" ? "cleaner" : "mover");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextBusiness = event.key === "Home" ? "mover"
      : event.key === "End" ? "cleaner"
      : active === "mover" ? "cleaner" : "mover";
    selectBusiness(nextBusiness);
  }

  return (
    <section className={cx(styles.selector, className)} aria-labelledby={headingId}>
      <div className={styles.header}>
        <div className={styles.intro}>
          <p id={headingId} className={styles.eyebrow}>Choose your business type</p>
          <p id={descriptionId} className={styles.description}>
            Movers and cleaners have separate accounts and dashboards.
          </p>
        </div>
        <p className={styles.partnerAccess}>
          Match &apos;n Move<br />
          <span>partner access <ArrowRight aria-hidden="true" /></span>
        </p>
      </div>

      <div className={styles.carousel}>
        <button type="button" className={cx(styles.arrow, styles.previous)} onClick={switchBusiness} aria-label="Previous business type">
          <ChevronLeft aria-hidden="true" />
        </button>
        <div role="radiogroup" aria-labelledby={headingId} aria-describedby={descriptionId} className={styles.cards} onKeyDown={handleKeyDown}>
          {businessTypes.map(({ id, icon: Icon, name, copy, image, features }) => {
            const selected = active === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${name} company`}
                tabIndex={selected ? 0 : -1}
                className={cx(styles.businessCard, id === "mover" ? styles.mover : styles.cleaner)}
                data-selected={selected}
                onClick={() => selectBusiness(id)}
              >
                <span className={styles.cardWash} aria-hidden="true" />
                <span className={styles.iconTile}><Icon aria-hidden="true" /></span>
                <span className={styles.selectedBadge} aria-hidden="true"><Check /> Selected</span>
                <span className={styles.cardHeading}>{name}<br />company</span>
                <span className={styles.cardCopy}>{copy}</span>
                <Image src={image} width={240} height={240} alt="" sizes="(max-width: 480px) 112px, 150px" className={styles.illustration} />
                <span className={styles.features}>
                  {features.map(({ icon: FeatureIcon, label }) => (
                    <span key={label} className={styles.feature}><FeatureIcon aria-hidden="true" /><span>{label}</span></span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className={cx(styles.arrow, styles.next)} onClick={switchBusiness} aria-label="Next business type">
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className={styles.indicators} aria-label="Business type carousel controls">
        {businessTypes.map(({ id, name }) => (
          <button key={id} type="button" className={styles.indicator} aria-label={`Select ${name.toLowerCase()} company`} aria-pressed={active === id} onClick={() => selectBusiness(id)}>
            <span />
          </button>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.eyebrow}>I want to</p>
        <nav className={styles.actions} aria-label="Choose sign up or log in">
          {(["signup", "login"] as const).map((nextMode) => {
            const label = nextMode === "signup" ? "Create an account" : "Log in";
            const actionClass = cx(styles.action, nextMode === "signup" ? styles.createAccount : styles.logIn);
            return onModeChange ? (
              <button key={nextMode} type="button" onClick={() => onModeChange(nextMode)} className={actionClass} aria-pressed={mode === nextMode}>
                {label}
              </button>
            ) : (
              <Link key={nextMode} href={accountHref(active, nextMode)} className={actionClass} aria-current={mode === nextMode ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
