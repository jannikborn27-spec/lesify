import { HttpError } from './http.js';

/** Gibt den Wert zurück oder wirft 404 (für „gehört dem User nicht / gibt's nicht"). */
export function oder404<T>(v: T | null | undefined): T {
  if (v == null) throw new HttpError(404, 'nicht_gefunden');
  return v;
}
