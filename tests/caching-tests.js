exports.createCacheTests = createCacheTests;


var tests = [];

function addTest(name, func) {
    tests.push({name: name, func: func});
}

addTest("getValue returns undefined if value is missing", function(caching, test) {
    var cache = caching.createCache(10);
    cache.getValue("message")
        .then(function(value) {
            test.strictEqual(undefined, value);
            test.done();
        })
        .done();
});

addTest("getValue gets value set by setValue", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello")
        .then(function() {
            return cache.getValue("message");
        })
        .then(function(value) {
            test.strictEqual("Hello", value);
            test.done();
        })
        .done();
});

addTest("getValue ignores values with other names", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello")
        .then(function() {
            return cache.getValue("greeting");
        })
        .then(function(value) {
            test.strictEqual(undefined, value);
            test.done();
        })
        .done();
});

addTest("getValue is case-sensitive when looking up name", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello")
        .then(function() {
            return cache.getValue("Message");
        })
        .then(function(value) {
            test.strictEqual(undefined, value);
            test.done();
        })
        .done();
});

addTest("value is lost after maxAge", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello");
    setTimeout(function() {
        cache.getValue("message").then(function(value) {
            test.strictEqual(undefined, value);
            test.done();
        });
    }, 11);
});

function createCacheTests(suiteName, caching, testObj) {
    tests.forEach(function(testCase) {
        var fullName = suiteName + ": " + testCase.name;
        testObj[fullName] = function(test) {
            return testCase.func(caching, test);
        };
    });
}
