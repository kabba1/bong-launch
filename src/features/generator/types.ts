export interface Idea {
  id: string;
  categoryId: string;
  text: string;
}
export interface Corpus {
  schemaVersion: 1;
  datasetId: string;
  sourceSha256: string;
  categories: { id: string; label: string }[];
  ideas: Idea[];
}
export interface CorpusManifest {
  schemaVersion: 1;
  datasetId: string;
  sourceSha256: string;
  hash: string;
  url: string;
  activeCount: number;
  categoryCount: number;
}
