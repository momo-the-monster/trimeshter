var mmmInput = mmmInput || {};

mmmInput.MouseInput = mmmInput.MouseInput || {};

var MouseInput = mmmInput.MouseInput = function MouseInput(options) {
    options = options || {};
    this.element = options.element || null;
    this.onStart = options.onStart || null;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;

    _.bindAll(this, 'mouseDown', 'mouseMove', 'mouseUp');

    // listen for touch events
    if (this.element !== null) {
        this.element.addEventListener("mousedown", this.mouseDown, false);
        this.element.addEventListener("mousemove", this.mouseMove, false);
        this.element.addEventListener("mouseup", this.mouseUp, false);
    }
};

MouseInput.prototype.mouseMove = function(event) {
    event.preventDefault();
    var cursor = this.normalizePoint(event);
    this.onMove(cursor);
};

MouseInput.prototype.mouseDown = function(event) {
    event.preventDefault();
    var cursor = this.normalizePoint(event);
    this.onStart(cursor);
};

MouseInput.prototype.mouseUp = function(event) {
    var cursor = this.normalizePoint(event);
    this.onEnd(cursor);
};

MouseInput.prototype.normalizePoint = function(event) {
    return {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        id: 0
    }
};