import { initDb, closeDb } from '../db.js';
import { runErpImport, DEFAULT_ERP_IMPORT_PATH } from '../services/erpImportService.js';

async function main() {
  const filePath = process.argv[2] ?? DEFAULT_ERP_IMPORT_PATH;
  await initDb();
  const result = await runErpImport(filePath);
  console.log(`ERP import ${result.status}: ${result.recordsProcessed} records.`);
  if (result.errors.length) {
    console.warn('Errors:', result.errors);
  }
  await closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
