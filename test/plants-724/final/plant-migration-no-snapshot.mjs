import { buildMigrationPacket } from "../../../src/chains/724/migration.ts";
import { readFileSync } from "node:fs";
const r = buildMigrationPacket({ outDir: "/tmp/mig-plant" });
const notice = readFileSync("/tmp/mig-plant/notice.md","utf8");
if (!r.snapshot_supplied && notice.includes("no migration path exists")) { console.log("PLANT OK migration_no_snapshot_silent"); process.exit(0); }
console.error("PLANT FAIL"); process.exit(1);
