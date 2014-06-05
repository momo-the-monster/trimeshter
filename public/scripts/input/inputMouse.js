var el = document.getElementsByTagName("canvas")[0];
el.addEventListener("mousedown", mouseDown, false);
el.addEventListener("mousemove", mouseMove, false);
el.addEventListener("mouseup", mouseUp, false);

function mouseMove(event) {
    //   event.preventDefault();
    onMove({x: event.clientX, y: event.clientY, id:0});
}

function mouseDown(event) {
    //  event.preventDefault();
    onStart({x: event.clientX, y: event.clientY, id:0});
}

function mouseUp(event) {
    onFinish({x:event.clientX, y: event.clientY, id:0});
}