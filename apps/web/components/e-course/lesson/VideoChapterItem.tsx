import { Lock, Play } from "lucide-react";
import type { Chapter } from "@/lib/e-course/types";
import { formatDurationShort } from "@/lib/e-course/utils";

type VideoChapterItemProps = {
  chapter: Chapter;
  index: number;
};

export function VideoChapterItem({ chapter, index }: VideoChapterItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-card p-3 shadow-e1 transition-colors hover:border-[var(--border-brand)]">
      {/* Index */}
      <span className="w-6 flex-none text-center font-mono text-xs text-[#AEAEB2]">
        {(index + 1).toString().padStart(2, "0")}
      </span>

      {/* Thumbnail */}
      <div className="flex aspect-video w-20 flex-none items-center justify-center rounded-md border border-border-default bg-gradient-to-br from-[rgba(0,119,168,0.06)] to-[rgba(0,119,168,0.02)]">
        {chapter.isLocked ? (
          <Lock size={12} className="text-[#AEAEB2]" aria-hidden="true" />
        ) : (
          <Play size={12} className="text-accent" aria-hidden="true" />
        )}
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm leading-snug text-text-secondary">{chapter.title}</p>
      </div>

      {/* Duration + lock */}
      <div className="flex flex-none items-center gap-2">
        <span className="font-mono text-xs text-[#AEAEB2]">
          {formatDurationShort(chapter.durationMinutes)}
        </span>
        {chapter.isLocked && (
          <Lock size={12} className="text-[#AEAEB2]" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
