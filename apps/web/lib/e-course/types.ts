export type Chapter = {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  isLocked: boolean;
};

export type Lesson = {
  id: string;
  slug: string;
  title: string;
  number: number;
  chapterCount: number;
  studentCount: string;
  rating: number;
  isPortfolioProject: boolean;
  chapters: Chapter[];
};

export type Topic = {
  id: string;
  slug: string;
  title: string;
  lessonCount: number;
  videoCount: number;
  lessons: Lesson[];
};

export type InfoCard = {
  title: string;
  description: string;
};

export type Category = {
  id: string;
  slug: string;
  title: string;
  topicCount: number;
  materialCount: number;
  description: string;
  tutorQuote: string;
  tutorName: string;
  tutorRole: string;
  infoCards: InfoCard[];
  topics: Topic[];
};


export type KategoriParams = { kategori: string };
export type TopikParams = { kategori: string; topik: string };
export type MateriParams = { kategori: string; topik: string; materi: string };
