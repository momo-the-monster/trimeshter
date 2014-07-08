var mmmInput = mmmInput || {};

mmmInput.LeapInput = mmmInput.LeapInput || {};

var LeapInput = mmmInput.LeapInput = function LeapInput(options) {
    options = options || {};
    this.onStart = options.onStart || null;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;
    this.leapTouches = [];
    var self = this;
    var three = options.three || null;
    var camera, scene, renderer;

    // Abort if we haven't passed a three scene in here
    if(three === null) {
        console.log("Can't setup Leap visualization without an active Three scene");
        return false;
    }

    camera = three.camera;
    scene = three.scene;
    renderer = three.renderer;

    /**
     * Initialize Leap Controller and rigged hand
     */
    (window.controller = new Leap.Controller)
        .use('riggedHand', {
            parent: scene,
            renderer: renderer,
            renderFn: function () {
            },
            scale: 5,
            positionScale: 5,
            offset: new THREE.Vector3(0, -50, -20),
            camera: camera,
            materialOptions: {
                wireframe: true
            }
        })
        .connect();
    // rigged hand styling
    controller.on('riggedHand.meshAdded', function (handMesh, leapHand) {
        handMesh.material.opacity = 0.25;
    });

    /**
     * Leap Frame Loop
     * Find all fingers on all hands
     * Test each one for its Touch Zone - https://developer.leapmotion.com/documentation/javascript/devguide/Leap_Touch_Emulation.html
     * Call onStart, onMove and onFinish which are root-level events for the scene
     * These are passed in via the constructor above
     */
    controller.on('frame', function (frame) {

        // loop through every hand
        for (var h = 0; h < frame.hands.length; h++) {

            var hand = frame.hands[h];

            var idx = self.isLeapPressed(hand.id);
            var pinchStrength = hand.pinchStrength;
            var pincher = self.findPinchingFingerType(hand);
            var ibox = frame.interactionBox;
            var normalizedPosition = ibox.normalizePoint(pincher.stabilizedTipPosition, true);

            var cursor = {
                id:hand.id,
                x: normalizedPosition[0],
                y: 1 - normalizedPosition[1],
                z: normalizedPosition[2]
            };
            if(pinchStrength === 1){
                if(idx >=0){
                    if(self.onMove !== null) {
                        self.onMove(cursor);
                    }
                    self.leapTouches.splice(idx, 1, cursor);
                } else {
                    if(self.onStart !== null) {
                        self.onStart(cursor);
                    }
                    self.leapTouches.push(cursor);
                }
            } else {
                if (idx >= 0) {
                    if(self.onEnd !== null) {
                        self.onEnd(cursor);
                    }
                    self.leapTouches.splice(idx, 1);
                }
            }
        } // end of hand loop
    });
};

/**
 * Get pinching finger
 * From official docs at https://developer.leapmotion.com/documentation/skeletal/javascript/api/Leap.Hand.html
 * @param hand
 * @returns {*}
 */
LeapInput.prototype.findPinchingFingerType = function(hand){
    var pincher;
    var closest = 500;
    for(var f = 1; f < 5; f++)
    {
        current = hand.fingers[f];
        distance = Leap.vec3.distance(hand.thumb.tipPosition, current.tipPosition);
        if(current != hand.thumb && distance < closest)
        {
            closest = distance;
            pincher = current;
        }
    }
    return pincher;
};

/**
 * Turn Leap scene point into normalized cursor
 * @param point
 * @returns {{x: number, y: number, z: *}}
 */
LeapInput.prototype.normalizePoint = function(point){
    return {
        x: point.x / window.innerWidth,
        y: point.y / window.innerHeight,
        z: point.z
    }
};

/**
 * Track whether a touch has already started
 * Helps discern Start, Move and End events
 * @param idToFind
 * @returns {number}
 */
LeapInput.prototype.isLeapPressed = function(idToFind) {
    for (var i = 0; i < this.leapTouches.length; i++) {
        if (this.leapTouches[i].id == idToFind) {
            return i;
        }
    }
    return -1;    // not found
};