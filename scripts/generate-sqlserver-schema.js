#!/usr/bin/env node
// Regenerates prisma/schema.sqlserver.prisma from prisma/schema.prisma so the two
// datasources never drift. Run via `npm run db:sync-prod-schema`.
const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const target = path.join(__dirname, '..', 'prisma', 'schema.sqlserver.prisma');

const contents = fs.readFileSync(source, 'utf8');

const rewritten = contents
  .replace(
    'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}',
    'datasource db {\n  provider = "sqlserver"\n  url      = env("DATABASE_URL")\n}'
  )
  .replace(
    '// Local development datasource. Production targets Azure SQL via prisma/schema.sqlserver.prisma\n// — keep both schemas\' models in sync when making changes (see package.json db:* scripts).',
    '// GENERATED FILE — do not edit directly. Run `npm run db:sync-prod-schema` after changing prisma/schema.prisma.\n// Azure SQL (production) datasource.'
  );

if (rewritten === contents) {
  console.error('Could not locate expected datasource block in prisma/schema.prisma; aborting.');
  process.exit(1);
}

fs.writeFileSync(target, rewritten);
console.log('Wrote prisma/schema.sqlserver.prisma from prisma/schema.prisma');
