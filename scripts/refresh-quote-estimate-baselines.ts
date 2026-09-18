import { refreshQuoteEstimateBaselines } from '@/server/domain/quoteEstimateService';

async function main() {
  const rows = await refreshQuoteEstimateBaselines();
  console.log(`Updated ${rows.length} catalogue pricing intelligence row${rows.length === 1 ? '' : 's'} from live platform quote-line data using standard-unit conversion and the bottom-third pricing scale.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});