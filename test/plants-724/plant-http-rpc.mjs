import { makeProvider } from "../../src/shared/provider.ts";
import { expectExit } from "./_fake.mjs";
await expectExit(makeProvider("http://rpc.lxon.in", 724), 20, "http_rpc");
