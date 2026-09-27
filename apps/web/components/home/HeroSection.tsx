import Link from "next/link";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  LockIcon,
  PlayIcon,
  VerifiedIcon,
  TerminalIcon,
} from "./HomeIcons";

export function HeroSection() {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 lg:px-8 pt-24 pb-16 lg:pt-28 lg:pb-24 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Copy & Strategic CTAs */}
        <div className="lg:col-span-6 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EDEDF4] border border-[#BFC7D0]/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2F86]"></span>
            <span className="text-[11px] font-bold tracking-widest text-[#3F484F] uppercase">
              AKSELERASI KARIER TEKNOLOGI &amp; BISNIS
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#16181D] tracking-tight leading-[1.12] mb-5">
            Kuasai Keahlian Digital Berstandar Industri Masa Depan
          </h1>

          <p className="text-base sm:text-lg text-[#5B616E] max-w-xl mb-8 leading-relaxed">
            Kurikulum langsung dari production codebase bersama lead engineer korporat terdepan. Dipandu sistem mentorship terstruktur, code review ketat, dan portofolio arsitektur riil.
          </p>

          {/* CTA Cluster */}
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
            <Link
              href="/daftar"
              className="h-12 px-7 rounded-full bg-[#36BDF2] text-[#16181D] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#72D2FF] active:scale-[0.99] transition-all shadow-sm"
            >
              <span>Mulai Belajar Sekarang</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/e-course"
              className="h-12 px-7 rounded-full bg-white text-[#16181D] border border-[#E7E9EC] text-sm font-medium inline-flex items-center justify-center hover:border-[#707880] transition-colors active:scale-[0.99]"
            >
              Lihat Silabus Lengkap
            </Link>
          </div>

          {/* Trust Enterprise Ribbon */}
          <div className="w-full pt-6 border-t border-[#E7E9EC]">
            <p className="text-[11px] font-bold tracking-wider text-[#707880] uppercase mb-3">
              ALUMNI BEKERJA DI EKOSISTEM TEKNOLOGI KORPORASI
            </p>
            <div className="flex items-center flex-wrap gap-6 sm:gap-8 text-[#5B616E] opacity-80 text-xs sm:text-sm font-bold tracking-tight">
              <span>TELKOM INDONESIA</span>
              <span>GOTO ECOSYSTEM</span>
              <span>BANK MANDIRI</span>
              <span>BUKALAPAK</span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Craft LMS Workspace Window Preview */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-[#E7E9EC] rounded-xl overflow-hidden shadow-sm">
            {/* Workspace Window Header */}
            <div className="bg-[#F6F7F9] px-4 py-3 border-b border-[#E7E9EC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#BFC7D0]"></span>
                <span className="w-3 h-3 rounded-full bg-[#BFC7D0]"></span>
                <span className="w-3 h-3 rounded-full bg-[#BFC7D0]"></span>
                <span className="ml-2 text-xs font-mono text-[#5B616E] font-medium hidden sm:inline">
                  hazl-lms / workspace / mod-04-event-broker
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-[#E7E9EC] text-[11px] font-medium text-[#0077A8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF2F86]"></span> 48 Modul Terverifikasi
                </span>
              </div>
            </div>

            {/* Workspace Inner Body */}
            <div className="grid grid-cols-1 md:grid-cols-12">
              {/* Left Sub-panel: Curriculum Tree */}
              <div className="md:col-span-5 border-r border-[#E7E9EC] bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#5B616E] font-semibold">MODUL SAAT INI</span>
                    <span className="text-xs text-[#0077A8] font-bold">68% Selesai</span>
                  </div>
                  {/* Progress Line */}
                  <div className="w-full h-1.5 bg-[#EDEDF4] rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-[#36BDF2] rounded-full" style={{ width: "68%" }}></div>
                  </div>
                  {/* Syllabus items */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-[#F6F7F9] border border-[#E7E9EC] flex items-start gap-2.5">
                      <span className="text-[#0077A8] mt-0.5 shrink-0">
                        <CheckCircleIcon className="w-4 h-4 text-[#0077A8]" />
                      </span>
                      <div>
                        <p className="text-xs text-[#16181D] font-medium leading-snug">03. Kafka Event Pipeline</p>
                        <p className="text-[10px] text-[#707880]">Passed • Code Review Disetujui</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border-l-2 border-[#0077A8] border-t border-r border-b border-[#E7E9EC] flex items-start gap-2.5">
                      <span className="text-[#0077A8] mt-0.5 shrink-0">
                        <PlayCircleIcon className="w-4 h-4 text-[#0077A8]" />
                      </span>
                      <div>
                        <p className="text-xs text-[#16181D] font-semibold leading-snug">04. Distributed Locking Redis</p>
                        <p className="text-[10px] text-[#0077A8] font-medium">Sedang Berlangsung (14:20)</p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-[#E7E9EC] opacity-60 flex items-start gap-2.5">
                      <span className="text-[#707880] mt-0.5 shrink-0">
                        <LockIcon className="w-4 h-4 text-[#707880]" />
                      </span>
                      <div>
                        <p className="text-xs text-[#16181D] font-medium leading-snug">05. Database Sharding Cluster</p>
                        <p className="text-[10px] text-[#707880]">Terkunci • Modul 04 Wajib Lulus</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mentor badge in syllabus */}
                <div className="mt-4 pt-3 border-t border-[#E7E9EC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#EDEDF4] flex items-center justify-center font-bold text-xs text-[#16181D]">
                      RK
                    </div>
                    <div>
                      <p className="text-xs text-[#16181D] font-medium">Rian Kurniawan</p>
                      <p className="text-[10px] text-[#707880]">Lead Architect • Mentoring</p>
                    </div>
                  </div>
                  <VerifiedIcon className="w-4 h-4 text-[#0077A8]" />
                </div>
              </div>

              {/* Right Sub-panel: Video Mini Canvas & Code Execution Sandbox */}
              <div className="md:col-span-7 bg-white flex flex-col">
                {/* Mini Video Player View */}
                <div className="relative bg-[#2E3036] h-44 flex items-center justify-center border-b border-[#E7E9EC] overflow-hidden">
                  <div className="text-center z-10 p-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-2 text-white cursor-pointer hover:bg-white/20 transition-colors">
                      <PlayIcon className="w-4 h-4 ml-0.5" />
                    </div>
                    <p className="text-xs font-medium text-white">Session #4: Concurrency Mutex Pattern</p>
                    <p className="text-[11px] text-gray-300">Arsitektur High-Throughput Fintech (IDR 2.4B/sec)</p>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-gray-400 font-mono">
                    <span>14:20 / 38:50</span>
                    <span className="inline-flex items-center gap-1 text-[#72D2FF]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF2F86]"></span> 1080p 60fps
                    </span>
                  </div>
                </div>

                {/* Production Code Review Block */}
                <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E7E9EC] text-[11px] font-mono text-[#707880]">
                      <span>redis_distributed_lock.go</span>
                      <span className="text-[#0077A8] font-semibold">TEST PASS: 12/12</span>
                    </div>
                    <pre className="font-mono text-[11px] sm:text-[12px] leading-relaxed text-[#3F484F] bg-[#F6F7F9] p-2.5 rounded-lg border border-[#E7E9EC] overflow-x-auto">
                      <code>
                        <span className="text-[#0077A8] font-bold">func</span> AcquireLock(ctx context.Context, key <span className="text-[#005E7D]">string</span>) <span className="text-[#005E7D]">bool</span> &#123;{"\n"}
                        {"  "}resp := redis.SetNX(ctx, key, workerID, 5*time.Second){"\n"}
                        {"  "}<span className="text-[#B80049] font-medium">if</span> !resp.Val() &#123;{"\n"}
                        {"    "}metrics.Incr(<span className="text-[#707880]">&quot;lock_contention&quot;</span>){"\n"}
                        {"    "}<span className="text-[#B80049] font-medium">return</span> <span className="text-[#0077A8]">false</span>{"\n"}
                        {"  "}&#125;{"\n"}
                        {"  "}<span className="text-[#B80049] font-medium">return</span> <span className="text-[#0077A8]">true</span>{"\n"}
                        &#125;
                      </code>
                    </pre>
                  </div>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#E7E9EC]">
                    <span className="text-[11px] text-[#707880]">Production Pipeline Sync</span>
                    <span className="text-[11px] text-[#0077A8] font-medium flex items-center gap-1">
                      <TerminalIcon className="w-3.5 h-3.5" /> Branch: main-enterprise
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
