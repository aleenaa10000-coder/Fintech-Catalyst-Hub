import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  size?: number;
};

export function BrandLogo({ className, size = 28 }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="116"
        height="116"
        rx="22"
        ry="22"
        fill="none"
        stroke="#001F3F"
        strokeWidth="4"
        opacity="0.08"
      />
      <rect x="22" y="76" width="18" height="30" rx="3" fill="#0074D9" />
      <rect x="51" y="58" width="18" height="48" rx="3" fill="#0074D9" />
      <rect x="80" y="34" width="18" height="72" rx="3" fill="#0074D9" />
      <line
        x1="31"
        y1="70"
        x2="60"
        y2="52"
        stroke="#001F3F"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="52"
        x2="89"
        y2="28"
        stroke="#001F3F"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="31" cy="70" r="6" fill="#001F3F" />
      <circle cx="60" cy="52" r="6" fill="#001F3F" />
      <circle cx="89" cy="28" r="8" fill="#2ECC71" />
      <circle cx="89" cy="28" r="3" fill="#FFFFFF" />
    </svg>
  );
}
