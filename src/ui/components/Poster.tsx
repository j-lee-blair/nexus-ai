"use client";

import { useState } from "react";
import type { Movie } from "@/domain/types";
import { hueFor, initials } from "@/ui/format";
import styles from "./Poster.module.css";

interface PosterProps {
  movie: Movie;
  size: "small" | "large";
}

/**
 * The movie's poster, or a coloured tile with its initials when there is none.
 * A poster that fails to load falls back to the tile, so the answer never depends on it.
 */
export function Poster({ movie, size }: PosterProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClass = size === "large" ? styles.large : styles.small;
  const posterUrl = movie.posterUrl;

  if (posterUrl !== null && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- posters are small remote thumbnails
      <img
        className={`${styles.poster} ${sizeClass}`}
        src={posterUrl}
        alt=""
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
    );
  }

  const hue = hueFor(movie.title);
  return (
    <span
      className={`${styles.poster} ${styles.tile} ${sizeClass}`}
      style={{ "--hue": hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {initials(movie.title)}
    </span>
  );
}
