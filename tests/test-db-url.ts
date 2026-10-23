// Path relativo a prisma/schema.prisma, quindi il file è prisma/test.db.
// connection_limit=1 serializza le transazioni su SQLite (niente "database is locked").
export const TEST_DATABASE_URL = "file:./test.db?connection_limit=1";
