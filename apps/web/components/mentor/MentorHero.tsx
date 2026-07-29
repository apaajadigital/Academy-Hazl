import { Star, Users, Clock, ExternalLink } from "lucide-react";
import type { Mentor } from "@/lib/e-course/types";

type MentorHeroProps = {
  mentor: Mentor;
};

export function MentorHero({ mentor }: MentorHeroProps) {
  const initials = mentor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <section className="bg-gradient-to-b from-[rgba(0,119,168,0.05)] to-[#F5F5F7] border-b border-[#E5E5E5]">
      {/* pt-28 clears the fixed Navbar (h-16 md:h-[4.5rem]); the (public) layout
          adds no top offset, so each hero owns its own navbar clearance
          (mirrors the /mentor listing's pt-24 and ECourseHero's pt-16). */}
      <div className="max-w-[1152px] mx-auto px-8 pt-28 pb-12">
        <div className="flex flex-col sm:flex-row gap-8 items-start">

          {/* Avatar */}
          <div className="flex-none w-24 h-24 rounded-2xl bg-[rgba(0,212,255,0.08)] border border-[rgba(0,119,168,0.2)] flex items-center justify-center shadow-e1">
            <span className="text-[#0077A8] font-bold font-display text-3xl">{initials}</span>
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-bold font-display">{mentor.name}</h1>
              <p className="text-[#6E6E73] text-sm mt-1">
                {mentor.role} · <span className="text-[#0077A8]">{mentor.company}</span>
              </p>
            </div>

            <p className="text-[#636366] text-sm leading-relaxed max-w-2xl">
              {mentor.bio}
            </p>

            {/* Stats */}
            <div className="flex gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#0077A8]" />
                <div>
                  <p className="text-[#1D1D1F] font-bold text-sm">{mentor.totalStudents}</p>
                  <p className="text-[#6E6E73] text-xs">Total Pelajar</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <div>
                  <p className="text-[#1D1D1F] font-bold text-sm">{mentor.avgRating.toFixed(2)}</p>
                  <p className="text-[#6E6E73] text-xs">Rating Rata-rata</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#0077A8]" />
                <div>
                  <p className="text-[#1D1D1F] font-bold text-sm">{mentor.teachingHours}+</p>
                  <p className="text-[#6E6E73] text-xs">Jam Mengajar</p>
                </div>
              </div>
            </div>

            {/* Socials */}
            {mentor.linkedinUrl && (
              <a
                href={mentor.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-[#6E6E73] hover:text-[#0077A8] transition-colors"
              >
                <ExternalLink size={14} />
                LinkedIn Profile
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
