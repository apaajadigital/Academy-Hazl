import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🎬 Seeding Hazl Academy Video AI Creator catalog...");

  // 1. Categories
  const categories = [
    { name: "Dasar Prompt", slug: "dasar-prompt", sortOrder: 1 },
    { name: "Text & Image to Video", slug: "image-to-video", sortOrder: 2 },
    { name: "Editing & Post-Produksi", slug: "editing-postpro", sortOrder: 3 },
    { name: "Iklan & UGC", slug: "iklan-ugc", sortOrder: 4 },
    { name: "Motion & Animasi", slug: "motion-animasi", sortOrder: 5 },
    { name: "Suara & Musik AI", slug: "suara-musik-ai", sortOrder: 6 },
    { name: "Bisnis Kreator", slug: "bisnis-kreator", sortOrder: 7 },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const record = await prisma.courseCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`✓ ${categories.length} categories upserted`);

  // 2. Trainers
  const trainers = [
    { email: "galih@hazl.id", name: "Galih Saputra" },
    { email: "sinta@hazl.id", name: "Sinta Maharani" },
    { email: "bayu@hazl.id", name: "Bayu Pratama" },
  ];

  const trainerMap = new Map<string, string>();
  for (const t of trainers) {
    const randomPassword = randomBytes(24).toString("base64url");
    const record = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name },
      create: {
        email: t.email,
        name: t.name,
        passwordHash: await bcrypt.hash(randomPassword, 12),
        isVerified: true,
        isActive: true,
        authProvider: "local",
        roles: { create: { role: "trainer" } },
      },
    });
    trainerMap.set(t.name, record.id);
  }
  console.log(`✓ ${trainers.length} video AI trainers upserted`);

  // 3. Courses
  const publishedAt = new Date();
  const courses = [
    {
      slug: "kling-ai-video-ads",
      title: "Kling AI: Bikin Video Iklan Sinematik untuk Brand",
      shortDesc: "Prompt engineering, camera movements, dan sinkronisasi audio untuk video komersial brand.",
      description: "Pelajari cara memproduksi video komersial berkualitas agensi menggunakan Kling AI 1.5. Mulai dari penyusunan visual prompt, pemilihan sudut kamera, efek slow motion, hingga export 4K dan integrasi audio.",
      level: "beginner",
      price: 349000,
      salePrice: 249000,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-agensi.webp",
      totalDuration: 720,
      totalLessons: 24,
      totalEnrolled: 412,
      avgRating: 4.9,
      totalReviews: 86,
      isFeatured: true,
      categoryId: categoryMap.get("iklan-ugc"),
      trainerId: trainerMap.get("Galih Saputra")!,
    },
    {
      slug: "midjourney-runway-gen3",
      title: "Midjourney v6 ke Runway Gen-3: Dari Stills ke Motion",
      shortDesc: "Workflow konsistensi karakter, multi-shot visual storytelling, dan upscale 4K.",
      description: "Panduan lengkap merangkai karakter konsisten dari Midjourney v6 dan menganimasikannya secara dinamis lewat Runway Gen-3 Alpha. Cocok untuk kreator film pendek, teaser iklan, dan portofolio visual.",
      level: "intermediate",
      price: 399000,
      salePrice: 299000,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-etika.webp",
      totalDuration: 900,
      totalLessons: 32,
      totalEnrolled: 640,
      avgRating: 4.8,
      totalReviews: 120,
      isFeatured: true,
      categoryId: categoryMap.get("image-to-video"),
      trainerId: trainerMap.get("Sinta Maharani")!,
    },
    {
      slug: "ugc-video-ai-umkm",
      title: "Paket Konten Bulanan & UGC Video AI untuk UMKM",
      shortDesc: "Produksi 30 video produk dalam seminggu untuk TikTok Shop & Shopee Video.",
      description: "Formula praktis monetisasi video AI dengan menawarkan jasa paket konten video bulanan ke brand UMKM. Termasuk template script, hook 3 detik, dan workflow render massal.",
      level: "beginner",
      price: 299000,
      salePrice: 199000,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-umkm.webp",
      totalDuration: 480,
      totalLessons: 18,
      totalEnrolled: 310,
      avgRating: 4.9,
      totalReviews: 54,
      isFeatured: true,
      categoryId: categoryMap.get("bisnis-kreator"),
      trainerId: trainerMap.get("Bayu Pratama")!,
    },
    {
      slug: "comfyui-video-animation",
      title: "ComfyUI & AnimateDiff: Kontrol Gerak Kamera Presisi",
      shortDesc: "Setup node workflow, ControlNet motion, dan render video animasi tanpa flicker.",
      description: "Kuasai ekosistem open-source video AI paling fleksibel di dunia. Pelajari node ComfyUI, ControlNet OpenPose, AnimateDiff motion modules, dan teknik upscale berkinerja tinggi.",
      level: "advanced",
      price: 499000,
      salePrice: 349000,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-kontrak.webp",
      totalDuration: 1200,
      totalLessons: 40,
      totalEnrolled: 285,
      avgRating: 4.9,
      totalReviews: 78,
      isFeatured: true,
      categoryId: categoryMap.get("motion-animasi"),
      trainerId: trainerMap.get("Galih Saputra")!,
    },
    {
      slug: "ai-voice-music-suno",
      title: "Voice Clone & Audio Scoring AI: ElevenLabs + Suno",
      shortDesc: "Dubbing multi-bahasa, sound design latar, dan musik orisinal bebas royalti.",
      description: "Lengkapi visual AI-mu dengan audio kelas bioskop. Pelajari cloning suara natural berbahasa Indonesia di ElevenLabs dan komposisi soundtrack orisinal berbasis genre di Suno AI.",
      level: "intermediate",
      price: 279000,
      salePrice: 189000,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-podcast.webp",
      totalDuration: 540,
      totalLessons: 20,
      totalEnrolled: 198,
      avgRating: 4.7,
      totalReviews: 42,
      isFeatured: true,
      categoryId: categoryMap.get("suara-musik-ai"),
      trainerId: trainerMap.get("Sinta Maharani")!,
    },
    {
      slug: "dasar-prompt-video-ai",
      title: "Dasar Prompt Video AI untuk Pemula",
      shortDesc: "Struktur prompt, lighting, sudut kamera, dan panduan tools Rp0 untuk pemula.",
      description: "Kelas gratis ramah pemula yang ingin memahami cara kerja video generator AI tanpa modal awal. Kenali anatomi prompt, trik seed kamera, dan etika hak cipta visual.",
      level: "beginner",
      price: 0,
      salePrice: 0,
      status: "published",
      publishedAt,
      thumbnailUrl: "/uploads/images/demo/c-portofolio.webp",
      totalDuration: 360,
      totalLessons: 14,
      totalEnrolled: 1420,
      avgRating: 4.9,
      totalReviews: 165,
      isFeatured: true,
      categoryId: categoryMap.get("dasar-prompt"),
      trainerId: trainerMap.get("Bayu Pratama")!,
    },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { slug: course.slug },
      update: course,
      create: course,
    });
  }
  console.log(`✓ ${courses.length} Video AI courses upserted`);

  // Archive old legacy tech courses so they don't pollute the video AI catalog
  const legacySlugs = [
    "digital-marketing-fundamentals",
    "social-media-marketing-advanced",
    "ui-ux-design-figma",
    "web-development-react-nextjs",
    "seo-mastery",
    "brand-design-canva",
  ];
  await prisma.course.updateMany({
    where: { slug: { in: legacySlugs } },
    data: { status: "archived" },
  });
  console.log(`✓ Archived ${legacySlugs.length} legacy courses`);

  // 4. Events
  const now = new Date();
  const events = [
    {
      slug: "webinar-kling-ai-brand",
      title: "Masterclass Live: Bedah Prompt Video Iklan Kling AI 1.5",
      type: "online",
      status: "published",
      startDate: new Date(now.getTime() + 5 * 86400000),
      endDate: new Date(now.getTime() + 5 * 86400000 + 7200000),
      location: "Zoom Live Webinar",
      price: 0,
      quota: 500,
      isFeatured: true,
    },
    {
      slug: "workshop-video-ai-jakarta",
      title: "Workshop Praktik Offline: Bikin 10 Video AI Sehari — Jakarta",
      type: "offline",
      status: "published",
      startDate: new Date(now.getTime() + 12 * 86400000),
      endDate: new Date(now.getTime() + 12 * 86400000 + 28800000),
      location: "Creative Hub Tebet, Jakarta Selatan",
      price: 350000,
      quota: 35,
      isFeatured: true,
    },
    {
      slug: "showcase-kreator-video-ai",
      title: "Showcase & Networking: Monetisasi Karya Video AI Indonesia",
      type: "hybrid",
      status: "published",
      startDate: new Date(now.getTime() + 20 * 86400000),
      endDate: new Date(now.getTime() + 20 * 86400000 + 14400000),
      location: "Grand Studio Kuningan & Live Streaming",
      price: 150000,
      quota: 300,
      isFeatured: true,
    },
  ];

  for (const event of events) {
    await prisma.event.upsert({
      where: { slug: event.slug },
      update: event,
      create: event,
    });
  }
  console.log(`✓ ${events.length} Video AI webinars upserted`);

  // 5. E-Books
  const ebooks = [
    {
      slug: "prompt-bible-video-ai",
      title: "Prompt Bible: 200+ Template Prompt Video Sinematik Kling & Runway",
      category: "Prompt Library",
      price: 0,
      status: "published",
    },
    {
      slug: "panduan-ugc-video-ai",
      title: "Formula Video UGC: Hook 3 Detik yang Menghasilkan Penjualan",
      category: "Bisnis Kreator",
      price: 0,
      status: "published",
    },
    {
      slug: "comfyui-node-guidebook",
      title: "Buku Panduan Node Workflow ComfyUI untuk Animasi AI",
      category: "Motion & Animasi",
      price: 79000,
      status: "published",
    },
    {
      slug: "pricing-guide-kreator-ai",
      title: "Standar Rate Card & Kontrak Jasa Video AI untuk Agensi & Brand",
      category: "Bisnis Kreator",
      price: 99000,
      status: "published",
    },
    {
      slug: "elevenlabs-suno-playbook",
      title: "Audio & Music AI Playbook: Dari Nol ke Soundtrack Sinematik",
      category: "Suara & Musik AI",
      price: 69000,
      status: "published",
    },
    {
      slug: "lighting-camera-prompting",
      title: "Cheat Sheet: Terminologi Sinematografi & Pencahayaan Prompt AI",
      category: "Prompt Library",
      price: 0,
      status: "published",
    },
  ];

  for (const ebook of ebooks) {
    await prisma.eBook.upsert({
      where: { slug: ebook.slug },
      update: ebook,
      create: {
        ...ebook,
        description: `Panduan lengkap video AI: ${ebook.title}`,
        fileUrl: `https://media.hazl.id/ebooks/${ebook.slug}.pdf`,
      },
    });
  }
  console.log(`✓ ${ebooks.length} Video AI e-books & prompt guides upserted`);

  console.log("\n🎉 Video AI catalog seeding successfully completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
