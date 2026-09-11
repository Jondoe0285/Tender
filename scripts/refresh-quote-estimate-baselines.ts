import { refreshQuoteEstimateBaselines } from '@/server/domain/quoteEstimateService';

async function main() {
  const rows = await refreshQuoteEstimateBaselines();
  console.log(`Updated ${rows.length} quote estimate baseline${rows.length === 1 ? '' : 's'} from live platform quotation data using the bottom-third pricing scale.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});