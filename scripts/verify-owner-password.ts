import { compare } from 'bcryptjs';
import { prisma } from '../src/server/data/prisma';

function readPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('PLATFORM_OWNER_PASSWORD is required when this command is not run interactively.');
  }

  process.stdout.write('Enter owner password to verify: ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (input: string) => {
      if (input === '\r' || input === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (input === '\u0003') {
        cleanup();
        reject(new Error('Password entry cancelled.'));
        return;
      }
      if (input === '\u0008' || input === '\u007f') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      value += input;
      process.stdout.write('*');
    };
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const email = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
  const password = await readPassword();
  if (!email || !password || password.length < 10) {
    throw new Error('PLATFORM_OWNER_EMAIL and a password of at least 10 characters are required.');
  }

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true },
  });
  if (!owner) throw new Error('Configured owner account was not found.');
  console.log(await compare(password, owner.passwordHash) ? 'Owner password matches.' : 'Owner password does not match.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Owner password verification failed.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());