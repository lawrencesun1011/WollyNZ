export interface SchoolFrontend {
  id: string;
  name: string;
  type: string;
  level: string;
  authority: string;
  authorityCN: string;
  gender: string;
  genderCN: string;
  boarding: "Yes" | "No";
  language: string;
  enrolment: string;
  street: string;
  suburb: string;
  city: string;
  territorial: string;
  region: string;
  urbanRural: string;
  phone: string;
  email: string;
  roll: number;
  eqi: number;
  isolation: number;
  european: number;
  maori: number;
  pacific: number;
  asian: number;
  melaa: number;
  other: number;
  intl: number;
  lat: number;
  lng: number;
  website: string;
  url: string;
}

export interface DataMeta {
  fetchedAt: string;
  sources: Record<
    string,
    { resourceId: string; label: string; count: number; frontendCount?: number }
  >;
}

export type SortKey = "name" | "eqi" | "roll" | "city";
export type ViewMode = "grid" | "list";

export interface Filters {
  keyword: string;
  types: string[];
  levels: string[];
  cities: string[];
  suburbs: string[];
  hotRegion: string;
  authorities: string[];
  urbanRural: string[];
  boarding: string[];
  languages: string[];
  eqi: string;
  isolation: string;
  intl: string;
}
