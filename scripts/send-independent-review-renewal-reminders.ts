import { sendIndependentReviewRenewalReminders } from '@/server/domain/independentReviewService';

async function main() {
  const result = await sendIndependentReviewRenewalReminders();
  console.log(`Independent review renewal reminders scanned ${result.scanned} profile(s), sent ${result.sent}, skipped ${result.skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
