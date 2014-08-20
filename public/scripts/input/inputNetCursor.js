var mmmInput = mmmInput || {};

mmmInput.NetCursor = mmmInput.NetCursor || {};

var NetCursor = mmmInput.NetCursor = function NetCursor(options) {
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;
    this.autoConnect = options.autoConnect | true;
    this.connected = false;
    this.cursors = {};
    this.onStart = options.onStart || null;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;
    this.sendMouse = options.sendMouse || null;
    this.sendTouches = options.sendTouches || null;
    this.mouseDown = false;

    _.bindAll(this, 'connect', 'onConnect', 'onDisconnect', 'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onMouseMove', 'onMouseUp', 'onMouseDown', 'processCursorStart', 'processCursorMove', 'processCursorEnd');

    // listen for touch events
    if (this.element !== null && this.sendTouches === true) {
        this.element.addEventListener("touchstart", this.onTouchStart, false);
        this.element.addEventListener("touchend", this.onTouchEnd, false);
        this.element.addEventListener("touchcancel", this.onTouchEnd, false);
        this.element.addEventListener("touchleave", this.onTouchEnd, false);
        this.element.addEventListener("touchmove", this.onTouchMove, false);
    }

    // listen for mouse events
    if (this.element !== null && this.sendMouse === true) {
        this.element.addEventListener("mousemove", this.onMouseMove, false);
        this.element.addEventListener("mousedown", this.onMouseDown, false);
        this.element.addEventListener("mouseup", this.onMouseUp, false);
    }

    // autostart
    if(this.autoConnect){
        this.connect();
    }

};

NetCursor.prototype.connect = function () {
    this.socket = io.connect();
    this.socket.on("connect", this.onConnect);
    this.socket.on("disconnect", this.onDisconnect);
};

NetCursor.prototype.onConnect = function () {
    this.connected = true;

    this.socket.on('cursorStart', this.processCursorStart);
    this.socket.on('cursorMove', this.processCursorMove);
    this.socket.on('cursorEnd', this.processCursorEnd);

    console.log('Connected to Socket.io');
};

NetCursor.prototype.onDisconnect = function () {
    this.connected = false;

    // Send 'end' events for any active cursors
    for (var c in this.cursors) {
        var cursor = this.cursors[c];
        this.processCursorEnd( cursor );
    }

    // Clean up the cursor list
    this.cursors = {};

    console.log('Disconnected from Socket.io');
};

NetCursor.prototype.onMouseDown = function(event){
    event.preventDefault();
    this.mouseDown = true;
    this.socket.emit("cursorStart", this.mouseEventToCursor(event));
};

NetCursor.prototype.onMouseMove = function (event) {
    event.preventDefault();
    if(this.mouseDown){
        this.socket.emit("cursorMove", this.mouseEventToCursor(event));
    }
};

NetCursor.prototype.onMouseUp = function (event) {
    event.preventDefault();
    this.mouseDown = false;
    this.socket.emit("cursorEnd", this.mouseEventToCursor(event));
};

NetCursor.prototype.mouseEventToCursor = function(event){
    return {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        z: 0,
        id: 0
    }
};

NetCursor.prototype.onTouchStart = function(event) {
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.socket.emit("cursorStart", this.touchToCursor(touches[i]));
    }
};

NetCursor.prototype.onTouchMove = function(event){
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.socket.emit("cursorMove", this.touchToCursor(touches[i]));
    }
};

NetCursor.prototype.onTouchEnd = function (event) {
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.socket.emit("cursorEnd", this.touchToCursor(touches[i]));
    }
};

NetCursor.prototype.touchToCursor = function(touch){
    return {
        x: touch.clientX / window.innerWidth,
        y: touch.clientY / window.innerHeight,
        z: 0,
        id: touch.identifier
    }
};

NetCursor.prototype.processCursorStart = function( cursor ){
    this.dispatchEventFromCursor('cursor.start', cursor);
    this.cursors[cursor.id] = cursor;
};

NetCursor.prototype.processCursorMove = function (cursor) {
    this.dispatchEventFromCursor('cursor.move', cursor);
    if(this.cursors[cursor.id] !== undefined){
        this.cursors[cursor.id] = cursor;
    }
};

NetCursor.prototype.processCursorEnd = function (cursor) {
    this.dispatchEventFromCursor('cursor.end', cursor);
    delete this.cursors[cursor.id];
};

NetCursor.prototype.dispatchEventFromCursor = function(label, source){
    var event = new CustomEvent(label,
        {
            detail: source,
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};

NetCursor.prototype.dispatchEvent = function (label, source) {
    var event = new CustomEvent(label,
        {
            detail: this.normalizePoint(source),
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};