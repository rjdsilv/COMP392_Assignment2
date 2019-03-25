/// <reference path="libs/three.min.js" />
/// <reference path="libs/physijs_worker.js" />
/// <reference path="libs/ammo.js" />
/// <reference path="libs/dat.gui.min.js" />
/// <reference path="libs/orbitcontrols.js" />

/**
 * @author Rodrigo da Silva
 * @author Jalpen Desai
 * @author Jiabin Tang
 * 
 * Date     : March 22, 2019
 * File name: assignment02.js
 * Purpose  : Implement Advanced Graphics' second assignment.
 */

/**
 * Setting Phyisics
 */
Physijs.scripts.worker = 'libs/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

/**
 * THREE.js controls declaration.
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1.0, 1000);
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
const container = new THREE.Object3D();

// Physics Scene.
const scene = new Physijs.Scene({ reportsize: 50, fixedTimeStep: 1 / 60 });

// Game variable declarations.
const TABLE_Y = -25;
const TABLE_H = 3.75;
const FRICTION = 0.3;
const RESTITUTION = 0.7;
const MASS = 10;
let gameBoxes = [];
let table;

// GUI variables;
let filename = 'game01';
let port = 8080;


/**
 * Initialization function, which will initialize all the necessary components for the application.
 */
function init() {
    // Setting up the renderer.
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x004400);
    renderer.shadowMap.enabled = true;

    // Sets the gravity for the scene.
    scene.setGravity(new THREE.Vector3(0, -30, 0));

    // Adding the renderer to the DOM.
    document.body.appendChild(renderer.domElement);
}

/**
 * Function that will set up the camera and the lights in the scene. For this scene we will have a
 * an ambient light, a directional light, and an hemisphere light set up.
 */
function setupCameraAndLight() {
    camera.position.set(0, 30, 90);
    camera.lookAt(scene.position);

    /**
     * Function that will create an ambient light and return it.
     */
    const createAmbientLight = () => {
        return new THREE.AmbientLight(0x666666);
    };

    /**
     * Function that will create a directional light and return it.
     */
    const createDirectionalLight = () => {
        let directionalLight = new THREE.DirectionalLight(0xffffff);
        directionalLight.position.set(-95, 45, 75);
        directionalLight.castShadow = true;
        directionalLight.target = scene;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        return directionalLight;
    };

    const createHemisphereLight = () => {
        let hemiSphereLight = new THREE.HemisphereLight(0x7777cc, 0x00ff00, 0.25);//skycolor, groundcolor, intensity  
        hemiSphereLight.position.set(0, 100, 0);
        return hemiSphereLight;
    }

    scene.add(createAmbientLight());
    scene.add(createDirectionalLight());
    scene.add(createHemisphereLight());
}

/**
 * Function that will create the scene geometry
 */
function createGeometry() {
    scene.add(new THREE.AxesHelper(100));
    const tableGeom = new THREE.CubeGeometry(150, 50, TABLE_H);
    const tableMat = Physijs.createMaterial(new THREE.MeshStandardMaterial({
        color: 0xaadd00,
        map: new THREE.TextureLoader().load('assets/textures/table.jpg')
    }), FRICTION, RESTITUTION);
    table = new Physijs.BoxMesh(tableGeom, tableMat, 0);
    table.receiveShadow = true;
    table.rotation.x = -Math.PI * 0.5;
    table.position.y = TABLE_Y;
    scene.add(table);
}

/**
 * Function that will create the box based on the given data.
 * 
 * @param {*} boxData
 */
function createBox(boxData, index) {
    const boxGeom = new THREE.CubeGeometry(boxData.size, boxData.size, boxData.size);
    const boxMat = Physijs.createMaterial(new THREE.MeshStandardMaterial({
        color: parseInt(boxData.color),
        transparent: true,
        opacity: 0.9
    }), FRICTION, RESTITUTION);
    const box = new Physijs.BoxMesh(boxGeom, boxMat, MASS);
    box.castShadow = true;
    box.receiveShadow = true;
    box.position.set(boxData.posX, (index + 1) * boxData.size / 2 + TABLE_Y + TABLE_H / 2 + index * boxData.size / 2, boxData.posZ);
    return box;
}

/**
 * function that will create the game with the given gameData.
 * 
 * @param {*} gameData The game data to be used in world construction.
 */
function createGame(gameData) {
    // Clear the previous game data.
    for (box of gameBoxes) {
        scene.remove(box);
    }
    gameBoxes = [];

    for (let i = 0; i < gameData.length; i++) {
        for (boxData of gameData[i]) {
            const box = createBox(boxData, i);
            gameBoxes.push(box);
            scene.add(box);
        }
    }
}

/**
 * Function that will remove boxes that felt from the table.
 */
function removeFallenBoxes() {
    for (box of gameBoxes) {
        if (box.position.y < table.position.y - 20) {
            gameBoxes = gameBoxes.filter((e) => e != box);
            scene.remove(box);
        }
    }
}

/**
 * Function that for each frame will mark the remaining boxes on the screen as dirty so
 * the physics library knows their current state.
 */
function markRemainingBoxesAsDirty() {
    for (box of gameBoxes) {
        box.__dirtyRotation = true;
        box.__dirtyPosition = true;
    }
}

/**
 * Function that will detect what block was selected and remove it from the scene.
 * 
 * @param {*} event The event that occured.
 */
function mouseDownHandler(event) {
    let pos = new THREE.Vector3(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    let vector = pos.unproject(camera);
    let raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
    let intersects = raycaster.intersectObjects(gameBoxes);
    intersects.forEach((obj) => {
        gameBoxes = gameBoxes.filter((e) => e != obj.object);
        scene.remove(obj.object);
    });
}

/**
 * Function that will create and set up the GUI controls.
 */
function setupDatGui() {
    const gameFiles = {
        'Game 1': 'game01',
        'Game 2': 'game02',
        'Game 3': 'game03',
        'Game 4': 'game04',
        'Game 5': 'game05'
    };
    const ports = [5500, 8080]

    // DAT.GUI Controls.
    const controls = new function () {
        this.filename = filename;
        this.port = port;
        this.resetGame = () => {
            readFile(port, filename);
        }
    };

    let gui = new dat.GUI();
    gui.add(controls, 'filename', gameFiles).name('Game Selection').onChange((e) => { filename = e; readFile(port, filename); });
    gui.add(controls, 'port', ports).name('Port').onChange((e) => { port = parseInt(e); readFile(port, filename); });
    gui.add(controls, 'resetGame').name('Reset Game');
}

/**
 * Reads the JSON file represented by filename on the given port to create the game.
 * 
 * @param {*} port     The port to be used.
 * @param {*} filename The file name to be used.
 */
function readFile(port, filename) {
    let url = `http://127.0.0.1:${port}/assets/games/${filename}.json`;
    //console.log(url); //debugging code
    let request = new XMLHttpRequest();
    request.open('GET', url);
    request.responseType = 'text'; //try text if this doesn’t work
    request.send();
    request.onload = () => {
        createGame(JSON.parse(request.responseText));
    }
}

/**
 * Function that will render the whole scene.
 */
function render() {
    orbitControls.update();

    // Rotates the whole scene.
    // if (controls.rotateScene) {
    //     scene.rotateY(controls.speed);
    // }

    // Rotates the wheel.
    // if (controls.rotateWheel) {
    //     container.rotateZ(controls.wheelSpeed);
    //     for (let i = 0; i < baskets.length; i++) {
    //         baskets[i].rotateZ(-controls.wheelSpeed);
    //     }
    // }

    // removes fallen objects from the scene.
    removeFallenBoxes();

    // Marks the remaining boxes as dirty
    markRemainingBoxesAsDirty();

    // Renders the scene
    renderer.render(scene, camera);
    scene.simulate();
    requestAnimationFrame(render);
}

/**
 * Executed when the window first loads.
 */
window.onload = () => {
    init();
    setupCameraAndLight();
    createGeometry();
    setupDatGui();
    readFile(port, filename);
    window.addEventListener('mousedown', mouseDownHandler, false);
    render();
}
