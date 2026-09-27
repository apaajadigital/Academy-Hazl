import React from "react";

export function ArrowRightIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

export function CheckIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

export function CheckCircleIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function PlayIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function PlayCircleIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
    </svg>
  );
}

export function LockIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="11" width="14" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11V7a4 4 0 018 0v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function TerminalIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="4 17 10 11 4 5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="19" x2="20" y2="19" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RateReviewIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  );
}

export function NetworkHubIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v6m0 6v6M3 12h6m6 0h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VerifiedIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}
