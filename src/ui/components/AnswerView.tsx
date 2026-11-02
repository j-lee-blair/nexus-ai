import type { Availability, Movie, Offer, OfferGroup } from "@/domain/types";
import {
  availabilitySummary,
  formatCheckedAt,
  groupLabel,
  hueFor,
  initials,
  isCheapestOffer,
  movieDetails,
  offerPriceLabel,
  priceBarPercent,
} from "@/ui/format";
import { decodes, revealPart, streamLanding } from "@/ui/reveal/markers";
import { Poster } from "./Poster";
import styles from "./AnswerView.module.css";

interface AnswerViewProps {
  availability: Availability;
  checkedAt: string;
  now: Date;
}

interface MovieHeaderProps {
  movie: Movie;
  /** Lets the answer screen move keyboard focus to the title after a movie is picked. */
  titleRef?: React.Ref<HTMLHeadingElement>;
}

/**
 * The movie's poster, title and year. Static: the visitor already picked this movie, so it is
 * shown straight away and never part of the reveal.
 */
export function MovieHeader({ movie, titleRef }: MovieHeaderProps) {
  return (
    <header className={styles.head}>
      <Poster movie={movie} size="large" />
      <div>
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>
          {movie.title}
        </h1>
        <p className={styles.details}>{movieDetails(movie)}</p>
      </div>
    </header>
  );
}

/**
 * The answer: where the movie is available in Sweden, as plain, accessible HTML.
 * Shows exactly what the data provider returned. The Converge reveal (src/ui/reveal) is laid
 * over this markup and never changes its content or order. It finds its targets through the
 * marks from src/ui/reveal/markers.ts: revealPart (what to hide and show), decodes (text that
 * decodes from glyphs) and streamLanding (where an offer's stream lands).
 */
export function AnswerView({ availability, checkedAt, now }: AnswerViewProps) {
  const summary = availabilitySummary(availability.groups);

  return (
    <section className={styles.answer} aria-label="Where to watch in Sweden">

      <p className={styles.summary} {...revealPart("heading")} {...decodes}>
        {summary}
      </p>

      {availability.groups.length === 0 && (
        <p className={styles.empty} {...revealPart("heading")}>
          You can’t stream, rent or buy this movie in Sweden right now.
        </p>
      )}

      {availability.groups.map((group) => (
        <OfferGroupSection key={group.type} group={group} />
      ))}

      <footer className={styles.footer} {...revealPart("footer")}>
        {formatCheckedAt(checkedAt, now)} · Streaming data from{" "}
        <a href="https://www.watchmode.com/" target="_blank" rel="noopener noreferrer">
          Watchmode
        </a>
      </footer>
    </section>
  );
}

function OfferGroupSection({ group }: { group: OfferGroup }) {
  const label = groupLabel(group.type);
  const headingId = `group-${group.type}`;

  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.groupTitle} {...revealPart("heading")} {...decodes}>
        {label}
      </h2>
      <ul className={styles.offers}>
        {group.offers.map((offer) => (
          <li key={offer.provider.id} {...revealPart("offer")}>
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
      <span
        className={styles.chip}
        style={{ "--hue": hue } as React.CSSProperties}
        {...streamLanding(hue)}
        aria-hidden="true"
      >
        {initials(offer.provider.name)}
      </span>
      <span className={styles.providerName} {...decodes}>
        {offer.provider.name}
      </span>
      <span className={styles.price} {...decodes}>
        {priceLabel}
      </span>
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
