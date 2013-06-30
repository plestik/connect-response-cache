var q = require("q");

exports.createCache = createCache;


function createCacheEntry(value) {
    return {
        value: value,
        time: getNow()
    };
}


function createCache(maxAge) {
    var cache = {};
    
    function getEntry(id) {
        if (cache[id] && getNow() - cache[id].time >= maxAge) {
            remove(id);
        }
        return cache[id];
    }
    
    function getValue(id) {
        var entry = getEntry(id);
        if (entry) {
            return q.fulfill(entry.value);
        } else {
            return q.fulfill(undefined);
        }
    }
    
    function setValue(id, value) {
        cache[id] = createCacheEntry(value);
        return q.fulfill(null);
    }
    
    function remove(id) {
        cache[id] = null;
    }
    
    return {
        getValue: getValue,
        setValue: setValue
    };
}

function getNow() {
    return new Date().getTime();
}
