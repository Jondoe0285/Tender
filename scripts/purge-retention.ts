import { prisma } from '../src/server/data/prisma';
import { purgeExpiredUnpurchasedQuotes } from '../src/server/domain/retentionService';

const deleted = await purgeExpiredUnpurchasedQuotes();
console.log(`Retention purge deleted ${deleted.quotesDeleted} quote(s) and ${deleted.documentsDeleted} document(s).`);
await prisma.$disconnect();
