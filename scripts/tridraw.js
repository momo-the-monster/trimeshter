var camera, scene, renderer, projector;
var wall;
var allPoints = [];
var allMeshes = new Array();
var mouse;

var selectionMeshes = [];

var geoTri;
var matDefault;
var matSelection;

var materials;
var imagePath = '../images/';

var ongoingTouches = new Array();

var config = {
    mirror:true,
    connectToSelection:false,
    tween:true
};

var init = function () {

    renderer = new THREE.WebGLRenderer( {antialias:true} );

    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
    projector = new THREE.Projector();
    camera.position.z = 100;

    // THREEx plugins
    THREEx.WindowResize(renderer, camera);

    scene = new THREE.Scene();

    // Spring Palette from http://www.colourlovers.com/palette/3365617/spring
    var palette = [
        [45,59,96],
        [248,99,99],
        [255,255,255],
        [176,243,176],
        [169,249,245]
    ];

    materials = buildMaterials( palette );
//    materials = buildMaterialsFromFiles();

    registerListeners();

    // Make wall for mouse intersection
    wall = new THREE.Mesh(new THREE.PlaneGeometry(2000,2000), new THREE.MeshBasicMaterial({color:0x89898900, wireframe:true}));

    // Set Default objects
    geoTri = buildMasterObject();
    matSelection = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe:true, side: THREE.DoubleSide } );

};

function buildMasterObject(){
    // Set Default objects
   var triangle = new THREE.Shape([
        new THREE.Vector2 (-0.5,  -0.75),
        new THREE.Vector2 (0.5, -0.75),
        new THREE.Vector2 (0, 0)
    ]);

//	var geometry = new THREE.ExtrudeGeometry(triangle, { amount:2 });
    var geometry = triangle.makeGeometry();
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

    geometry.faceVertexUvs[0][0][0] = new THREE.Vector2( -1, 0 );
    geometry.faceVertexUvs[0][0][2] = new THREE.Vector2( 1, 0 );
    geometry.faceVertexUvs[0][0][1] = new THREE.Vector2( 0, 1 );

    return geometry;
}

/**
 * Generate materials from color palette
 * @param palette
 * @returns {Array}
 */
function buildMaterials( palette ){
    var result = [];
    var width = 256;
    var height = 256;

    for( var i in palette ){
        var color = palette[i];

        // Prepare off-screen canvas
        var bitmap = document.createElement('canvas');
        var ctx = bitmap.getContext('2d');
        bitmap.width = 256;
        bitmap.height = 256;

        // Draw Gradient
        var grd = ctx.createLinearGradient(0,0,0,height);  //x0, y0, x1, y1
        grd.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
        grd.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',1)');

        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        var texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;

        // Push generated texture into array as Material
        result.push(
            new THREE.MeshBasicMaterial({
                transparent:true,
                map:texture,
                side: THREE.DoubleSide
            })
        );
    }

    return result;
}

/**
 * Build and return array of Materials
 * @returns {Array}
 */
function buildMaterialsFromFiles(){
    var result = [];

    var images = [
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/18.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/1.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/6.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/12.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/16.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/17.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/15.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/21.png",
        "https://s3-us-west-2.amazonaws.com/s.cdpn.io/108947/20.png"
    ];
    images = [imagePath + "green_gradient.png"];

    for (var i = 0; i < images.length; i++) {
        var path = images[i];
        var texture = THREE.ImageUtils.loadTexture( path );

        result.push ( new THREE.MeshLambertMaterial( { transparent:true, map: texture, wireframe:true, side: THREE.DoubleSide} ));

    }

    return result;
}

/**
 * Listen for mouse and touch events
 */
function registerListeners(){

    var el = document.getElementsByTagName("canvas")[0];
    el.addEventListener("touchstart", handleStart, false);
    el.addEventListener("touchend", handleEnd, false);
    el.addEventListener("touchcancel", handleCancel, false);
    el.addEventListener("touchleave", handleEnd, false);
    el.addEventListener("touchmove", handleMove, false);

    mouse = {x:0,y:0};

 //   document.addEventListener( 'mousemove', onMouseMove, false );
 //   document.addEventListener( 'mousedown', onMouseDown, false );

}

function addSelectionMeshes(touchid){
    var numSelectionsToMake = config.mirror ? 2 : 1;
    // Create and Add all selection meshes
    for ( var i = 0; i < numSelectionsToMake; i++ ) {
        var mesh = new THREE.Mesh( geoTri.clone(), matSelection.clone() );
        mesh.geometry.dynamic = true;
        mesh.touchid = touchid;
        selectionMeshes.push( mesh );
        scene.add( mesh );
    }
}

function removeSelectionMeshes(touchid){
    for( var i = selectionMeshes.length - 1; i >= 0; i--){
        if(selectionMeshes[i].touchid == touchid){
            var mesh = selectionMeshes.splice(i,1)[0];
            scene.remove(mesh);
        }
    }
}

/**
 * Update all selection meshes
 * Render Scene
 * Call requestAnimationFrame(self)
 */
var animate = function () {

//    for( var i = 0; i < allMeshes.length; i++){
//        var mesh = allMeshes[i];
//        for( var v = 0; v < mesh.geometry.vertices.length; v++){
//            var vertex = mesh.geometry.vertices[v];
//            vertex.z -= (Math.abs(vertex.z + 0.00000001) * 1.00000001);
//            /*
//            if(vertex.x > 0) {
//                vertex.x -= 0.001;
//            } else {
//                vertex.x += 0.001;
//            }
//            */
//        }
//        mesh.geometry.verticesNeedUpdate = true;
//    }

    for (var i = selectionMeshes.length - 1; i >= 0; i--) {
        selectionMeshes[i].geometry.verticesNeedUpdate = true;
    }

    requestAnimationFrame( animate );
    renderer.render( scene, camera );
};

// Touch handling adapted from https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Touch_events
function handleStart(evt) {
    evt.preventDefault();

    var el = document.getElementsByTagName("canvas")[0];
    var ctx = el.getContext("2d");
    var touches = evt.changedTouches;

    for (var i=0; i < touches.length; i++) {
        ongoingTouches.push(copyTouch(touches[i]));
        var event = {x: touches[i].pageX, y:touches[i].pageY, id:touches[i].identifier};
        onStart(event);
        onMove(event);
        onMove(event);
    }
}

function handleMove(evt) {
    evt.preventDefault();
    var el = document.getElementsByTagName("canvas")[0];
    var ctx = el.getContext("2d");
    var touches = evt.changedTouches;
    for (var i=0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);

        if(idx >= 0) {
            onMove({x: touches[i].pageX, y: touches[i].pageY, id:touches[i].identifier});
            ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
        } else {
            console.log("can't figure out which touch to continue");
        }
    }
}

function handleEnd(evt) {
    evt.preventDefault();
    var el = document.getElementsByTagName("canvas")[0];
    var ctx = el.getContext("2d");
    var touches = evt.changedTouches;

    for (var i=0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);

        if(idx >= 0) {
            onFinish({x: touches[i].pageX, y: touches[i].pageY, id:touches[i].identifier});
            ongoingTouches.splice(idx, 1);  // remove it; we're done
        } else {
            console.log("can't figure out which touch to end");
        }
    }
}

function handleCancel(evt) {
    evt.preventDefault();
    console.log("touchcancel.");
    var touches = evt.changedTouches;

    for (var i=0; i < touches.length; i++) {
        ongoingTouches.splice(i, 1);  // remove it; we're done
    }
}

function copyTouch(touch) {
    return { identifier: touch.identifier, pageX: touch.pageX, pageY: touch.pageY };
}

function copyLeapTouch(touch){
    return {identifier: touch.id, pageX: touch.x, pageY: touch.y };
}

function ongoingTouchIndexById(idToFind) {
    for (var i=0; i < ongoingTouches.length; i++) {
        var id = ongoingTouches[i].identifier;

        if (id == idToFind) {
            return i;
        }
    }
    return -1;    // not found
}

function onMouseMove( event ) {
 //   event.preventDefault();
    onMove({x:event.clientX, y:event.clientY});
}

function onMouseDown( event) {
  //  event.preventDefault();
    onFinish({x:event.clientX, y:event.clientY});
}

function onStart( event ){
    addSelectionMeshes(event.id);
}

function onMove( event ) {

    mouse.x = ( event.x / renderer.domElement.width ) * 2 - 1;
    mouse.y = - ( event.y / renderer.domElement.height ) * 2 + 1;
//	mouse.z = getRandomArbitrary(-10, 10);
    mouse.z = 0;

    var position = getWorldPosition( mouse.x, mouse.y );
    if( position ) {

        for (var i = selectionMeshes.length - 1; i >= 0; i--) {

            var mesh = selectionMeshes[i];

            if (mesh.touchid == event.id) {

                // set third vertex to cursor position
                var vertex = mesh.geometry.vertices[2];
                var isEven = (i % 2 == 0);

                if (isEven && config.mirror) {
                    var middle = window.innerWidth / 2;
                    var isRightSide = (position.x > 0);
                    var offset = Math.abs(position.x);
                    if (isRightSide) {
                        // Flip to Left Side
                        vertex.x = -offset;
                    } else {
                        // Flip to Right Side
                        vertex.x = offset;
                    }
                } else {
                    vertex.x = position.x;
                }

                var sortedPoints = [];

                allPoints.forEach(function (point) {
                    sortedPoints.push({ x: point.x, y: point.y, d: point.distanceTo(vertex)});
                });

                // search through selection meshes, too
                if(config.connectToSelection){
                    selectionMeshes.forEach(function (mesh){
                        if(mesh.touchid != event.id){
                            for(var i = 0; i < 3; i++){
                                var point = mesh.geometry.vertices[i];
                                sortedPoints.push({x: point.x, y:point.y, d:point.distanceTo(vertex)});
                            }
                        }
                    });
                }

                sortByKey(sortedPoints, "d");

                vertex.y = position.y;
                vertex.z = mouse.z;

                vertex = mesh.geometry.vertices[0];
                var targetPoint = sortedPoints[0] || new THREE.Vector2(0,0);
                vertex.x = targetPoint.x;
                vertex.y = targetPoint.y;

                // Make sure picked points have some space between them
                var secondPointIndex = 1;
                var tooSmall = true;
                while (tooSmall) {
                    var secondPoint = sortedPoints[ secondPointIndex ];
                    if(secondPoint){
                        var innerDistance = new THREE.Vector2(secondPoint.x, secondPoint.y).distanceTo(sortedPoints[0]);
                        tooSmall = ( innerDistance < 2 );
                        secondPointIndex++;
                    } else {
                        secondPointIndex = 0;
                        tooSmall = false;
                    }
                }

                var targetVertex = mesh.geometry.vertices[1];
                targetPoint = sortedPoints[ secondPointIndex ] || new THREE.Vector2(0,0);
                targetVertex.x = targetPoint.x;
                targetVertex.y = targetPoint.y;

            }
        }

    }

}

function onFinish( event ) {

    // set mouse data
    mouse.x = ( event.x / renderer.domElement.width ) * 2 - 1;
    mouse.y = - ( event.y / renderer.domElement.height ) * 2 + 1;

    var position = getWorldPosition( mouse.x, mouse.y );
    if( position ) {
        // get material to share for all new meshes
        var material = getRandomMaterial();

        for (var i = selectionMeshes.length - 1; i >= 0; i--) {
            var mesh = selectionMeshes[i];

            if(mesh.touchid == event.id){
                // add new Mesh to scene
                var meshClone = new THREE.Mesh( mesh.geometry.clone(), material );
             //   meshClone.overdraw = true;
                meshClone.geometry.dynamic = true;
                allMeshes.push( meshClone);
                scene.add( meshClone );

                if(config.tween) {
                    TweenMax.to(meshClone, 5, {
                        onUpdate: onTweenUpdate,
                        onComplete: onTweenComplete,
                        ease: Cubic.easeInOut,
                        delay: 1,
                        repeat: 0,
                        yoyo: false
                    });
                }

                function onTweenUpdate(){
                    var mesh = this.target;
                    var d = this.progress();
                    mesh.position.setZ( d * -800 );
                }

                function onTweenComplete(){
                    scene.remove(this.target);
                }

                allPoints.push( meshClone.geometry.vertices[0]);
                allPoints.push( meshClone.geometry.vertices[1]);
                allPoints.push( meshClone.geometry.vertices[2]);

                // remove duplicate points from allPoints
                allPoints = allPoints.filter( function( item, index, inputArray ) {
                    return inputArray.indexOf(item) == index;
                });

            }
        }

        removeSelectionMeshes(event.id);
    }
}

function getRandomMaterial() {
    return materials[ Math.floor( Math.random() * materials.length  )];
}

function getWorldPosition( x, y ) {
    var vector = new THREE.Vector3(  x, y, 0 );
    projector.unprojectVector( vector, camera );

    var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
    var intersects = raycaster.intersectObjects( [wall] );

    if ( intersects.length > 0 ){
        return( intersects[0].point );
    } else {
        return false;
    }
}

function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

// Returns a random number between min and max
function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

init();
animate();