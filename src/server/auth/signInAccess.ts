/** Marketplace and Super User sign-in follow the Owner gate. Owner can always sign in. */
export function signInAllowed(account: { isOwner: boolean }, signInActive: boolean): boolean {
  return account.isOwner || signInActive;
}
