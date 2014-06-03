var ongoingTouches = new Array();

var el = document.getElementsByTagName("canvas")[0];
el.addEventListener("touchstart", touchStart, false);
el.addEventListener("touchend", touchEnd, false);
el.addEventListener("touchcancel", touchCancel, false);
el.addEventListener("touchleave", touchEnd, false);
el.addEventListener("touchmove", touchMove, false);

// Touch handling adapted from https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events
function touchStart(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        ongoingTouches.push(copyTouch(touches[i]));
        var event = {x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier};
        onStart(event);
        onMove(event);
        onMove(event);
    }
}

function touchMove(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;
    for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);

        if (idx >= 0) {
            onMove({x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier});
            ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
        } else {
            console.log("can't figure out which touch to continue");
        }
    }
}

function touchEnd(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);

        if (idx >= 0) {
            onFinish({x: touches[i].pageX, y: touches[i].pageY, id: touches[i].identifier});
            ongoingTouches.splice(idx, 1);  // remove it; we're done
        } else {
            console.log("can't figure out which touch to end");
        }
    }
}

function touchCancel(evt) {
    evt.preventDefault();
    var touches = evt.changedTouches;

    for (var i = 0; i < touches.length; i++) {
        ongoingTouches.splice(i, 1);  // remove it; we're done
    }
}

function copyTouch(touch) {
    return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
}

function ongoingTouchIndexById(idToFind) {
    for (var i = 0; i < ongoingTouches.length; i++) {
        var id = ongoingTouches[i].identifier;

        if (id == idToFind) {
            return i;
        }
    }
    return -1;    // not found
}