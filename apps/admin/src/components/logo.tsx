/** IBILIM logo mark — three rounded bars. Inherits colour via `currentColor`. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1180 820"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <rect y="406.07" width="220" height="585" rx="110" transform="rotate(-45 0 406.07)" />
      <rect x="766.07" y="819.727" width="220" height="585" rx="110" transform="rotate(-135 766.07 819.727)" />
      <rect x="480" width="220" height="502" rx="110" />
    </svg>
  );
}
