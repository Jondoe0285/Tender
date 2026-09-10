import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { prisma } from '../../src/server/data/prisma';
import { consumePasswordResetToken, createPasswordResetToken } from '../../src/server/auth/passwordReset';

test('completing a password reset increments sessionVersion so prior sessions stop matching', async (context) => {
  const suffix = randomUUID();
  const email = `session-version-${suffix}@example.test`;
  let userId: string | undefined;

  context.after(async () => {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  const user = await prisma.user.create({
    data: { email, passwordHash: 'not-used', role: 'USER', contactName: 'Session Version Test' },
  });
  userId = user.id;
  const priorSessionVersion = user.sessionVersion;

  const token = await createPasswordResetToken(userId);
  const resetUserId = await consumePasswordResetToken(token, 'new-hash-not-a-real-password');
  assert.equal(resetUserId, userId);

  const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  assert.equal(reloaded.sessionVersion, priorSessionVersion + 1);

  // A JWT issued before the reset carries the prior sessionVersion, so it no longer matches the account.
  assert.notEqual(reloaded.sessionVersion, priorSessionVersion);

  // The same reset token cannot be replayed to invalidate the session again.
  assert.equal(await consumePasswordResetToken(token, 'another-hash'), null);
});
