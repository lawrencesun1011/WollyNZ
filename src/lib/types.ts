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

  // ECE（幼儿园）专用字段，中小学忽略
  maxChildren?: number; // All_Children：最大人数
  maxUnder2?: number; // Under_2s：最大 2 岁以下人数
  acceptsUnder2?: boolean; // Under_2s > 0：是否接受 2 岁以下
}

export interface DataMeta {
  fetchedAt: string;
  sources: Record<
    string,
    { resourceId: string; label: string; count: number; frontendCount?: number }
  >;
}

export type SortKey = "name" | "eqi" | "roll";
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
  under2: string; // ECE：接受 2 岁以下，"yes" | "no"
}
