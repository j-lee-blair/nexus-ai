import Link from "next/link";
import type { ErrorCode } from "@/contracts/api";
import { describeProblem } from "@/ui/problems";
import styles from "./Problem.module.css";

interface ProblemProps {
  code: ErrorCode;
  retryAfterSeconds?: number;
  /** Shown as a "Try again" button when trying again could help. */
  onRetry?: () => void;
  /** Shown as a "Search again" link, e.g. when the movie wasn't found. */
  searchHref?: string;
}

/** A plain explanation of why Nexus can't answer, and what the visitor can do next. */
export function Problem({ code, retryAfterSeconds, onRetry, searchHref }: ProblemProps) {
  const problem = describeProblem(code, retryAfterSeconds);
  const showRetry = problem.canRetry && onRetry !== undefined;

  return (
    <div className={styles.problem} role="alert">
      <p className={styles.title}>{problem.title}</p>
      <p className={styles.detail}>{problem.detail}</p>
      <div className={styles.actions}>
        {showRetry && (
          <button type="button" className={styles.primary} onClick={onRetry}>
            Try again
          </button>
        )}
        {searchHref !== undefined && (
          <Link href={searchHref} className={styles.secondary}>
            Search again
          </Link>
        )}
      </div>
    </div>
  );
}
