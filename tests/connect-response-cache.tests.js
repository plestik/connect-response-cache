var connect = require("connect");
var http = require("http");
var request = require("request");
var temp = require("temp");

var connectResponseCache = require("../");

var port = 50997;
var maxAge = 100;
    
exports["GET requests are cached"] = function(test) {
    var server = startServer();
    
    server.request("/", function(error, response, body) {
        test.ifError(error);
        var firstId = body.id;
        
        server.request("/", function(error, response, body) {
            test.ifError(error);
            var secondId = body.id;
            
            test.equal(firstId, secondId);
            
            server.stop();
            test.done();
        });
    });
};
    
exports["binary response bodies can be cached"] = function(test) {
    var zip = createZip();
    
    var requestCount = 6;
    var server = startServer(function(request, response, next) {
        response.writeHead(200, {
            "Content-Type": "application/octet-stream"
        });
        response.write(zip.buffer());
        response.end();
    });
    
    server.request("/", {encoding: null}, function(error, response, body) {
        test.ifError(error);
        test.ok(equalBuffers(zip.buffer(), body));
        
        server.request("/", {encoding: null}, function(error, response, body) {
            test.ifError(error);
            test.ok(equalBuffers(zip.buffer(), body));
            
            server.stop();
            test.done();
        });
    });
};

function equalBuffers(first, second) {
    if (first.length !== second.length) {
        return false;
    }
    for (var i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) {
            return false;
        }
    }
    return true;
}
    
exports["simultaneous requests are cached"] = function(test) {
    var server = startServer(function(request, response, next) {
        setTimeout(describeRequestMiddleware.bind(null, request, response), 50);
    });
    
    var firstId;
    
    server.request("/", function(error, response, body) {
        test.ifError(error);
        firstId = body.id;
        finish();
    });
    
    var secondId;
    
    server.request("/", function(error, response, body) {
        test.ifError(error);
        secondId = body.id;
        finish();
    });
    
    function finish() {
        if (firstId !== undefined && secondId !== undefined) {
            test.equal(firstId, secondId);
            
            server.stop();
            test.done();
        }
    }
};
    
exports["status code is cached if set with property"] = function(test) {
    var server = startServer(function(request, response) {
        response.statusCode = 404;
        response.end();
    });
    
    server.request("/", function(error, response, body) {
        test.equal(404, response.statusCode);
        
        server.request("/", function(error, response, body) {
            test.equal(404, response.statusCode);
            server.stop();
            test.done();
        });
    });
};
    
exports["headers are cached when set with setHeader"] = function(test) {
    var server = startServer(function(request, response) {
        response.setHeader("X-Message", "Hello!");
        response.end();
    });
    
    server.request("/", function(error, response, body) {
        test.equal("Hello!", response.headers["x-message"]);
        
        server.request("/", function(error, response, body) {
            test.equal("Hello!", response.headers["x-message"]);
            server.stop();
            test.done();
        });
    });
};
    
exports["server errors are not cached"] = function(test) {
    var firstRequest = true;
    var server = startServer(function(request, response, next) {
        if (firstRequest) {
            next(new Error("On noes!"));
            firstRequest = false;
        } else {
            describeRequestMiddleware(request, response);
        }
    });
    
    server.request("/", function(error, response) {
        test.ifError(error);
        test.equal(response.statusCode, 500);
        
        server.request("/", function(error, response) {
            test.ifError(error);
            test.equal(response.statusCode, 200);
            
            server.stop();
            test.done();
        });
    });
};
    
exports["cache expires after maxAge"] = function(test) {
    var server = startServer();
    
    server.request("/", function(error, response, body) {
        test.ifError(error);
        var firstId = body.id;
        setTimeout(function() {
            server.request("/", function(error, response, body) {
                test.ifError(error);
                var secondId = body.id;
                
                test.notEqual(firstId, secondId);
                
                server.stop();
                test.done();
            });
        }, maxAge * 2);
    });
};
    
exports["POST requests are not cached"] = function(test) {
    var server = startServer();
    
    server.request("/", {method: "POST"}, function(error, response, body) {
        test.ifError(error);
        var firstId = body.id;
        
        server.request("/", {method: "POST"}, function(error, response, body) {
            test.ifError(error);
            var secondId = body.id;
            
            test.notEqual(firstId, secondId);
            
            server.stop();
            test.done();
        });
    });
};
    
exports["requests with different Host headers are not cached"] = function(test) {
    var server = startServer();
    
    server.request("/", {headers: {"host": "eg.com"}}, function(error, response, body) {
        test.ifError(error);
        var firstId = body.id;
        
        server.request("/", {headers: {"host": "example.com"}}, function(error, response, body) {
            test.ifError(error);
            var secondId = body.id;
            
            test.notEqual(firstId, secondId);
            
            server.stop();
            test.done();
        });
    });
};

function startServer(finalMiddleware) {
    finalMiddleware = finalMiddleware || describeRequestMiddleware;
    
    var cacheDir = temp.mkdirSync();
    
    var cacheMiddleware = connectResponseCache({
        maxAge: maxAge,
        cachePath: cacheDir
    });
    var app = connect()
        .use(cacheMiddleware)
        .use(finalMiddleware);
        
    var server = http.createServer(app).listen(port);
    
    function stop() {
        server.close();
    }
    
    function url(path) {
        return "http://localhost:" + port + path;
    }
    
    function serverRequest(path, options, callback) {
        if (!callback) {
            callback = options;
            options = {};
        }
        
        request(url(path), options, function(error, response, body) {
            if (options.encoding === null) {
                callback(error, response, body);
            } else {
                var content;
                try {
                    content = JSON.parse(body);
                } catch (e) {
                    content = null;
                }
                callback(error, response, content);
            }
        });
    }
    
    return {
        stop: stop,
        request: serverRequest
    }
}

function describeRequestMiddleware(request, response) {
    response.writeHead(200, {
        "Content-Type": "application/json"
    });
    response.end(JSON.stringify(describeRequest(request)));
}


var id = 1;
function describeRequest(request) {
    return {
        id: id++,
        headers: request.headers,
        url: request.url,
        method: request.method,
        httpVersion: request.httpVersion,
        time: new Date().getTime()
    };
}

function createZip() {
    var zip = new require("node-zip")();
    zip.file("message", "Hello!");
    var uint8array = zip.generate({
        type: "uint8array",
        compression: "DEFLATE"
    });
    return {
        buffer: function() {
            return new Buffer(uint8array);
        }
    };
}
