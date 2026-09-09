import type { CSSProperties } from "react";
import styles from "./reference-artwork.module.css";

/** Windows into the user-approved artwork; all page text remains live HTML. */
const artworkRegions = {
  villa: {
    image: "accommodation-atlas.png", canvas: [1374, 1145],
    x: 738, y: 98, width: 588, height: 405,
  },
  conversation: {
    image: "community-desktop-atlas.png", canvas: [1374, 1145],
    x: 967, y: 108, width: 332, height: 195,
  },
  communityLamb: {
    image: "community-desktop-atlas.png", canvas: [1374, 1145],
    x: 82, y: 884, width: 271, height: 125,
  },
  communityLambMobile: {
    image: "community-mobile-atlas.png", canvas: [836, 1881],
    x: 56, y: 1624, width: 170, height: 110,
  },
  school: {
    image: "homepage-v13-atlas.png", canvas: [1106, 1422],
    x: 386, y: 790, width: 335, height: 153,
  },
} as const;

type ArtworkName = keyof typeof artworkRegions;

export function ReferenceArtwork({ name, className = "" }: {
  name: ArtworkName;
  className?: string;
}) {
  const { image, canvas, x, y, width, height } = artworkRegions[name];
  const [canvasWidth, canvasHeight] = canvas;
  const style = {
    aspectRatio: `${width} / ${height}`,
    backgroundImage: `url('/images/${image}')`,
    backgroundSize: `${canvasWidth / width * 100}% ${canvasHeight / height * 100}%`,
    backgroundPosition: `${x / (canvasWidth - width) * 100}% ${y / (canvasHeight - height) * 100}%`,
  } satisfies CSSProperties;

  return <span className={`${styles.art} ${styles[name]} ${className}`} style={style} aria-hidden="true" />;
}
