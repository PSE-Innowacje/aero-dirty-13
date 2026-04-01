/**
 * PSE (Polskie Sieci Elektroenergetyczne) official logo as inline SVG.
 * Gradient: navy #003063 → red #C90C0F with thick underline bar.
 * Source: https://upload.wikimedia.org/wikipedia/en/9/90/PSE_logo.svg
 *
 * Uses namespaced gradient IDs to allow multiple instances on the same page.
 */

interface PseLogoProps {
  height?: number;
  className?: string;
  id?: string;
}

export function PseLogo({ height = 24, id = "pse" }: PseLogoProps) {
  const gA = `${id}-a`;
  const gB = `${id}-b`;
  const gC = `${id}-c`;

  return (
    <svg
      height={height}
      viewBox="0 0 13.071826 4.8923228"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <linearGradient id={gA}>
        <stop offset="0" stopColor="#003063" />
        <stop offset=".380005" stopColor="#003063" />
        <stop offset=".699997" stopColor="#723248" />
        <stop offset=".919998" stopColor="#c90c0f" />
        <stop offset="1" stopColor="#c90c0f" />
      </linearGradient>
      <linearGradient
        id={gB}
        gradientTransform="matrix(36.312429 0 0 -9.3131331 1155.2628 765.02838)"
        gradientUnits="userSpaceOnUse"
        spreadMethod="pad"
        x1="0" x2="1" y1="0" y2="0"
        xlinkHref={`#${gA}`}
      />
      <linearGradient
        id={gC}
        gradientTransform="matrix(36.312429 0 0 -1.6933902 1155.2628 757.40596)"
        gradientUnits="userSpaceOnUse"
        spreadMethod="pad"
        x1="0" x2="1" y1="0" y2="0"
        xlinkHref={`#${gA}`}
      />
      {/* Underline bar */}
      <path
        d="m1190.719 758.254h-34.592s-.01 0-.016 0c-.468 0-.847-.379-.847-.846 0-.468.379-.846.847-.846h.016 34.593c.468 0 .846.378.846.846 0 .467-.378.846-.846.846z"
        fill={`url(#${gC})`}
        transform="matrix(.35277777 0 0 -.35277777 -407.418461 271.658286)"
      />
      {/* PSE letters */}
      <path
        d="m1180.903 769.68c-.468 0-.848-.379-.848-.846 0-.468.38-.847.848-.847h9.817c.468 0 .846.379.846.847 0 .467-.378.846-.846.846zm-10.748 0c-1.067-.001-1.989-.608-2.446-1.495-.192-.377-.303-.804-.303-1.255 0-.453.111-.88.303-1.256.457-.886 1.379-1.494 2.445-1.495h6.074c.585-.001 1.058-.475 1.058-1.06 0-.552-.42-1.005-.958-1.056h-8.077-.001c-.031 0-.062-.002-.092-.006-.424-.045-.755-.404-.755-.841 0-.467.38-.846.847-.846h7.913c1.067 0 1.992.607 2.448 1.496.193.376.304.802.304 1.255 0 .452-.111.879-.304 1.254-.456.888-1.378 1.494-2.443 1.497h-6.172c-.537.051-.959.503-.959 1.055 0 .586.476 1.06 1.061 1.06.001 0 .001 0 0 0h2.601 5.373c.468 0 .848.379.848.847 0 .467-.38.846-.848.846h-7.915zm-14.044 0c-.467 0-.845-.377-.847-.844v-.005c0-.466.38-.844.847-.844h5.374 2.6c.586 0 1.061-.474 1.061-1.06 0-.552-.421-1.005-.959-1.055h-2.704-4.528-.846c-.031 0-.062-.003-.093-.005-.423-.047-.752-.404-.754-.84v-3.811c0-.467.379-.846.847-.846.467 0 .846.379.846.846v2.963h7.067c1.067 0 1.991.608 2.448 1.495.193.376.303.803.303 1.256 0 .451-.11.878-.303 1.255-.456.887-1.38 1.494-2.445 1.495h-7.916zm34.608-3.808h-9.816c-.468 0-.848-.379-.848-.847v-3.795c0-.005 0-.008 0-.014 0-.467.38-.846.848-.846h9.817c.468 0 .846.379.846.846 0 .467-.378.847-.846.847h-.001-8.97v2.116h8.971c.468 0 .846.379.846.846 0 .468-.378.847-.846.847z"
        fill={`url(#${gB})`}
        transform="matrix(.35277777 0 0 -.35277777 -407.418461 271.658286)"
      />
    </svg>
  );
}
