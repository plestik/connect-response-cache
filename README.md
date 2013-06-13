# connect-response-cache

Cache responses from your application.

## Installation

    npm install connect-response-cache
    
## Usage

```javascript
var connectResponseCache = require("connect-response-cache");

var app = connect()
    .use(connectResponseCache({maxAge: maxAge}))
    .use(function(request, response) {
        response.writeHead(200, {
            "Content-Type": "application/json"
        });
        response.end(JSON.stringify({"message": "Hello!"}));
    });
    
var server = http.createServer(app).listen(3000);
```
