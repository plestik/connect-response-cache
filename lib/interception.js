exports.interceptMethods = interceptMethods;
exports.callOriginal = callOriginal;


function interceptMethod(obj, methodName, callback) {
    var original = obj[methodName];
    var method = obj[methodName] = function() {
        if (callback.apply(obj, arguments) !== false) {
            original.apply(obj, arguments);
        }
    };
    method.__interception_original = original.bind(obj);
}

function interceptMethods(obj, intercepts) {
    for (var methodName in intercepts) {
        interceptMethod(obj, methodName, intercepts[methodName]);
    }
}

function callOriginal(method) {
    method.__interception_original();
}
