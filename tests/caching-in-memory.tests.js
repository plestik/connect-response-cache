var caching = require("../lib/caching-in-memory");

var cachingTests = require("./caching-tests");


cachingTests.createCacheTests("in-memory", caching, exports);
