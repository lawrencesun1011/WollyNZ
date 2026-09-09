import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function ArrowUpRight(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}

export function ArrowRight(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 12h16m-7-7 7 7-7 7" />
    </svg>
  );
}

export function Heart(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20.6 4.9a5.5 5.5 0 0 0-7.8 0l-.8.8-.8-.8a5.5 5.5 0 0 0-7.8 7.8L12 21l8.6-8.3a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}

export function User(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3" />
    </svg>
  );
}

export function Close(props: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m6 6 12 12M6 18 18 6" />
    </svg>
  );
}

/** 小羊圆形线描标志：品牌主标识，也用作页脚与浏览器图标。 */
export function LambMark(props: Props) {
  return (
    <svg
      viewBox="0 0 52 52"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="26" cy="26" r="24" />
      <path d="M17 24c-5-4-9 0-5 4 1 1 3 1 5 0m18-4c5-4 9 0 5 4-1 1-3 1-5 0" />
      <path d="M17 24c-3-3-1-7 3-7 0-4 5-5 7-2 3-3 7-1 7 2 4 0 6 5 2 8l-2 9c-1 5-14 5-16 0Z" />
      <circle cx="22" cy="27" r="1" fill="currentColor" stroke="none" />
      <circle cx="30" cy="27" r="1" fill="currentColor" stroke="none" />
      <path d="m24 31 2 1 2-1m-2 1v3" />
    </svg>
  );
}
