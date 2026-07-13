import { formatBSDate } from "../utils/nepali-date";

/**
 * Shows a date in BS by default; hovering crossfades to the AD equivalent
 * for as long as the cursor stays, then fades back to BS on mouse-leave.
 * Both labels occupy the same grid cell so the swap never reflows the layout.
 */
export default function HoverADDate({ date, className = "" }) {
  if (!date) return <span className={className}>—</span>;
  return (
    <span className={`group inline-grid cursor-default align-middle ${className}`} data-testid="hover-ad-date">
      <span className="[grid-area:1/1] transition-all duration-300 ease-out group-hover:opacity-0 group-hover:-translate-y-1">
        {formatBSDate(date)}
      </span>
      <span className="[grid-area:1/1] opacity-0 translate-y-1 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0 text-blue-600 font-medium whitespace-nowrap">
        {date}
      </span>
    </span>
  );
}
