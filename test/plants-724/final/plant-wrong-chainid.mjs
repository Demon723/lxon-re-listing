globalThis.fetch = async (url, init) => {
  const m = init?.body ? JSON.parse(init.body).method : "";
  const result = m === "eth_chainId" ? "0x1" : "0x0";
  return new Response(JSON.stringify({jsonrpc:"2.0",id:1,result}),{status:200});
};
const { makeProvider } = await import("../../../src/shared/provider.ts");
try { await makeProvider("https://rpc.lxon.in", 724); console.error("PLANT FAIL: no exit"); process.exit(1); }
catch(e){ if(e.code===20 && /0x1/.test(e.message)){console.log("PLANT OK wrong_chainid_still_green: exit 20 names 0x1");process.exit(0)} console.error("PLANT FAIL "+e.code+" "+e.message);process.exit(1);}
