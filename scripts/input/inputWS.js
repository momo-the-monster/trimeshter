function wsTouchInit(){
    window.client = new Caress.Client({
        host: 'momolug.local',
        port: 3456
    });
    client.connect();

    client.socket.on('touchStart', wsStart);
    client.socket.on('touchMove', wsMove);
    client.socket.on('touchEnd', wsEnd);
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
    var event = {x: touch.screenX, y: touch.screenY, id: touch.identifier};
    onStart(event);
}

function wsMove(touch) {
    touch = wsTouchToLocal(touch);
    var event = {x: touch.screenX, y: touch.screenY, id: touch.identifier};
    onMove(event);
}

function wsEnd(touch) {
    touch = wsTouchToLocal(touch);
    var event = {x: touch.screenX, y: touch.screenY, id: touch.identifier};
    onFinish(event);
}