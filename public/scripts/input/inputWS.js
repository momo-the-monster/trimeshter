var socket;

function wsTouchInit(){
    socket = io.connect();

    socket.on('touchStart', wsStart);
    socket.on('touchMove', wsMove);
    socket.on('touchEnd', wsEnd);
}

$(function () {
    wsTouchInit();
});

function wsTouchToLocal(touch) {
    touch.clientX = window.innerWidth * touch.x;
    touch.clientY = window.innerHeight * touch.y;
    touch.pageX = document.documentElement.clientWidth * touch.x;
    touch.pageY = document.documentElement.clientHeight * touch.y;
    touch.target = document.elementFromPoint(touch.pageX, touch.pageY);
    touch.screenX = screen.width * touch.x;
    touch.screenY = screen.height * touch.y;
    return touch;
}

function wsStart(touch) {
    touch = wsTouchToLocal(touch);
    var event = {x: touch.clientX, y: touch.clientY, id: touch.id};
    onStart(event);
}

function wsMove(touch) {
    touch = wsTouchToLocal(touch);
    var event = {x: touch.clientX, y: touch.clientY, id: touch.id};
    onMove(event);
}

function wsEnd(touch) {
    touch = wsTouchToLocal(touch);
    var event = {x: touch.clientX, y: touch.clientY, id: touch.id};
    onFinish(event);
}