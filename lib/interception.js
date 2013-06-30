exports.interceptMethods = interceptMethods;


function interceptMethod(obj, methodName, callback) {
    var original = obj[methodName];
    obj[methodName] = function() {
        callback.apply(obj, arguments);
        original.apply(obj, arguments);
    };
}

function interceptMethods(obj, intercepts) {
    for (var methodName in intercepts) {
        interceptMethod(obj, methodName, intercepts[methodName]);
    }
}
