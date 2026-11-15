import Link from "next/link";
import styles from "./Wordmark.module.css";

/** "nexus" with the X in the cyan-to-magenta gradient. Links home. */
export function Wordmark() {
  return (
    <Link href="/" className={styles.wordmark} aria-label="Nexus, start a new search">
      ne<span className={styles.x}>x</span>us
    </Link>
  );
}
