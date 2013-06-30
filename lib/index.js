var q = require("q");

var workQueues = require("./work-queues");
var interception = require("./interception");

module.exports = middleware;


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

function middleware(options) {
    var maxAge = options.maxAge;
    
    var cache = createCache(maxAge);
    var queues = workQueues.createQueueSet();
    
    function handle(request, response, next) {
        if (request.method === "GET") {
            var requestId = request._cacheId = request.url;
            var queue = queues.get(requestId);
            queue.add(function() {
                return handleCacheableRequest(request, response, next);
            });
        } else {
            next();
        }
    };
    
    function handleCacheableRequest(request, response, next) {
        var requestId = request._cacheId;
        
        var cachedValue = cache.getValue(requestId);
        
        if (!cachedValue) {
            var value = cacheResponse(requestId, response);
            process.nextTick(next);
            return value;
        } else {
            response.writeHead(
                cachedValue.statusCode,
                cachedValue.headers
            );
            response.end(cachedValue.body);
            return q.fulfill(null);
        };
    }
    
    return handle;
    
    function cacheResponse(requestId, response) {
        var deferred = q.defer();
        
        var cachedResponse = {
            headers: {}
        };
        var body = [];
        
        interception.interceptMethods(response, {
            
            writeHead: function(statusCode, headers) {
                cachedResponse.statusCode = statusCode;
                for (var name in headers) {
                    cachedResponse.headers[name] = headers[name];
                }
            },
            
            setHeader: function(name, value) {
                cachedResponse.headers[name] = value;
            },
            
            write: function(chunk) {
                body.push(chunk);
            },
            
            end: function(chunk) {
                if (chunk) {
                    response.write(chunk);
                }
                cachedResponse.body = body.join("");
                if (response.statusCode < 500) {
                    cache.setValue(requestId, cachedResponse);
                }
                deferred.fulfill(null);
                // TODO: at the moment, we don't cache errors at all.
                // We should be more explicit about how we handle errors
                // e.g. retry on every request, cache error (with different maxAge?)
            }
            
        });
        return deferred.promise;
    }
}

function getNow() {
    return new Date().getTime();
}
