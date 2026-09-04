/** Fehler mit HTTP-Status; wird vom zentralen Error-Handler in app.ts übersetzt. */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(code);
    this.name = 'HttpError';
  }
}

export const nichtGefunden = (): never => {
  throw new HttpError(404, 'nicht_gefunden');
};
