import type { User, Fach, Thema } from '@prisma/client';

export function userDTO(u: User) {
  return {
    id: u.id,
    name: u.name,
    klassenstufe: u.klassenstufe,
    email: u.email,
    rolle: u.rolle,
    trialEndetAm: u.trialEndetAm,
    emailVerifiedAt: u.emailVerifiedAt,
  };
}

export function fachDTO(f: Fach, counts?: { themen: number; klausuren: number }) {
  return {
    id: f.id,
    name: f.name,
    klasse: f.klasse,
    initial: f.initial,
    farbe: f.farbe,
    icon: f.icon,
    ...(counts ? { anzahlThemen: counts.themen, anzahlKlausuren: counts.klausuren } : {}),
  };
}

export function themaDTO(t: Thema & { fach?: Fach | null }) {
  return {
    id: t.id,
    fachId: t.fachId,
    name: t.name,
    beschreibung: t.beschreibung,
    ...(t.fach ? { fachName: t.fach.name, farbe: t.fach.farbe } : {}),
  };
}
