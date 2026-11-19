import { measureHealth } from "../../../src/chains/724/health.ts";
import { fakeProvider, expectExit } from "../_fake.mjs";
const now=1800000000;
const p=fakeProvider({async blockNumber(){return 500n},async getBlock(n){const num=typeof n==="bigint"?n:BigInt(n);return{number:num,timestamp:BigInt(now-99999-Number(500n-num)*5),hash:"0x"+"00".repeat(32)}}});
await expectExit(measureHealth(p,{nowSec:now}),57,"health_green_on_red");
