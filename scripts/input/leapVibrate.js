/**
 * WebSocket Setup
 */

var socket = io.connect('http://localhost:3456');
var vibration = 0;

var connected = false;
socket.on('connect', function () {
    connected = true;
    console.log('connected');
});
socket.on('disconnect', function () {
    connected = false;
});

/**
 * Leap Event Handling
 */
controller.on('frame', function (frame) {
    if (frame.hands.length > 0) {
        var hand = frame.hands[0];
        var numTouching = 0;

        for (var f = 0; f < hand.fingers.length; f++) {
            if (hand.fingers[f].touchZone == "touching") {
                numTouching++;
            }
        }

        var strength = numTouching / hand.fingers.length;
        setVibration(strength);

        /* var finger = hand.fingers[2];
         if(finger){
         var touchZone = finger.touchZone;
         var touchDistance = finger.touchDistance;
         if(touchZone === "touching"){
         var touchStrength = Math.abs( touchDistance );
         touchStrength *= 0.5;
         setVibration( 0.5 + touchStrength);
         } else if(touchZone === "hovering"){
         var hoverStrength = 1 - touchDistance;
         setVibration(hoverStrength * 0.1);
         } else if(touchZone === "none"){
         setVibration(0);
         }
         }*/
    } else {
        setVibration(0);
    }
});

/**
 * Send Vibration parameter over WebSocket
 * @param strength
 */
function setVibration(strength) {
    if (connected) {
        socket.emit("vibration", {strength: strength});
    }
    console.log(strength);
}