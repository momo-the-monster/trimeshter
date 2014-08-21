var mmmInput = mmmInput || {};

mmmInput.MyoInput = mmmInput.MyoInput || {};

var MyoInput = mmmInput.MyoInput = function MyoInput(options) {
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;
    this.movementLocked = true;
    this.config = options.config || null;
    this.oPrev = {x:0, y:0, z:0};

    this.connection = new WebSocket('ws://localhost:7204/myo/1');
    this.connection.onopen = function(){
        /*Send a small message to the console once the connection is established */
        console.log('Connection open!');
    };

    var self = this;
    this.connection.onmessage = function(e){
        var message = JSON.parse(e.data);
        if(message[0] === "event") {
            var event = message[1];
            if(event.type === "pose"){
                self.onPose(event.pose);
            } else if(event.type === "orientation") {
                self.onOrientation(event);
            } else if(event.type === "paired") {
            } else if(event.type === "connected") {
            } else if(event.type === "disconnected") {
            } else if(event.type === "arm_recognized") {
            } else if(event.type === "arm_lost") {
            } else if(event.type === "rssi"){
            } else {
                // unhandled event type
            }
        } else {
            return;
        }
    };

    this.connection.onclose = function(){
        console.log('Connection closed');
    };

    this.connection.onerror = function(error){
        console.log('Error detected: ' + error);
    };
};

MyoInput.prototype.onPose = function(pose) {
    if(pose === "fist"){
        this.movementLocked = false;
    } else if(pose === "rest"){
        this.oPrev.x = this.oPrev.y = this.oPrev.z = 0;
        this.movementLocked = true;
    } else if(pose === "fingers_spread"){
        this.config.drift.x = this.config.drift.y = this.config.drift.z = 0;
    }
};

MyoInput.prototype.onOrientation = function(event){
    if(!this.movementLocked){
        var o = event.orientation;
        var a = event.accelerometer;
        var g = event.gyroscope;
        // o.z is -0.5 straight out, 0 when straight up
        if(this.oPrev.z != 0) {
            var diff = this.oPrev.z - o.z;
            var newY = this.config.drift.y + (diff * 3);
            if (newY < -3) newY = -3;
            if (newY > 3) newY = 3;
            this.config.drift.y = newY;
            this.oPrev.z = o.z;
        } else {
            this.oPrev.z = o.z;
        }

        if(this.oPrev.x != 0) {
            var diff = this.oPrev.x - o.x;
            var newZ = this.config.drift.z + (diff * 3);
            if (newZ < -3) newZ = -3;
            if (newZ > 3) newZ = 3;
            this.config.drift.z = newZ;
            this.oPrev.x = o.x;
        } else {
            this.oPrev.x = o.x;
        }

    }
};

MyoInput.prototype.dispatchEvent = function(label, source){
    var event =  new CustomEvent( label,
        {
            detail: {foo: "bar"},
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};