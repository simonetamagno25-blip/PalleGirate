// connection_limit=1 serializza le transazioni SQLite concorrenti nei test.
export const TEST_DATABASE_URL = 'file:./test.db?connection_limit=1'
