var mmmInput = mmmInput || {};

mmmInput.TouchInput = mmmInput.TouchInput || {};

var TouchInput = mmmInput.TouchInput = function TouchInput(options) {
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;

    _.bindAll(this, 'onTouchStart', 'onTouchEnd', 'onTouchMove');

    // listen for touch events
    if (this.element !== null) {
        this.element.addEventListener("touchstart", this.onTouchStart, false);
        this.element.addEventListener("touchend", this.onTouchEnd, false);
        this.element.addEventListener("touchcancel", this.onTouchEnd, false);
        this.element.addEventListener("touchleave", this.onTouchEnd, false);
        this.element.addEventListener("touchmove", this.onTouchMove, false);
    }
};

TouchInput.prototype.onTouchStart = function(event) {
    event.preventDefault();
    var touches = event.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        this.dispatchEvent("cursor.start", touches[i]);
    }
};

TouchInput.prototype.onTouchMove = function(event){
    event.preventDefault();
    var touches = event.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        this.dispatchEvent("cursor.move", touches[i]);
    }
};

TouchInput.prototype.onTouchEnd = function (event) {
    event.preventDefault();
    var touches = event.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        this.dispatchEvent("cursor.end", touches[i]);
    }
};

TouchInput.prototype.normalizePoint = function(touch){
    return {
        x: touch.clientX / window.innerWidth,
        y: touch.clientY / window.innerHeight,
        z: 0,
        id: touch.identifier
    }
};

TouchInput.prototype.dispatchEvent = function (label, source) {
//    console.log('dispatching', label);
    var event = new CustomEvent(label,
        {
            detail: this.normalizePoint(source),
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};