/**
 * Genera un UUID v4 válido para columnas UUID de PostgreSQL.
 *
 * `crypto.randomUUID` sólo está disponible en contextos seguros (HTTPS o
 * localhost), por eso se incluye un fallback para el resto de casos.
 */
export function generateUuid(): string {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
