exports.createCacheTests = createCacheTests;


var tests = [];

function addTest(name, func) {
    tests.push({name: name, func: func});
}

addTest("getValue returns undefined if value is missing", function(caching, test) {
    var cache = caching.createCache(10);
    test.strictEqual(undefined, cache.getValue("message"));
    test.done();
});

addTest("getValue gets value set by setValue", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello");
    test.strictEqual("Hello", cache.getValue("message"));
    test.done();
});

addTest("value is lost after maxAge", function(caching, test) {
    var cache = caching.createCache(10);
    cache.setValue("message", "Hello");
    setTimeout(function() {
        test.strictEqual(undefined, cache.getValue("message"));
        test.done();
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
