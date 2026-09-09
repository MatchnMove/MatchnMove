import Image from "next/image";
import { ArrowDown, Check, MapPin } from "lucide-react";
import { HeroQuoteCard } from "@/src/components/hero/HeroQuoteCard";
import { HeroTruckScene } from "@/src/components/hero/HeroTruckScene";
import { HeroViewport } from "@/src/components/hero/HeroViewport";
import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section data-analytics-section="homepage_hero" className={styles.hero} aria-labelledby="home-title">
      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/HeroImg.webp" alt="" fill sizes="100vw" priority className={styles.backdropImage} />
      </div>
      <HeroViewport className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}><MapPin size={14} strokeWidth={1.8} /> YOUR NEXT CHAPTER STARTS HERE</p>
            <h1 id="home-title" className={styles.title}>
              One request.<br />
              <span>Multiple quotes.</span>
            </h1>
            <p className={styles.description}>
              A fresh start. Let&apos;s get you there.
              <span>Tell us about your move once and compare quotes from moving companies across New Zealand.</span>
            </p>
            <ul className={styles.reassurance} aria-label="Why compare with Match 'n Move">
              <li><Check size={15} /> Free to compare</li>
              <li><Check size={15} /> No obligation</li>
              <li><Check size={15} /> Your move, your choice</li>
            </ul>
            <a href="#how-it-works" className={styles.howLink}>A simpler way to move <ArrowDown size={14} /></a>
          </div>
          <div className={styles.quote}><HeroQuoteCard /></div>
        </div>
        <div className={styles.scene}><HeroTruckScene /></div>
        <div className={styles.caption}>
          <span><span className={styles.statusDot} /> MADE FOR MOVES ACROSS AOTEAROA</span>
          <span className={styles.moveTypes}>Around the corner. Across the country.</span>
        </div>
      </HeroViewport>
    </section>
  );
}
