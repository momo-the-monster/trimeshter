var mmmInput = mmmInput || {};

var NetCursor = mmmInput.NetCursor = function NetCursor(options) {
    options = options || {};
    this.element = options.element || null;
    this.connected = false;
    this.cursors = {};
    this.touches = [];
    this.start = options.start || null;
    this.move = options.move || null;
    this.end = options.end || null;
    this.sendMouse = options.sendMouse || null;
    this.sendTouches = options.sendTouches || null;
    this.mouseDown = false;

    _.bindAll(this, 'connect', 'onConnect', 'onDisconnect', 'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onMouseMove', 'onMouseUp', 'onMouseDown', 'processCursorStart', 'processCursorMove', 'processCursorEnd');

    if (this.element !== null && this.sendTouches === true) {
        this.element.addEventListener("touchstart", this.onTouchStart, false);
        this.element.addEventListener("touchend", this.onTouchEnd, false);
        this.element.addEventListener("touchcancel", this.onTouchEnd, false);
        this.element.addEventListener("touchleave", this.onTouchEnd, false);
        this.element.addEventListener("touchmove", this.onTouchMove, false);
    }

    if (this.element !== null && this.sendMouse === true) {
        this.element.addEventListener("mousemove", this.onMouseMove, false);
        this.element.addEventListener("mousedown", this.onMouseDown, false);
        this.element.addEventListener("mouseup", this.onMouseUp, false);
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

    // Clean up all the TUIO and touch lists
    this.touches = [];
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
    console.log('x', event.clientX / this.element.width);
    return {
        x: event.clientX / this.element.width,
        y: event.clientY / this.element.height,
        z: 0,
        id: 0
    }
};

NetCursor.prototype.onTouchStart = function(event) {
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.touches.push( touches[i] );
        this.socket.emit("cursorStart", this.touchToCursor(touches[i]));
    }

};

NetCursor.prototype.onTouchMove = function(event){
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        var idx = this.touchIndexFromId(touches[i].identifier);
        this.touches.splice(idx, 1, touches[i]);  // swap in the new touch record
        this.socket.emit("cursorMove", this.touchToCursor(touches[i]));
    }

};

NetCursor.prototype.onTouchEnd = function (event) {
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.socket.emit("cursorEnd", this.touchToCursor(touches[i]));
        var idx = this.touchIndexFromId(touches[i].identifier);
        ongoingTouches.splice(idx, 1);  // remove it; we're done
    }
};

NetCursor.prototype.touchIndexFromId = function(idToFind) {
    for (var i = 0; i < this.touches.length; i++) {
        var id = this.touches[i].identifier;

        if (id == idToFind) {
            return i;
        }
    }
    return -1;    // not found
};

NetCursor.prototype.touchToCursor = function(touch){
    return {
        x: touch.clientX / this.element.width,
        y: touch.clientY / this.element.height,
        z: 0,
        id: touch.identifier
    }
};

NetCursor.prototype.processCursorStart = function( cursor ){
    var touch = this.cursorToTouch(cursor);
    if(this.start){
        this.start(touch);
    }
    this.cursors[cursor.id] = cursor;
};

NetCursor.prototype.processCursorMove = function (cursor) {
    if(this.cursors[cursor.id] !== undefined){
        var touch = this.cursorToTouch(cursor);
        if(this.move){
            this.move(touch);
        }
        this.cursors[cursor.id] = cursor;
    }
};

NetCursor.prototype.processCursorEnd = function (cursor) {
    var touch = this.cursorToTouch(cursor);
    if(this.end){
        this.end(touch);
    }
    delete this.cursors[cursor.id];
};

NetCursor.prototype.getCursor = function (id) {
    return this.cursors[id];
};

NetCursor.prototype.getCursors = function () {
    return this.cursors;
};

NetCursor.prototype.cursorToTouch = function(cursor){
    var touch =  {
        clientX: window.innerWidth * cursor.x,
        clientY: window.innerHeight * cursor.y,
        pageX: document.documentElement.clientWidth * cursor.x,
        pageY: document.documentElement.clientHeight * cursor.y,
        screenX: screen.width * cursor.x,
        screenY: screen.height * cursor.y,
        identifier: cursor.id
    };
    touch.target = document.elementFromPoint(touch.pageX, touch.pageY);
    return touch;
};