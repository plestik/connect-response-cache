var caching = require("../lib/caching");

var cachingTests = require("./caching-tests");


cachingTests.createCacheTests("in-memory", caching, exports);
