var mmmInput = mmmInput || {};

mmmInput.TuioCursor = mmmInput.TuioCursor || {};

var TuioCursor = mmmInput.TuioCursor = function TuioCursor(options) {
    // Injections from Scene
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || this.element || null;

    var client = new Tuio.Client({
            host: "http://localhost:5000"
        });

    _.bindAll(this, 'onConnect', 'onAddTuioCursor', 'onUpdateTuioCursor', 'onRemoveTuioCursor');

    // bind incoming tuio socket calls to handling methods
    client.on("connect", this.onConnect);
    client.on("addTuioCursor", this.onAddTuioCursor);
    client.on("updateTuioCursor", this.onUpdateTuioCursor);
    client.on("removeTuioCursor", this.onRemoveTuioCursor);
    client.connect();
};

TuioCursor.prototype.onConnect = function() {
    console.log("Tuio Socket Connected");
};

TuioCursor.prototype.cursorToTouch = function(cursor){
    var touch =  {
        x: cursor.xPos,
        y: cursor.yPos,
        id: cursor.sessionId
    };
    return touch;
};

TuioCursor.prototype.onAddTuioCursor = function(cursor){
    this.dispatchEvent("cursor.start", cursor);
    this.dispatchEvent("cursor.move", cursor);
};

TuioCursor.prototype.onUpdateTuioCursor = function(cursor){
    this.dispatchEvent("cursor.move", cursor);
};

TuioCursor.prototype.onRemoveTuioCursor = function(cursor){
    this.dispatchEvent("cursor.end", cursor);
};

TuioCursor.prototype.dispatchEvent = function (label, source) {
    console.log(label, source.sessionId);
    var event = new CustomEvent(label,
        {
            detail: this.cursorToTouch(source),
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};