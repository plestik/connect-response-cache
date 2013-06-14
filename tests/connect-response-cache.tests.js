var connect = require("connect");
var http = require("http");
var request = require("request");

var connectResponseCache = require("../");

var port = 50997;
var maxAge = 100;
    
exports["GET requests are cached"] = function(test) {
    var server = startServer();
    
    server.request("/", function(error, response) {
        test.ifError(error);
        var firstId = response.id;
        
        server.request("/", function(error, response) {
            test.ifError(error);
            var secondId = response.id;
            
            test.equal(firstId, secondId);
            
            server.stop();
            test.done();
        });
    });
};
    
exports["cache expires after maxAge"] = function(test) {
    var server = startServer();
    
    server.request("/", function(error, response) {
        test.ifError(error);
        var firstId = response.id;
        setTimeout(function() {
            server.request("/", function(error, response) {
                test.ifError(error);
                var secondId = response.id;
                
                test.notEqual(firstId, secondId);
                
                server.stop();
                test.done();
            });
        }, maxAge * 2);
    });
};
    
exports["POST requests are not cached"] = function(test) {
    var server = startServer();
    
    server.request("/", {method: "POST"}, function(error, response) {
        test.ifError(error);
        var firstId = response.id;
        
        server.request("/", {method: "POST"}, function(error, response) {
            test.ifError(error);
            var secondId = response.id;
            
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
            callback(error, JSON.parse(body));
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


var id = 0;
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
