var caching = require("../lib/caching-sqlite");

var cachingTests = require("./caching-tests");


cachingTests.createCacheTests("sqlite", caching, exports);

