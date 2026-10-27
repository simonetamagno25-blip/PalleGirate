// La sessione (JWT) porta la versione dell'utente al momento del login; "reimposta accesso" la incrementa,
// così i token emessi prima del reset non valgono più nemmeno dopo la riattivazione.
export function isSessionCurrent(tokenVersion: unknown, userVersion: number): boolean {
  return typeof tokenVersion === 'number' && tokenVersion === userVersion
}
