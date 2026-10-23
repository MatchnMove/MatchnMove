import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Check, MapPin } from "lucide-react";
import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";
import { HeroTruckScene } from "@/src/components/hero/HeroTruckScene";
import { HeroViewport } from "@/src/components/hero/HeroViewport";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section
      data-analytics-section="homepage_hero"
      className={styles.hero}
      aria-labelledby="home-title"
    >
      <div className={styles.backdrop} aria-hidden="true">
        <Image
          src="/HeroImg.webp"
          alt=""
          fill
          sizes="100vw"
          priority
          className={styles.backdropImage}
        />
      </div>
      <HeroViewport className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>
              <MapPin size={14} strokeWidth={1.8} /> YOUR NEXT CHAPTER STARTS
              HERE
            </p>
            <h1 id="home-title" className={styles.title}>
              Compare moving quotes.
              <br />
              <span>Move with confidence.</span>
            </h1>
            <p className={styles.description}>
              Tell us about your move once.
              <span>
                Suitable New Zealand moving companies can respond with quotes.
                Compare your options and choose what works for you.
              </span>
            </p>
            <ul
              className={styles.reassurance}
              aria-label="Why compare with Match 'n Move"
            >
              <li>
                <Check size={15} /> Free to request quotes
              </li>
              <li>
                <Check size={15} /> No obligation
              </li>
              <li>
                <Check size={15} /> Local &amp; nationwide options
              </li>
            </ul>
            <Link
              href="/resources/moving-cost-calculator"
              className={styles.howLink}
            >
              Explore the moving cost calculator <ArrowDown size={14} />
            </Link>
          </div>
          <div className={styles.quote}>
            <HeroQuoteCard />
          </div>
        </div>
        <div className={styles.scene}>
          <HeroTruckScene />
        </div>
        <div className={styles.caption}>
          <span>
            <span className={styles.statusDot} /> MADE FOR MOVES ACROSS AOTEAROA
          </span>
          <span className={styles.moveTypes}>
            Around the corner. Across the country.
          </span>
        </div>
      </HeroViewport>
    </section>
  );
}
