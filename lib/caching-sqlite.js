var q = require("q");
var sqlite3 = require("sqlite3");

exports.createCache = createCache;


function createCache(maxAge, options) {
    options = options || {};
    
    var database = new sqlite3.Database(options.path || ":memory:");
    
    database.serialize(function() {
        database.run("CREATE TABLE IF NOT EXISTS cache_0_2 (name TEXT, value TEXT, creationTime INTEGER)");
        database.run("CREATE INDEX IF NOT EXISTS cache_0_2__name_time ON cache_0_2 (name, creationTime)");
    });
    
    function getValue(name) {
        var deferred = q.defer();
        
        var oldestTime = new Date().getTime() - maxAge;
        var query = "SELECT name, value FROM cache_0_2 WHERE name = ? AND creationTime >= ?";
        
        database.get(query, name, oldestTime, function(err, row) {
            if (err) {
                deferred.reject(err);
            } else if (row) {
                deferred.fulfill(JSON.parse(row.value));
            } else {
                deferred.fulfill(undefined);
            }
        });
        
        return deferred.promise;
    }
    
    function setValue(name, value) {
        var deferred = q.defer();
        database.run(
            "INSERT INTO cache_0_2 (name, value, creationTime) VALUES (?, ?, ?)",
            name, JSON.stringify(value), new Date().getTime(),
            function(err) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.fulfill(null);
                }
            }
        );
        return deferred.promise;
    }
    
    return {
        getValue: getValue,
        setValue: setValue
    };
}
