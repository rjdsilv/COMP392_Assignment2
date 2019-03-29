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

// Physics Scene
const scene = new Physijs.Scene({ reportsize: 50, fixedTimeStep: 1 / 60 });

// Game variable declarations
const TABLE_Y = -25;
const TABLE_H = 3.75;
const FRICTION = 0.3;
const RESTITUTION = 0.7;
const MASS = 10;
const IMPULSE_INTERVAL = 1000; // in seconds
const IMPULSE_FORCE = 1000;
let gameBoxes = [];
let table;
let possibleColors = [];
let lastEliminatedBox;

// GUI variables
let filename = 'Jiabin_Jalpen_Rodrigo1';
let port = 3000;

// Scoreboard variables
let scoreBoard;
let currentScore = 0;
const SCORE_GAIN = 10;
const SCORE_LOSE = 20;

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
    camera.position.set(0, 150, 210);
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
    // Return a box object
    return new function () {
        const boxGeom = new THREE.CubeGeometry(boxData.size, boxData.size, boxData.size);
        const boxMat = Physijs.createMaterial(new THREE.MeshStandardMaterial({
            color: parseInt(boxData.color),
            transparent: true,
            opacity: 0.9
        }), FRICTION, RESTITUTION);
        this.mesh = new Physijs.BoxMesh(boxGeom, boxMat, MASS);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.set(boxData.posX, (index + 1) * boxData.size / 2 + TABLE_Y + TABLE_H / 2 + index * boxData.size / 2, boxData.posZ);
        // Apply random upward force.
        this.mesh.impulse = () => {
            // Only apply impulse if box is touching table.
            if (this.mesh.position.y - boxData.size / 2 <= table.position.y + TABLE_H / 2 + 0.1) {
                let colorIndex = Math.floor(Math.random() * possibleColors.length);
                // Apply random color.
                this.mesh.material.color = new THREE.Color(parseInt(possibleColors[colorIndex]));
                // Apply random upward force
                this.mesh.applyCentralImpulse(new THREE.Vector3(0, Math.random() * IMPULSE_FORCE, 0));
            }
        }
        // Impulse handle
        let impulseHandle;
        // Start impulse
        this.mesh.startImpulse = (interval) => {
            this.mesh.stopImpulse();
            impulseHandle = setInterval(() => {
                this.mesh.impulse();
            }, interval);
        }
        // Stop impulse
        this.mesh.stopImpulse = () => {
            clearInterval(impulseHandle);
        };
    }
}

/**
 * function that will create the game with the given gameData.
 * 
 * @param {*} gameData The game data to be used in world construction.
 */
function createGame(gameData) {
    // Clear the previous game data.
    for (box of gameBoxes) {
        // Clear impulse timer.
        box.stopImpulse();
        scene.remove(box);
    }
    gameBoxes = [];
    currentScore = 0;

    for (let i = 0; i < gameData.length; i++) {
        for (boxData of gameData[i]) {
            const box = createBox(boxData, i);
            // Start impulse timer with IMPULSE_INTERVAL.
            //box.mesh.startImpulse(IMPULSE_INTERVAL);
            // Add box object to gameBoxes.
            gameBoxes.push(box.mesh);
            // Add box mesh to the scene.
            scene.add(box.mesh);
            // Check for possible color
            if (!(possibleColors.indexOf(boxData.color) > -1)) {
                possibleColors.push(boxData.color);
            }
        }
    }

    setupScoreBoard();
}

/**
 * Replace all block with possible random color
 */
function paintRandomColor() {
    gameBoxes.forEach((box) => {
        let colorIndex = Math.floor(Math.random() * possibleColors.length);
        // Apply random color.
        box.material.color = new THREE.Color(parseInt(possibleColors[colorIndex]));
    });
}

/**
 * Check game condition
 */
function isGameOver() {
    // Return true if less than 2 boxes left.
    if (gameBoxes.length < 2) {
        return true;
    }
    for (let i = 1; i < gameBoxes.length; i++) {
        if (gameBoxes[0].material.color.equals(gameBoxes[i].material.color)) {
            return false;
        }
    }
    return true;
}
/**
 * Function that add a scoreboard to canvas.
 */
function setupScoreBoard() {
    scoreBoard = document.getElementById("scoreBoard");
    if (!scoreBoard) {
        let scoreBoardPanel = document.createElement("div");
        scoreBoardPanel.style = "z-index: 9999; font: bold; margin: 0px; padding: 0px; text-align: left; user-select: none; top: 0px; position: absolute; margin-left: -200px;  background-color: black; width: 200px;";
        scoreBoard = document.createElement("span");
        scoreBoard.style = " color: #ffffff; line-height: 50px; font-size: 20px; display: block; padding: 20px;";
        scoreBoard.innerHTML = "Current Score: 0";
        gameDescription = document.createElement("span");
        gameDescription.style = "color: #ffffff; line-height: 15px; font-size: 10px; display: block; padding: 20px;";
        gameDescription.innerHTML = "Click on 2 blocks with the same color to eliminate them." + "<br />" + "Eliminate block gives 10 points." + "<br />" + "Block falling off table takes away 10 points.";
        scoreBoardPanel.appendChild(gameDescription);
        scoreBoardPanel.appendChild(scoreBoard);
        document.getElementsByClassName("dg main a")[0].appendChild(scoreBoardPanel);
        
    }
}

/**
 * Function that update the scoreboard values.
 * @param {*} newScore The new score to display.
 */
function updateScoreBoard() {
    // If scoreboard does not exist create one.
    if (!scoreBoard) {
        setupScoreBoard();
    }
    scoreBoard.innerHTML = "Current Score: " + currentScore;
}

/**
 * Function that will remove boxes that felt from the table.
 */
function removeFallenBoxes() {
    for (box of gameBoxes) {
        if (box.position.y < table.position.y) {
            // Clear the timer so that it will not calling impulse when box get removed.
            box.stopImpulse();
            gameBoxes = gameBoxes.filter((e) => e != box);
            scene.remove(box);
            currentScore -= SCORE_LOSE;
            updateScoreBoard();
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

    /** Get the first intersected object if there is any */
    if (intersects.length > 0) {
        let firstIntersect = intersects[0].object;
        // If last elimated box exist
        if (lastEliminatedBox) {
            if (firstIntersect.material.color.equals(lastEliminatedBox.material.color)) {
                // Remove the object
                gameBoxes.splice(gameBoxes.lastIndexOf(firstIntersect), 1);
                gameBoxes.splice(gameBoxes.lastIndexOf(lastEliminatedBox), 1);
                // Remove from scene
                scene.remove(firstIntersect);
                scene.remove(lastEliminatedBox);
                // Update score
                currentScore += SCORE_GAIN;
                if (isGameOver()) {
                    console.log("no block left");
                    console.log(gameBoxes.length);
                    console.log("game over");
                }
                else {
                    
                    paintRandomColor();
                }
            }
            // Reset Last Eliminated
            lastEliminatedBox = null;
            updateScoreBoard();
        }
        else {
            lastEliminatedBox = firstIntersect;
        }
    }

    /** For list */
    //intersects.forEach((obj) => {
    //console.log(obj.object);
    // obj.object.stopImpulse();
    // gameBoxes = gameBoxes.filter((e) => e != obj.object);
    // scene.remove(obj.object);
    // currentScore += 1;
    // updateScoreBoard(currentScore);
    //});
}

/**
 * Function that will create and set up the GUI controls.
 */
function setupDatGui() {
    const gameFiles = {
        'Game 1': 'Jiabin_Jalpen_Rodrigo1',
        'Game 2': 'Jiabin_Jalpen_Rodrigo2',
        'Game 3': 'Jiabin_Jalpen_Rodrigo3',
        'Game 4': 'Jiabin_Jalpen_Rodrigo4',
        'Game 5': 'Jiabin_Jalpen_Rodrigo5'
    };
    const ports = [3000, 5500, 8080]

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
    let url = `http://localhost:${port}/assets/games/${filename}.json`;
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
