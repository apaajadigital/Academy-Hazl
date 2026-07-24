import { Award, ExternalLink, Users, Calendar } from "lucide-react";

type ActionButtonsProps = {
  isLocked?: boolean;
};

const actions = [
  { icon: Award, label: "Dapatkan Sertifikat" },
  { icon: ExternalLink, label: "Upload ke LinkedIn" },
  { icon: Users, label: "Join Komunitas" },
  { icon: Calendar, label: "Atur Jadwal Belajar" },
];

export function ActionButtons({ isLocked = true }: ActionButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map(({ icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          disabled={isLocked}
          className={[
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all duration-200",
            isLocked
              ? "cursor-not-allowed border-border-default bg-surface-sunken text-[#AEAEB2]"
              : "border-border-default bg-surface-card text-text-secondary shadow-e1 hover:border-[var(--border-brand)] hover:text-accent",
          ].join(" ")}
        >
          <Icon size={14} className="flex-none" aria-hidden="true" />
          <span className="leading-tight">{label}</span>
        </button>
      ))}
    </div>
  );
}
