var mmmInput = mmmInput || {};

mmmInput.MouseInput = mmmInput.MouseInput || {};

var MouseInput = mmmInput.MouseInput = function MouseInput(options) {
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;

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
    this.dispatchEvent("cursor.move", event);
};

MouseInput.prototype.mouseDown = function(event) {
    event.preventDefault();
    this.dispatchEvent("cursor.start", event);
};

MouseInput.prototype.mouseUp = function(event) {
    event.preventDefault();
    this.dispatchEvent("cursor.end", event);
};

MouseInput.prototype.dispatchEvent = function(label, source){
    var event =  new CustomEvent( label,
        {
            detail: this.normalizePoint(source),
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};

MouseInput.prototype.normalizePoint = function(event) {
    return {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
        id: 0
    }
};