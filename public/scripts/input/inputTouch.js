var mmmInput = mmmInput || {};

mmmInput.TouchInput = mmmInput.TouchInput || {};

var TouchInput = mmmInput.TouchInput = function TouchInput(options) {
    options = options || {};
    this.ongoingTouches = [];
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;

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
//    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        console.log('start', touches[i]);
    }
};

TouchInput.prototype.onTouchMove = function(evt) {
    console.log('one big move');
//    evt.preventDefault();
    var touches = evt.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        console.log('move', touches[i]);
    }
};

TouchInput.prototype.onTouchEnd = function(evt) {
//    evt.preventDefault();
    var touches = evt.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        console.log('end', touches[i]);
    }
};

TouchInput.prototype.onTouchCancel = function(evt) {
//    evt.preventDefault();
    var touches = evt.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        console.log('cancel', touches[i]);
    }
};

TouchInput.prototype.normalizeTouch = function(touch) {
    console.log(touch);
    return {
        x: touch.clientX / window.innerWidth,
        y: touch.clientY / window.innerHeight,
        id: touch.identifier
    }
};

TouchInput.prototype.dispatchEvent = function (label, source) {
    var cursor = this.normalizeTouch(source);
    console.log('touch', label, cursor.id);
    var event = new CustomEvent(label,
        {
            detail: cursor,
            bubbles: false,
            cancelable: true
        }
    );
 //   console.log('dispatching', event);
    this.dispatcher.dispatchEvent(event);
};