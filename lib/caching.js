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
            return entry.value;
        }
    }
    
    function setValue(id, value) {
        cache[id] = createCacheEntry(value);
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
