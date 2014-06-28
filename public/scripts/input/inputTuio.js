var mmmInput = mmmInput || {};

mmmInput.TuioCursor = mmmInput.TuioCursor || {};

var TuioCursor = mmmInput.TuioCursor = function TuioCursor(options) {
    // Injections from Scene
    options = options || {};
    this.onStart = options.onStart || null;
    this.onMove = options.onMove || null;
    this.onEnd = options.onEnd || null;
    var client = new Tuio.Client({
            host: "http://localhost:5000"
        });
    var config = options.config || null;

    _.bindAll(this, 'onConnect', 'onAddTuioCursor', 'onUpdateTuioCursor', 'onRemoveTuioCursor');

    // Start with no drift
    config.drift.x = config.drift.y = config.drift.z = 0;

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
        clientX: window.innerWidth * cursor.xPos,
        clientY: window.innerHeight * cursor.yPos,
        pageX: document.documentElement.clientWidth * cursor.xPos,
        pageY: document.documentElement.clientHeight * cursor.yPos,
        screenX: screen.width * cursor.xPos,
        screenY: screen.height * cursor.yPos,
        identifier: cursor.sessionId
    };
    touch.x = touch.clientX;
    touch.y = touch.clientY;
    touch.id = cursor.sessionId;
    touch.target = document.elementFromPoint(touch.pageX, touch.pageY);
    return touch;
};

TuioCursor.prototype.onAddTuioCursor = function(cursor){
    var touch = this.cursorToTouch(cursor);
    if(this.onStart){
        this.onStart(touch);
    }
};

TuioCursor.prototype.onUpdateTuioCursor = function(cursor){
    var touch = this.cursorToTouch(cursor);
    if(this.onMove){
        this.onMove(touch);
    }
};

TuioCursor.prototype.onRemoveTuioCursor = function(cursor){
    var touch = this.cursorToTouch(cursor);
    if(this.onEnd){
        this.onEnd(touch);
    }
};