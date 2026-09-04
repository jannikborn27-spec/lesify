import { hash, verify } from '@node-rs/argon2';

// argon2id mit bewusst konservativen Parametern (OWASP-Richtwert).
const OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPasswort(klartext: string): Promise<string> {
  return hash(klartext, OPTS);
}

export async function pruefePasswort(
  gespeicherterHash: string,
  klartext: string,
): Promise<boolean> {
  try {
    return await verify(gespeicherterHash, klartext, OPTS);
  } catch {
    // defekter/kein Hash → gilt als nicht übereinstimmend
    return false;
  }
}
