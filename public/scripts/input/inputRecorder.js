var mmmInput = mmmInput || {};

mmmInput.Recorder = mmmInput.Recorder || {};

var Recorder = mmmInput.Recorder = function Recorder(options) {
    // Injections from Scene
    options = options || {};
    this.element = options.element || null;
    this.dispatcher = options.dispatcher || null;
    this.nextId = 0;
    this.timeline = null;
    this.maxId = 0;
    var self = this;
    this.timeline = new TimelineMax({
        repeat: -1,
        onRepeat: function () {
            self.nextId = self.maxId + 1;
            console.log('new nextId is', self.nextId);
        }
    });
    // TODO: detect audio length, set timeline to be that long
    this.timeline.add(function () {
        console.log('the end')
    }, 20.283);

    this.sound = new Howl({
        src: ['../audio/get-you-loop.ogg'],
        loop: true,
        onplay: this.timeline.play
    });

    setInterval(this.matchTimelineToAudio.bind(this), 400);

    this.sound.play();

    // listen for cursor events
    if (this.element !== null) {
        this.element.addEventListener("cursor.start", this.onStart.bind(this), false);
        this.element.addEventListener("cursor.move", this.onMove.bind(this), false);
        this.element.addEventListener("cursor.end", this.onEnd.bind(this), false);
    }
};

Recorder.prototype.matchTimelineToAudio = function(){
    this.timeline.time(this.sound.seek() % this.sound._duration);
};

Recorder.prototype.onStart = function(event) {
    this.nextId++;
    event.detail.id += this.nextId;
    this.timeline.addCallback(function(){
        this.dispatchEvent(event);
    }, this.timeline.time(), null, this);
};

Recorder.prototype.onMove = function(event) {
    event.detail.id += this.nextId;
    this.timeline.addCallback(function(){
        this.dispatchEvent(event);
    }, this.timeline.time(), null, this);
};

Recorder.prototype.onEnd = function(event) {
    event.detail.id += this.nextId;
    this.maxId = Math.max(this.maxId, event.detail.id);
    this.timeline.addCallback(function(){
        this.dispatchEvent(event);
    }, this.timeline.time(), null, this);
};

Recorder.prototype.dispatchEvent = function(source){
    source.stopImmediatePropagation();
    source.preventDefault();

    var event =  new CustomEvent( source.type,
        {
            detail: source.detail,
            bubbles: false,
            cancelable: true
        }
    );
    this.dispatcher.dispatchEvent(event);
};