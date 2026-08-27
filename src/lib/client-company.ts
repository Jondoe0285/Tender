export function isPrimaryClientUser(primaryUserId: string, userId: string): boolean {
  return primaryUserId === userId;
}