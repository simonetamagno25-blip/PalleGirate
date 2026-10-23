import type { Db, Tx } from "./db";

export function getSettings(db: Db | Tx) {
  return db.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
