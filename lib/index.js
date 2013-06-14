var q = require("q");

module.exports = middleware;

function createQueue() {
    var queue = [];
    var current = null;
    
    function add(func) {
        queue.push(func);
        if (current === null) {
            next();
        }
    }
    
    function next() {
        if (queue.length > 0) {
            current = queue.shift();
            current().fin(next);
        } else {
            current = null;
        }
    }
    
    return {
        add: add
    };
}

function middleware(options) {
    var maxAge = options.maxAge;
    
    var cache = {};
    var queues = {};
    
    function getQueue(name) {
        if (!queues[name]) {
            queues[name] = createQueue();
        }
        return queues[name];
    }
    
    function handle(request, response, next) {
        if (request.method === "GET") {
            var requestId = request._cacheId = request.url;
            var queue = getQueue(requestId);
            queue.add(function() {
                return handleCacheableRequest(request, response, next);
            });
        } else {
            next();
        }
    };
    
    function handleCacheableRequest(request, response, next) {
        var requestId = request._cacheId;
        
        if (cache[requestId] && getNow() - cache[requestId].time >= maxAge) {
            cache[requestId] = null;
        }
        
        if (!cache[requestId]) {
            cache[requestId] = cacheResponse(requestId, response);
            process.nextTick(next);
            return cache[requestId].promise;
        } else {
            return cache[requestId](response);
        }
    }
    
    return handle;
    
    function cacheResponse(requestId, response) {
        var deferred = q.defer();
        var promise = deferred.promise;
        
        var cachedResponse = {};
        var body = [];
        
        response._uncachedMethods = {
            writeHead: response.writeHead,
            write: response.write,
            end: response.end
        };
        
        response.writeHead = function(statusCode, headers) {
            cachedResponse.statusCode = statusCode;
            cachedResponse.headers = headers;
            response._uncachedMethods.writeHead.apply(response, arguments);
        };
        
        response.write = function(chunk) {
            body.push(chunk);
            response._uncachedMethods.write.apply(response, arguments);
        };
        
        response.end = function(chunk) {
            if (chunk) {
                response.write(chunk);
            }
            cachedResponse.body = body.join("");
            response._uncachedMethods.end.call(response);
            deferred.fulfill(cachedResponse);
            // TODO: at the moment, we don't cache errors at all.
            // We should be more explicit about how we handle errors
            // e.g. retry on every request, cache error (with different maxAge?)
            if (response.statusCode >= 500) {
                cache[requestId] = null;
            }
        };
        
        var cacheEntry = function(response) {
            promise.then(function(cachedResponse) {
                if (response._uncachedMethods) {
                    response.writeHead = response._uncachedMethods.writeHead;
                    response.write = response._uncachedMethods.write;
                    response.end = response._uncachedMethods.end;
                }
                response.writeHead(
                    cachedResponse.statusCode,
                    cachedResponse.headers
                );
                response.end(cachedResponse.body);
            }).done();
            return q.fulfill(null);
        }
        cacheEntry.time = getNow();
        cacheEntry.promise = promise;
        return cacheEntry;
    }
}

function getNow() {
    return new Date().getTime();
}
