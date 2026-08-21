CREATE TABLE IF NOT EXISTS schools_raw (
  id          text PRIMARY KEY,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schools (
  id            text PRIMARY KEY,
  name          text,
  type          text,
  authority     text,
  authority_cn  text,
  gender_cn     text,
  boarding      text,
  website       text,
  street        text,
  suburb        text,
  city          text,
  postcode      text,
  lat           double precision,
  lng           double precision,
  roll          integer,
  eqi           integer,
  year          integer,
  decile        integer,
  auth_url      text,
  qa_report_url text,
  fetched_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ece_raw (
  id          text PRIMARY KEY,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now()
);
