/**
 * Debug: Block event 구조 확인
 */
require('dotenv').config();
const { connectGateway } = require('./services/fabric-listener');

async function main() {
  const gateway = await connectGateway();
  const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'passportchannel');

  console.log('Listening for next block event...');

  await network.addBlockListener(async (event) => {
    const blockNum = Number(event.blockNumber);
    console.log(`\n=== Block ${blockNum} ===`);
    console.log('event keys:', Object.keys(event));
    console.log('event.blockData keys:', event.blockData ? Object.keys(event.blockData) : 'none');

    // Dump first transaction structure
    const txs = event.blockData?.data?.data || [];
    console.log('tx count:', txs.length);

    if (txs.length > 0) {
      const tx = txs[0];
      console.log('tx keys:', Object.keys(tx));
      if (tx.payload) {
        console.log('tx.payload keys:', Object.keys(tx.payload));
        if (tx.payload.data) {
          console.log('tx.payload.data keys:', Object.keys(tx.payload.data));
          const actions = tx.payload.data.actions;
          if (actions && actions.length > 0) {
            console.log('action keys:', Object.keys(actions[0]));
            const payload = actions[0].payload;
            if (payload) {
              console.log('action.payload keys:', Object.keys(payload));
              if (payload.action) {
                console.log('action.payload.action keys:', Object.keys(payload.action));
                const prp = payload.action.proposal_response_payload;
                if (prp) {
                  console.log('prp keys:', Object.keys(prp));
                  if (prp.extension) {
                    console.log('extension keys:', Object.keys(prp.extension));
                    const results = prp.extension.results;
                    if (results) {
                      console.log('results keys:', Object.keys(results));
                      const nsRwSets = results.ns_rwset || results.nsRwset || [];
                      console.log('ns_rwset count:', nsRwSets.length);
                      for (const ns of nsRwSets) {
                        console.log('  namespace:', ns.namespace);
                        console.log('  rwset keys:', ns.rwset ? Object.keys(ns.rwset) : 'none');
                        const writes = ns.rwset?.writes || [];
                        console.log('  writes count:', writes.length);
                        for (const w of writes.slice(0, 3)) {
                          console.log('    key:', w.key);
                          console.log('    is_delete:', w.is_delete);
                          const val = w.value;
                          if (val) {
                            const str = typeof val === 'string' ? val : Buffer.isBuffer(val) ? val.toString() : JSON.stringify(val);
                            try {
                              const parsed = JSON.parse(str);
                              console.log('    docType:', parsed.docType);
                            } catch {
                              console.log('    value (first 100):', str.substring(0, 100));
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // Exit after first block
    process.exit(0);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
