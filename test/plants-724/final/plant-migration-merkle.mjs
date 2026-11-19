import { buildMigrationPacket } from "../../../src/chains/724/migration.ts";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const d=mkdtempSync(join(tmpdir(),"mm-"));
const snap=join(d,"snap.json");
writeFileSync(snap,JSON.stringify({balances:[{address:"0x"+"11".repeat(20),balance:"100"}]}));
try{buildMigrationPacket({snapshotPath:snap,documentedTotalSupply:"999",outDir:join(d,"out")});console.error("PLANT FAIL: no exit 58");process.exit(1)}
catch(e){if(e.code===58||e.code===61){console.log("PLANT OK migration_merkle_mismatch: exit "+e.code);process.exit(0)}console.error("PLANT FAIL "+e.code);process.exit(1)}
