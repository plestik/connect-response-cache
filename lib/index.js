var q = require("q");

module.exports = middleware;

function middleware() {
    var cache = {};
    return function(request, response, next) {
        if (request.method === "GET") {
            var requestId = request.url;
            if (!cache[requestId]) {
                cache[requestId] = cacheResponse(response);
                next();
            }
            cache[requestId](response);
        } else {
            next();
        }
    };
    
    // TODO: handle errors
    
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
        };
        
        response.write = function(chunk) {
            body.push(chunk);
        };
        
        response.end = function(chunk) {
            if (chunk) {
                response.write(chunk);
            }
            cachedResponse.body = body.join("");
            deferred.fulfill(cachedResponse);
        };
        
        return function(response) {
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
            });
        }
    }
}
