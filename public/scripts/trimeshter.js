var mmm = mmm || {};

var Trimeshter = mmm.Trimeshter = function Trimeshter(options) {

    var camera = {};               // Three.js scene objects
    var renderer = {};
    var projector = {};
    var scene = {};
    var wall = {};                 // Touch points intersect the wall to find scene positions
    var allMeshes = [];            // Generated mesh items stored here
    var selectionMeshes = [];      // In-progress selection meshes
    var geoTri = {};               // Master object used to create new meshes
    var materialSelection = {};    // Material applied to selection meshes
    var materials = [];            // Currently selected material array
    var materialsSolid = [];       // Solid material array, used by default
    var materialsWire = [];        // Wireframe material array, selectable in GUI
    var canvas = options.canvas;
    var dispatcher = options.input;
    var gui = {};
    var starfield = {};
    var allPoints = [];
    var octree;
    var framesSinceRebuild = 0;
    var waitUntilRebuild = 30;
    var bgTexture;
    // Background Scene
    var backgroundScene, backgroundCamera;

    // Trimeshter is self-initializing!
    init();

    /**
     * Calls all init modules
     */
    function init() {
        config = initConfig();
        initInput();
        gui = initGui();
        initThree();
        initMaterials();
        initStarfield();
        animate();

        octree = new THREE.Octree({
            radius: 1, // optional, default = 1, octree will grow and shrink as needed
            undeferred: false, // optional, default = false, octree will defer insertion until you call octree.update();
            depthMax: Infinity, // optional, default = Infinity, infinite depth
            objectsThreshold: 8, // optional, default = 8
            overlapPct: 0.15, // optional, default = 0.15 (15%), this helps sort objects that overlap nodes
            //       scene: scene // optional, pass scene as parameter only if you wish to visualize octree
        });
    }

    /**
     * Setup custom config settings
     * These are all adjustable from dat.GUI
     */
    function initConfig() {
        return {
            mirror: true,
            connectToSelf: false,
            randomZ: 0,
            wireframe: false,
            tween: {
                active: true,
                growDuration: 0.5,
                lifetime: 10
            },
            drift: {
                x: 0.0,
                y: 0.0,
                z: 0.0
            },
            rDrift: {
                x: 0.0,
                y: 0.0,
                z: 0.0
            },
            starfield: {
                bounds: {
                    x: 220,
                    y: 90,
                    z: 300
                },
                count: 1000
            }
        }
    }

    /**
     * Add event listeners to canvas
     */
    function initInput(){
        dispatcher.addEventListener("cursor.start", onStart, false);
        dispatcher.addEventListener("cursor.move", onMove, false);
        dispatcher.addEventListener("cursor.end", onEnd, false);
    }

    /**
     * Set up Dat.GUI controls
     */
    function initGui() {
        var gui = new dat.GUI();

        gui.remember(config);
        gui.remember(config.drift);
        gui.remember(config.tween);

        var guiBuild = gui.addFolder("Building");
        guiBuild.add(config, 'mirror');
        guiBuild.add(config, 'connectToSelf');
        var wframe = guiBuild.add(config, 'wireframe');
        wframe.onChange(function (value) {
            materials = value ? materialsWire : materialsSolid
        });
        guiBuild.add(config, 'randomZ', 0, 100);
        guiBuild.open();

        var guiTween = gui.addFolder("Tween");
        guiTween.add(config.tween, 'active');
        guiTween.add(config.tween, 'growDuration', 0, 3);
        guiTween.add(config.tween, 'lifetime', 3, 100);

        var guiDrift = gui.addFolder("Drift");
        guiDrift.add(config.drift, 'x', -1, 1);
        guiDrift.add(config.drift, 'y', -1, 1).listen();
        guiDrift.add(config.drift, 'z', -3, 0.1).listen();
        guiDrift.open();

        var guiRDrift = gui.addFolder("Rotate");
        guiRDrift.add(config.rDrift, 'x', -1, 1);
        guiRDrift.add(config.rDrift, 'y', -1, 1);
        guiRDrift.add(config.rDrift, 'z', -3, 3).listen();
        guiRDrift.open();

        return gui;
    }

    /**
     * Set up THREE.js scene
     */
    function initThree() {
        renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});

        renderer.setSize(window.innerWidth, window.innerHeight);
//        document.body.appendChild(renderer.domElement);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        projector = new THREE.Projector();
        camera.position.z = 100;

        // THREEx plugins
        THREEx.WindowResize(renderer, camera);

        scene = new THREE.Scene();

        // Make wall for pointer intersection
        wall = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshBasicMaterial({color: 0x89898900}));

        // Set Default objects
        geoTri = buildMasterObject();
        materialSelection = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false, side: THREE.DoubleSide });

        initThreeBG();
    }

    function initThreeBG() {
        // Load the background texture
        bgTexture = THREE.ImageUtils.loadTexture('images/sparklysq.jpg');
        bgTexture.wrapS = bgTexture.wrapT = THREE.MirroredRepeatWrapping;
        bgTexture.repeat.set(0.5,0.5);
        bgTexture.needsUpdate = true;
        var material = new THREE.MeshBasicMaterial({
            map: bgTexture
        });
        var backgroundMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2, 0),
            material
        );

        backgroundMesh.material.depthTest = false;
        backgroundMesh.material.depthWrite = false;

        // Create your background scene
        backgroundScene = new THREE.Scene();
        backgroundCamera = new THREE.Camera();
        backgroundScene.add(backgroundCamera);
        backgroundScene.add(backgroundMesh);

    }

    /**
     * Create materials array to use
     * There are several palettes to choose from
     * And we generate a solid and wireframe array of our chosen palette
     */
    function initMaterials() {
        // Spring Palette from http://www.colourlovers.com/palette/3365617/spring
        var springPalette = [
            [45, 59, 96],
            [248, 99, 99],
            [255, 255, 255],
            [176, 243, 176],
            [169, 249, 245]
        ];

        // BlacknBlue from http://www.colourlovers.com/palette/3370153/blacknblue
        var blacknblue = [
            [68, 68, 68],
            [8, 226, 255],
            [14, 96, 107],
            [230, 230, 230],
            [163, 172, 173]
        ];

        // Custom mix
        var pl1 = [
            [68, 68, 68],
            [8, 226, 255],
            [14, 96, 107],
            [230, 230, 230],
            [163, 172, 173],
            [250, 2, 60],
            [255, 0, 170],
            [92, 240, 212]
        ];

        materialsSolid = buildMaterials(pl1, false);
        materialsWire = buildMaterials(pl1, true);

        materials = materialsSolid;
    }

    /**
     * Create the object that will be cloned to create all new objects
     * @returns Geometry
     */
    function buildMasterObject() {
        var triangle = new THREE.Shape([
            new THREE.Vector2(-0.5, -0.75),
            new THREE.Vector2(0.5, -0.75),
            new THREE.Vector2(0, 0)
        ]);

        //	var geometry = new THREE.ExtrudeGeometry(triangle, { amount:2 });
        var geometry = triangle.makeGeometry();
        geometry.computeFaceNormals();
        geometry.computeVertexNormals();

        geometry.faceVertexUvs[0][0][0] = new THREE.Vector2(-1, 0);
        geometry.faceVertexUvs[0][0][2] = new THREE.Vector2(1, 0);
        geometry.faceVertexUvs[0][0][1] = new THREE.Vector2(0, 1);

        return geometry;
    }

    /**
     * Generate materials from color palette
     * @param palette
     * @param wireframe
     * @returns {Array}
     */
    function buildMaterials(palette, wireframe) {
        var result = [];
        var width = 256;
        var height = 256;

        for (var i in palette) {
            var color = palette[i];

            // Prepare off-screen canvas
            var bitmap = document.createElement('canvas');
            var ctx = bitmap.getContext('2d');
            bitmap.width = 256;
            bitmap.height = 256;

            // Draw Gradient
            var grd = ctx.createLinearGradient(0, 0, 0, height);  //x0, y0, x1, y1
            grd.addColorStop(0, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',0)');
            grd.addColorStop(1, 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',1)');

            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, width, height);

            var texture = new THREE.Texture(bitmap);
            texture.needsUpdate = true;

            // Push generated texture into array as Material
            result.push(
                new THREE.MeshBasicMaterial({
                    transparent: true,
                    map: texture,
                    wireframe: wireframe,
                    side: THREE.DoubleSide
                })
            );
        }

        return result;
    }

    /**
     * Create starfield particles
     */
    function initStarfield() {
        starfield = new THREE.Object3D();

        var star;
        var material = generateStarMaterial();

        for (var i = 0; i < config.starfield.count; ++i) {
            star = new THREE.Particle(material);
            star.position.x = getRandomArbitrary(-config.starfield.bounds.x, config.starfield.bounds.x);
            star.position.y = getRandomArbitrary(-config.starfield.bounds.y, config.starfield.bounds.y);
            star.position.z = getRandomArbitrary(-config.starfield.bounds.z, config.starfield.bounds.z / 4);

            starfield.add(star);
        }

        scene.add(starfield);
    }

    /**
     * Create star-like material
     * From http://threejs.org/examples/#canvas_particles_sprites
     * @returns {THREE.SpriteMaterial}
     */
    function generateStarMaterial() {
        // Prepare off-screen canvas
        var bitmap = document.createElement('canvas');
        var ctx = bitmap.getContext('2d');
        bitmap.width = 16;
        bitmap.height = 16;

        // Draw Gradient
        var gradient = ctx.createRadialGradient(bitmap.width / 2, bitmap.height / 2, 0, bitmap.width / 2, bitmap.height / 2, bitmap.width / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(64,64,64,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, bitmap.width, bitmap.height);

        var texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;

        var material = new THREE.SpriteMaterial({
            map: texture,
            blending: THREE.AdditiveBlending
        });

        return material;
    }

    /**
     * Add selection mesh to scene and selectionMeshes array
     * @param touchid
     */
    function addSelectionMeshes(touchid) {
        var numSelectionsToMake = config.mirror ? 2 : 1;
        // Create and Add all selection meshes
        for (var i = 0; i < numSelectionsToMake; i++) {
            //        var material = getRandomMaterial();
            //        var material = materialsSolid[3];
            var material = materialSelection;
            var mesh = new THREE.Mesh(geoTri.clone(), material.clone());
            mesh.geometry.dynamic = true;
            mesh.touchid = touchid;
            selectionMeshes.push(mesh);
            scene.add(mesh);
        }
    }

    /**
     * Removes selection mesh created by target touch id
     * Splices from selectionMeshes array and removes from scene
     * @param touchid
     */
    function removeSelectionMeshes(touchid) {
        for (var i = selectionMeshes.length - 1; i >= 0; i--) {
            if (selectionMeshes[i].touchid == touchid) {
                var mesh = selectionMeshes.splice(i, 1)[0];
                scene.remove(mesh);
            }
        }
    }

    /**
     * Update all selection meshes
     * Render Scene
     * Call requestAnimationFrame(self)
     */
    function animate(time) {

        framesSinceRebuild++;
        if (octree && framesSinceRebuild >= waitUntilRebuild) {
            octree.rebuild();
            framesSinceRebuild = 0;
        }

        //  if (config.drift.x != 0 || config.drift.y != 0 || config.drift.z != 0) {
        if (true) {
            //   bgTexture.offset.y += config.drift.y;
            bgTexture.offset.x -= config.drift.x * 0.002;
            bgTexture.offset.y -= config.drift.y * 0.002;

            for (var i = 0; i < allMeshes.length; i++) {
                var mesh = allMeshes[i];
                for (var v = 0; v < mesh.geometry.vertices.length; v++) {
                    var vertex = mesh.geometry.vertices[v];
                    vertex.x += config.drift.x;
                    vertex.y += config.drift.y;
                    vertex.z += config.drift.z;

                    vertex.applyAxisAngle(new THREE.Vector3(config.rDrift.x, config.rDrift.y, config.rDrift.z), 0.01);
                }
                mesh.geometry.verticesNeedUpdate = true;
            }

            starfield.children.forEach(function (star) {
                star.position.x += config.drift.x;
                star.position.y += config.drift.y;
                star.position.z += config.drift.z;

                if (star.position.x > config.starfield.bounds.x) {
                    star.position.x = -config.starfield.bounds.x;
                }
                if (star.position.x < -config.starfield.bounds.x) {
                    star.position.x = config.starfield.bounds.x;
                }
                if (star.position.y > config.starfield.bounds.y) {
                    star.position.y = -config.starfield.bounds.y;
                }
                if (star.position.y < -config.starfield.bounds.y) {
                    star.position.y = config.starfield.bounds.y;
                }
                if (star.position.z > config.starfield.bounds.z) {
                    star.position.z = -config.starfield.bounds.z;
                }
                if (star.position.z < -config.starfield.bounds.z) {
                    star.position.z = config.starfield.bounds.z;
                }
            });

        }

        for (var i = selectionMeshes.length - 1; i >= 0; i--) {
            var mesh = selectionMeshes[i];

            for (var v = 0; v < mesh.geometry.vertices.length - 1; v++) {
                var vertex = mesh.geometry.vertices[v];
                vertex.x += config.drift.x;
                vertex.y += config.drift.y;
                vertex.z += config.drift.z;

                vertex.applyAxisAngle(new THREE.Vector3(config.rDrift.x, config.rDrift.y, config.rDrift.z), 0.01);
            }
            mesh.geometry.verticesNeedUpdate = true;
        }

        renderer.autoClear = false;
        renderer.clear();
        renderer.render(backgroundScene, backgroundCamera);
        renderer.render(scene, camera);

        if (octree) {
            octree.update();
        }
        requestAnimationFrame(animate);
    }

    /**
     * Main hook for Inputs
     * Adds new selection mesh
     * @param event has x, y, id
     */
    function onStart(event) {
    //    event.preventDefault();
        addSelectionMeshes(event.detail.id);
    }

    /**
     * Main hook for Inputs
     * Updates geometry of selection mesh based on nearest points
     * TODO: make search its own function?
     * @param event has x, y, id
     */
    function onMove(event) {
    //    event.preventDefault();
        var cursor = event.detail;

        var x = cursor.x * 2 - 1;
        var y = -cursor.y * 2 + 1;
        var z = cursor.z || 0;
        var doSearch = true;

        var position = getWorldPosition(x, y);
        if (position) {
            for (var i = 0; i < selectionMeshes.length; i++) {

                var mesh = selectionMeshes[i];

                if (mesh.touchid == cursor.id) {

                    // set third vertex to cursor position
                    var isEven = ((i + 1) % 2 == 0);

                    if (i > 0 && isEven && config.mirror) {
                        doSearch = false;

                        var parentMesh = selectionMeshes[i - 1];

                        mesh.geometry.vertices[0].x = parentMesh.geometry.vertices[0].x * -1;
                        mesh.geometry.vertices[0].y = parentMesh.geometry.vertices[0].y;
                        mesh.geometry.vertices[0].z = parentMesh.geometry.vertices[0].z;
                        mesh.geometry.vertices[1].x = parentMesh.geometry.vertices[1].x * -1;
                        mesh.geometry.vertices[1].y = parentMesh.geometry.vertices[1].y;
                        mesh.geometry.vertices[1].z = parentMesh.geometry.vertices[1].z;
                        mesh.geometry.vertices[2].x = parentMesh.geometry.vertices[2].x * -1;
                        mesh.geometry.vertices[2].y = parentMesh.geometry.vertices[2].y;
                        mesh.geometry.vertices[2].z = parentMesh.geometry.vertices[2].z;

                    }

                    if (doSearch) {
                        var vertex = mesh.geometry.vertices[2];
                        vertex.x = position.x;
                        vertex.y = position.y;
                        vertex.z = z;

                        var sortedPoints = [];
                        var nearestPoints = octree.search(vertex, 10, false);

                        nearestPoints.forEach(function (object) {
                            var point = object.vertices;
                            sortedPoints.push({ x: point.x, y: point.y, z: point.z, d: point.distanceTo(vertex)});
                        });

                        // search through selection meshes, too

                        if (config.connectToSelf) {
                            selectionMeshes.forEach(function (mesh) {
                                if (mesh.touchid != cursor.id) {
                                    for (var i = 0; i < 3; i++) {
                                        var point = mesh.geometry.vertices[i];
                                        sortedPoints.push({x: point.x, y: point.y, z: point.z, d: point.distanceTo(vertex)});
                                    }
                                }
                            });
                        }


                        sortByKey(sortedPoints, "d");

                        var targetPoint = sortedPoints[0] || new THREE.Vector3(0, 0, 0);
                        var vertex = mesh.geometry.vertices[0];

                        vertex.x = targetPoint.x;
                        vertex.y = targetPoint.y;
                        vertex.z = targetPoint.z;

                        // Make sure picked points have some space between them
                        var secondPointIndex = 1;
                        var tooSmall = true;
                        while (tooSmall) {
                            var secondPoint = sortedPoints[ secondPointIndex ];
                            if (secondPoint) {
                                var innerDistance = new THREE.Vector3(secondPoint.x, secondPoint.y, secondPoint.z).distanceTo(sortedPoints[0]);
                                tooSmall = ( innerDistance < 2 );
                                secondPointIndex++;
                            } else {
                                secondPointIndex = 0;
                                tooSmall = false;
                            }
                        }

                        var targetVertex = mesh.geometry.vertices[1];
                        targetPoint = sortedPoints[ secondPointIndex ] || new THREE.Vector3(0, 0, 0);
                        targetVertex.x = targetPoint.x;
                        targetVertex.y = targetPoint.y;
                        targetVertex.z = targetPoint.z;

                    }

                }

            }
        }

    }

    /**
     * Main hook for Inputs
     * Creates new mesh from selection mesh, then deletes selection
     * New mesh is assigned a lifetime and grown in with a Tween
     * @param event
     */
    function onEnd(event) {
     //   event.preventDefault();
        var cursor = event.detail;

        var x = cursor.x * 2 - 1;
        var y = -cursor.y * 2 + 1;
        var z = cursor.z || getRandomArbitrary(config.randomZ, -config.randomZ);
        var self = this;    // store this for use in Tween functions below

        var position = getWorldPosition(x, y);
        if (position) {
            // get material to share for all new meshes
            var material = getRandomMaterial();
            for (var i = 0; i < selectionMeshes.length; i++) {

                var mesh = selectionMeshes[i];

                if (mesh.touchid == cursor.id) {
                    mesh.geometry.vertices[2].z = z;

                    // add new Mesh to scene
                    var meshClone = new THREE.Mesh(mesh.geometry.clone(), material);
                    var meshWire = new THREE.Mesh(mesh.geometry.clone(), materialsWire[4]);
                    meshWire.position.z += 1.5;

                    // Add the meshes to the scene
                    var newMeshes = [meshClone, meshWire];
                    for (m in newMeshes) {
                        growNewObject(newMeshes[m]);
                    }

                }

            }
            // kill selection meshes once the piece has been grown
            removeSelectionMeshes(cursor.id);
        }
    }

    /**
     * Update cache of all points
     */
    function updatePointCache() {
        allPoints = [];

        // construct allPoints from allMeshes
        allMeshes.forEach(function (mesh) {
            mesh.geometry.vertices.forEach(function (vertex) {
                allPoints.push(vertex);
            });
        });

        // clear dupes
        allPoints = allPoints.filter(function (item, index, inputArray) {
            return inputArray.indexOf(item) == index;
        });

    }

    /**
     * Add Mesh to allMeshes and scene
     * Grow it in, tween it out
     * @param mesh
     */
    function growNewObject(mesh) {
        mesh.geometry.dynamic = true;
        allMeshes.push(mesh);
        scene.add(mesh);

        octree.add(mesh, { useVertices: true });

        if (config.tween.active) {

            // initial growth tween
            var vertex = mesh.geometry.vertices[2];
            var targetPoint = vertex.clone();
            var ungrownPoint = mesh.geometry.vertices[0];
            vertex.set(ungrownPoint.x, ungrownPoint.y, ungrownPoint.z);
            TweenMax.to(vertex, config.tween.growDuration, {
                ease: Cubic.easeOut,
                x: targetPoint.x,
                y: targetPoint.y,
                z: targetPoint.z
            });

            // Lifetime tween - update geometry every frame, kill it when finished
            TweenMax.to(mesh, config.tween.lifetime, {
                onComplete: killMesh,
                onCompleteParams: ["{self}"],
                onUpdate: function () {
                    this.target.geometry.verticesNeedUpdate = true;
                }
            });

            // Transition out at end of lifetime
            TweenMax.to(vertex, config.tween.growDuration, {
                delay: config.tween.lifetime - config.tween.growDuration,
                ease: Expo.easeIn,
                onStart: function () {
                    this.updateTo({
                        x: mesh.geometry.vertices[0].x,
                        y: mesh.geometry.vertices[0].y,
                        z: mesh.geometry.vertices[0].z
                    });
                }
            })
        }

    }

    /**
     * Remove mesh from allMeshes and scene
     * @param tween
     */
    function killMesh(tween) {
        var idx = allMeshes.indexOf(tween.target);
        if (idx > -1) {
            allMeshes.splice(idx, 1);
        }
        octree.remove(tween.target);
        scene.remove(tween.target);
    }

    /**
     * Gets a random selection from the selected materials array
     * @returns THREE.Material
     */
    function getRandomMaterial() {
        return materials[ Math.floor(Math.random() * materials.length)];
    }

    /**
     * Finds the world position from x&y screen positions
     * @param x
     * @param y
     * @returns {*}
     */
    function getWorldPosition(x, y) {
        var vector = new THREE.Vector3(x, y, 0);
        projector.unprojectVector(vector, camera);

        var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
        var intersects = raycaster.intersectObjects([wall]);

        if (intersects.length > 0) {
            return( intersects[0].point );
        } else {
            return false;
        }
    }

    /**
     * Sorts an array by one of its keys
     * TODO: make this an array prototype method? Maybe an mmm utils class?
     * @param array
     * @param key
     * @returns sorted {Array}
     */
    function sortByKey(array, key) {
        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    }

    /**
     * Returns a random number between min and max
     * @param min
     * @param max
     * @returns {*}
     */
    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    /**
     * Return some public properties
     */
    return {
        onStart: onStart,
        onMove: onMove,
        onEnd: onEnd,
        starfield: starfield,
        canvas: canvas,
        dispatcher: dispatcher,
        config: config,
        three: {
            renderer: renderer,
            scene: scene,
            camera: camera
        }
    }

};