CREATE SCHEMA IF NOT EXISTS "test-d3gqp6tfx48ae40f2";

CREATE TABLE IF NOT EXISTS "test-d3gqp6tfx48ae40f2".schools_raw (
  id          text PRIMARY KEY,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "test-d3gqp6tfx48ae40f2".schools (
  id            text PRIMARY KEY,
  name          text,
  type          text,
  level         text,
  authority     text,
  authority_cn  text,
  gender        text,
  gender_cn     text,
  boarding      text,
  language      text,
  language_cn   text,
  enrolment     text,
  street        text,
  suburb        text,
  city          text,
  territorial   text,
  region        text,
  urban_rural   text,
  phone         text,
  email         text,
  roll          integer,
  eqi           integer,
  isolation     integer,
  european      integer,
  maori         integer,
  pacific       integer,
  asian         integer,
  melaa         integer,
  other         integer,
  intl          integer,
  lat           double precision,
  lng           double precision,
  website       text,
  url           text,
  fetched_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "test-d3gqp6tfx48ae40f2".ece_raw (
  id          text PRIMARY KEY,
  payload     jsonb NOT NULL,
  fetched_at  timestamptz DEFAULT now()
);
