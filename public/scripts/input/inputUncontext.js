var mmmInput = mmmInput || {};

mmmInput.UncontextCursor = mmmInput.UncontextCursor || {};

var UncontextCursor = mmmInput.UncontextCursor = function UncontextCursor(options) {
    // Injections from Scene
    options = options || {};
    var onStart = options.onStart || null;
    var onMove = options.onMove || null;
    var onEnd = options.onEnd || null;
    var socket = new WebSocket('ws://literature.uncontext.com:80');
    var config = options.config || null;

    // track high numbers for a, b, f and g
    var maxA = 25;
    var maxB = 20;
    var maxF = 400;
    var maxG = 467;

    // Start with no drift
    config.drift.x = config.drift.y = config.drift.z = 0;

    socket.onmessage = function (message) {

        var data = JSON.parse(message.data);

        // Convert A and B to X and Y
        var aDiff = window.innerWidth / maxA;
        var bDiff = window.innerHeight / maxB;

        var x = aDiff * data.a;
        var y = bDiff * data.b;

        var event = {x: x, y: y, z: 0, id: 0};

        // Convert F and G to Drifts
        var fDiff = 1 / maxF;
        var gDiff = 1 / maxG;
        var yDrift = fDiff * data.e.f;
        var zDrift = gDiff * data.e.g;
        yDrift -= 0.5;
        zDrift *= -0.5;

        // Apply new drift amounts
        config.drift.y = yDrift;
        config.drift.z = zDrift;

        // Call all three events to immediately build a new face
        onStart(event);
        onMove(event);
        onEnd(event);

    };

};