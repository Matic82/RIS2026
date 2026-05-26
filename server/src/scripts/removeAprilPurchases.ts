import { initDb, closeDb } from '../db.js';
import { revertBillingPeriod } from '../services/erpImportService.js';

async function main() {
  await initDb();

  console.log('Removing April 2026 data...');
  const removed = await revertBillingPeriod(4, 2026);

  if (!removed) {
    console.log('No April 2026 period found. Nothing to remove.');
  } else {
    console.log('Deleted purchases, points, status changes and period row for April 2026.');
  }

  await closeDb();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
