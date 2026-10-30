import type { Availability, Offer, OfferGroup } from "@/domain/types";
import {
  availabilitySummary,
  formatCheckedAt,
  groupLabel,
  hueFor,
  initials,
  isCheapestOffer,
  offerPriceLabel,
  priceBarPercent,
} from "@/ui/format";
import { Poster } from "./Poster";
import styles from "./AnswerView.module.css";

interface AnswerViewProps {
  availability: Availability;
  checkedAt: string;
  now: Date;
}

/**
 * The answer: where the movie is available in Sweden, as plain, accessible HTML.
 * Shows exactly what the data provider returned. The Converge reveal (F8) is laid over this
 * markup and must never change its content or order.
 */
export function AnswerView({ availability, checkedAt, now }: AnswerViewProps) {
  const movie = availability.movie;
  const summary = availabilitySummary(availability.groups);

  const details: string[] = [];
  if (movie.year !== null) {
    details.push(String(movie.year));
  }
  if (movie.originalTitle !== null && movie.originalTitle !== movie.title) {
    details.push(movie.originalTitle);
  }

  return (
    <article className={styles.answer} aria-labelledby="answer-title">
      <header className={styles.head}>
        <Poster movie={movie} size="large" />
        <div>
          <h1 id="answer-title" className={styles.title}>
            {movie.title}
          </h1>
          <p className={styles.details}>{details.join(" · ")}</p>
        </div>
      </header>

      <p className={styles.summary} data-reveal="summary">
        {summary}
      </p>

      {availability.groups.length === 0 && (
        <p className={styles.empty}>You can’t stream, rent or buy this movie in Sweden right now.</p>
      )}

      {availability.groups.map((group) => (
        <OfferGroupSection key={group.type} group={group} />
      ))}

      <footer className={styles.footer}>
        {formatCheckedAt(checkedAt, now)} · Streaming data from{" "}
        <a href="https://www.watchmode.com/" target="_blank" rel="noopener noreferrer">
          Watchmode
        </a>
      </footer>
    </article>
  );
}

function OfferGroupSection({ group }: { group: OfferGroup }) {
  const label = groupLabel(group.type);
  const headingId = `group-${group.type}`;

  return (
    <section className={styles.group} aria-labelledby={headingId} data-reveal="group">
      <h2 id={headingId} className={styles.groupTitle}>
        {label}
      </h2>
      <ul className={styles.offers}>
        {group.offers.map((offer) => (
          <li key={offer.provider.id} data-reveal="offer">
            <OfferRow offer={offer} group={group} isCheapest={isCheapestOffer(offer, group)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

interface OfferRowProps {
  offer: Offer;
  group: OfferGroup;
  isCheapest: boolean;
}

function OfferRow({ offer, group, isCheapest }: OfferRowProps) {
  const priceLabel = offerPriceLabel(offer);
  const isPaid = offer.price !== null;
  const hue = hueFor(offer.provider.name);

  const rowContent = (
    <>
      <span className={styles.chip} style={{ "--hue": hue } as React.CSSProperties} aria-hidden="true">
        {initials(offer.provider.name)}
      </span>
      <span className={styles.providerName}>{offer.provider.name}</span>
      <span className={styles.price}>{priceLabel}</span>
      {isPaid && (
        <span className={styles.meta}>
          <span
            className={styles.bar}
            style={{ "--width": `${priceBarPercent(offer, group)}%` } as React.CSSProperties}
            aria-hidden="true"
          />
          {offer.quality !== null && <span className={styles.quality}>{offer.quality}</span>}
          {isCheapest && <span className={styles.cheapest}>Cheapest</span>}
        </span>
      )}
    </>
  );

  if (offer.url === null) {
    return <div className={styles.offer}>{rowContent}</div>;
  }

  return (
    <a className={styles.offer} href={offer.url} target="_blank" rel="noopener noreferrer">
      {rowContent}
      <span className="visually-hidden"> (opens {offer.provider.name} in a new tab)</span>
    </a>
  );
}
