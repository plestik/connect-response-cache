var connect = require("connect");
var http = require("http");
var request = require("request");

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

function startServer(finalMiddleware) {
    finalMiddleware = finalMiddleware || describeRequestMiddleware;
    
    var cacheMiddleware = connectResponseCache({maxAge: maxAge});
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
            var content;
            try {
                content = JSON.parse(body);
            } catch (e) {
                content = null;
            }
            callback(error, response, content);
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
    response.write(JSON.stringify(describeRequest(request)));
    response.end();
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
