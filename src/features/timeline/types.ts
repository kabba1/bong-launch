export interface TimelineParagraph {
  text: string;
  sourceIds: string[];
}
export interface TimelineSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  accessedAt: string;
  supports: string;
}
export interface TimelineImage {
  src: string;
  alt: string;
  credit: string;
  rightsBasis: string;
  licenseUrl?: string;
  rightsReviewedBy: string;
}
export interface TimelineEntry {
  id: string;
  slug: string;
  status: "published";
  title: string;
  revision: number;
  summary: string;
  dateLabel: string;
  sortYear: number;
  datePrecision: "exact" | "approximate" | "range" | "unknown";
  fictionText: string;
  facts: TimelineParagraph[];
  spark: TimelineParagraph;
  development: TimelineParagraph;
  uncertaintyNote?: string;
  sources: TimelineSource[];
  image?: TimelineImage;
  reviewedBy: string;
  reviewedAt: string;
  correctionNote?: string;
}
