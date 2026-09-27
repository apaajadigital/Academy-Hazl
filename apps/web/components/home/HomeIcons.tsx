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

export function StarIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 20 20" fill="currentColor">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export function ClapperboardIcon({ className = "w-5 h-5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.296 3.464l3.02 3.956M20.2 6L3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3zM3 11h18v8a2 2 0 01-2 2H5a2 2 0 01-2-2zM6.18 5.276l3.1 3.899" />
    </svg>
  );
}

export function LayoutTemplateIcon({ className = "w-5 h-5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="7" rx="1" />
      <rect x="3" y="14" width="9" height="7" rx="1" />
      <rect x="16" y="14" width="5" height="7" rx="1" />
    </svg>
  );
}

export function WalletIcon({ className = "w-5 h-5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7V4a1 1 0 00-1-1H5a2 2 0 000 4h15a1 1 0 011 1v4h-3a2 2 0 000 4h3a1 1 0 001-1v-2a1 1 0 00-1-1M3 5v14a2 2 0 002 2h15a1 1 0 001-1v-4" />
    </svg>
  );
}

export function RadioIcon({ className = "w-5 h-5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.247 7.761a6 6 0 010 8.478M19.075 4.933a10 10 0 010 14.134M4.925 19.067a10 10 0 010-14.134M7.753 16.239a6 6 0 010-8.478" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

export function AwardIcon({ className = "w-5 h-5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.477 12.89l1.515 8.526a.5.5 0 01-.81.47l-3.58-2.687a1 1 0 00-1.197 0l-3.586 2.686a.5.5 0 01-.81-.469l1.514-8.526" />
      <circle cx="12" cy="8" r="6" />
    </svg>
  );
}

export function SparklesIcon({ className = "w-4 h-4", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

export function ClockIcon({ className = "w-3.5 h-3.5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
    </svg>
  );
}

export function UsersIcon({ className = "w-3.5 h-3.5", "aria-hidden": ariaHidden = true }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg className={className} aria-hidden={ariaHidden} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M16 3.128a4 4 0 010 7.744M22 21v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8z" />
    </svg>
  );
}
