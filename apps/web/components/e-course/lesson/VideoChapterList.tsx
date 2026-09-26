import { VideoChapterItem } from "./VideoChapterItem";
import type { Chapter } from "@/lib/e-course/types";

type VideoChapterListProps = {
  chapters: Chapter[];
  lessonTitle: string;
};

export function VideoChapterList({ chapters, lessonTitle }: VideoChapterListProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{lessonTitle}</h2>
        <span className="text-xs text-text-muted">{chapters.length} video</span>
      </div>
      <div className="flex flex-col gap-2">
        {chapters.map((chapter, i) => (
          <VideoChapterItem key={chapter.id} chapter={chapter} index={i} />
        ))}
      </div>
    </div>
  );
}
