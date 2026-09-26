type ProgressBarProps = {
  percent: number;
  label?: string;
  className?: string;
};

export function ProgressBar({ percent, label, className = "" }: ProgressBarProps) {
  const displayLabel = label ?? (percent === 0 ? "Belum dimulai... 0%" : `${percent}% selesai`);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <p className="text-xs text-text-muted">{displayLabel}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-default)]">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
    </div>
  );
}
