import { createSystemBackup } from "../lib/services/backup-service";

async function main() {
  console.log("Starting scheduled system backup...");
  const result = await createSystemBackup(undefined, false);
  console.log(`Backup completed successfully! Storage Key: ${result.storageKey}`);
  console.log(`Tables record counts:`, result.counts);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exit(1);
  });
