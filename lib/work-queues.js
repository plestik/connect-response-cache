exports.createQueueSet = createQueueSet;


function createQueueSet() {
    var queues = {};
    
    function get(name) {
        if (!queues[name]) {
            queues[name] = createQueue();
        }
        return queues[name];
    }
    
    return {
        get: get
    };
}

function createQueue() {
    var queue = [];
    var current = null;
    
    function add(func) {
        queue.push(func);
        if (current === null) {
            next();
        }
    }
    
    function next() {
        if (queue.length > 0) {
            current = queue.shift();
            var result = current();
            result.fin(next);
            result.fail(function(error) {
                console.error(error.stack);
            });
        } else {
            current = null;
        }
    }
    
    return {
        add: add
    };
}
