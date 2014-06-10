var mmmInput = mmmInput || {};

mmmInput.TouchInput = mmmInput.TouchInput || {};

var TouchInput = mmmInput.TouchInput = function TouchInput(options) {
    options = options || {};
    this.element = options.element || null;
    this.ongoingTouches = [];
    this.onStart = options.onStart || null;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;

    _.bindAll(this, 'onTouchStart', 'onTouchEnd', 'onTouchMove', 'onTouchCancel');

    // listen for touch events
    if (this.element !== null) {
        this.element.addEventListener("touchstart", this.onTouchStart, false);
        this.element.addEventListener("touchend", this.onTouchEnd, false);
        this.element.addEventListener("touchcancel", this.onTouchCancel, false);
        this.element.addEventListener("touchleave", this.onTouchEnd, false);
        this.element.addEventListener("touchmove", this.onTouchMove, false);
    }
};

// Touch handling adapted from https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events
TouchInput.prototype.onTouchStart = function(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.ongoingTouches.push(this.copyTouch(touches[i]));
        var event = {x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier};
        this.onStart(event);
        this.onMove(event);
        this.onMove(event);
    }
}

TouchInput.prototype.onTouchMove = function(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        var idx = this.ongoingTouchIndexById(touches[i].identifier);

        if (idx >= 0) {
            this.onMove({x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier});
            this.ongoingTouches.splice(idx, 1, this.copyTouch(touches[i]));  // swap in the new touch record
        } else {
            console.log("can't figure out which touch to continue");
        }
    }
};

TouchInput.prototype.onTouchEnd = function(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        var idx = this.ongoingTouchIndexById(touches[i].identifier);

        if (idx >= 0) {
            this.onFinish({x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier});
            this.ongoingTouches.splice(idx, 1);  // remove it; we're done
        } else {
            console.log("can't figure out which touch to end");
        }
    }
};

TouchInput.prototype.onTouchCancel = function(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.ongoingTouches.splice(i, 1);  // remove it; we're done
    }
};

TouchInput.prototype.copyTouch = function(touch) {
    return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
};

TouchInput.prototype.ongoingTouchIndexById = function(idToFind) {
    for (var i = 0; i < this.ongoingTouches.length; i++) {
        var id = this.ongoingTouches[i].identifier;

        if (id == idToFind) {
            return i;
        }
    }
    return -1;    // not found
};