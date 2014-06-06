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
    var triggerRange = 0.001;
    var triggerSpot = 0.973
    var triggerMin = triggerSpot - triggerRange;
    var triggerMax = triggerSpot + triggerRange;

    /**
     * Initialize Leap Controller and rigged hand
     */
    (window.controller = new Leap.Controller)
        .use('riggedHand', {
            parent: scene,
            renderer: renderer,
            renderFn: function () {
            },
            scale: 2,
            offset: new THREE.Vector3(0, -30, 10),
            camera: camera,
            positionScale: 2
        })
        .connect();
    // rigged hand styling
    controller.on('riggedHand.meshAdded', function (handMesh, leapHand) {
        handMesh.material.opacity = 0.9;
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
            var handMesh = frame.hands[h].data('riggedHand.mesh');

            // loop through every finger
            for (var i = 0; i < hand.fingers.length; i++) {

                var finger = hand.fingers[i];
                var id = finger.id;

                // find existing leap touch to detect Start, Move and End
                // ongoing touch logic based on https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events
                var idx = self.isLeapPressed(id);

                // get scene position
                var scenePosition = handMesh.screenPosition(hand.fingers[i].stabilizedTipPosition, camera);
                var event = {x: scenePosition.x, y: window.innerHeight - scenePosition.y, z:scenePosition.z, id: id};

                if (scenePosition.z > triggerMin && scenePosition.z < triggerMax) {
                    if (idx >= 0) {
                        if(self.onMove !== null) {
                            self.onMove(event);
                        }
                        self.leapTouches.splice(idx, 1, event);
                    } else {
                        if(self.onStart !== null) {
                            self.onStart(event);
                        }
                        self.leapTouches.push(event);
                    }
                } else {
                    // test that a touch exists before we try to finish it
                    if (idx >= 0) {
                        if(self.onEnd !== null) {
                            self.onEnd(event);
                        }
                        self.leapTouches.splice(idx, 1);
                    }
                }

            } // end of finger loop
        } // end of hand loop
    });
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