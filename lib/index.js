var q = require("q");

module.exports = middleware;

function middleware(options) {
    var maxAge = options.maxAge;
    
    var cache = {};
    
    function handle(request, response, next) {
        if (request.method === "GET") {
            var requestId = request._cacheId = request.url;
            
            if (cache[requestId] && getNow() - cache[requestId].time >= maxAge) {
                cache[requestId] = null;
            }
            
            if (!cache[requestId]) {
                cache[requestId] = cacheResponse(response);
                next();
            } else {
                cache[requestId](response);
            }
        } else {
            next();
        }
    };
    
    return handle;
    
    function cacheResponse(response) {
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
        };
        
        var cacheEntry = function(response, next) {
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
        }
        cacheEntry.time = getNow();
        return cacheEntry;
    }
}

function getNow() {
    return new Date().getTime();
}
