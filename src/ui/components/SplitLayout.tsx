import styles from "./SplitLayout.module.css";

interface SplitLayoutProps {
  search: React.ReactNode;
  /** The answer for the picked movie, or null on the search page before a movie is picked. */
  answer: React.ReactNode | null;
}

/**
 * Places search and answer for every screen size (docs/features.md, F14). From 768px wide they
 * sit side by side. On a phone only one shows: the answer when a movie is open, otherwise search.
 * Plain CSS decides, so the page looks right from its first paint.
 */
export function SplitLayout({ search, answer }: SplitLayoutProps) {
  if (answer === null) {
    return (
      <div className={styles.layout}>
        <div className={styles.searchColumn}>{search}</div>
        <div className={`${styles.answerPane} ${styles.hiddenOnPhone}`}>
          <p className={styles.emptyPane}>Pick a movie to see where it streams in Sweden.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={`${styles.searchColumn} ${styles.hiddenOnPhone}`}>{search}</div>
      <div className={styles.answerPane}>{answer}</div>
    </div>
  );
}
