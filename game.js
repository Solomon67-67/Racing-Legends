// ==========================
// GAME STATE
// ==========================
const STATE = {
  LOADING: "loading",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  FINISHED: "finished"
};

let gameState = STATE.LOADING;
const uiElement = document.getElementById("ui");

// ==========================
// INPUT SYSTEM
// ==========================
const input = { throttle: false, brake: false, left: false, right: false };

window.addEventListener("keydown", (e) => setKey(e, true));
window.addEventListener("keyup", (e) => setKey(e, false));

function setKey(e, value) {
  switch (e.key.toLowerCase()) {
    case "w":
    case "arrowup": input.throttle = value; break;
    case "s":
    case "arrowdown": input.brake = value; break;
    case "a":
    case "arrowleft": input.left = value; break;
    case "d":
    case "arrowright": input.right = value; break;
  }
}

// ==========================
// WORLD SETUP
// ==========================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 350);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector("#gameCanvas"), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(60, 80, 30);
scene.add(sun);

// Visual ground plane so you can see movement
const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const groundMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// ==========================
// TRACK (SPLINE)
// ==========================
const trackCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(50, 0, -120),
  new THREE.Vector3(-60, 0, -260),
  new THREE.Vector3(80, 0, -420),
  new THREE.Vector3(0, 0, -600)
]);

let progress = 0;

// ==========================
// CAR PHYSICS
// ==========================
class Car {
  constructor() {
    this.pos = new THREE.Vector3();
    this.vel = 0;
    this.angle = 0;
    this.accel = 0.18;
    this.maxSpeed = 18;
    this.friction = 0.96;
    this.turnSpeed = 0.05;
  }

  update(input) {
    if (input.throttle) this.vel += this.accel;
    else if (input.brake) this.vel -= this.accel * 1.2;
    else this.vel *= this.friction;

    this.vel = THREE.MathUtils.clamp(this.vel, -8, this.maxSpeed);

    if (Math.abs(this.vel) > 0.05) {
      if (input.left) this.angle += this.turnSpeed * (this.vel / this.maxSpeed);
      if (input.right) this.angle -= this.turnSpeed * (this.vel / this.maxSpeed);
    }

    // Move along the ground based on heading angle
    this.pos.x += Math.sin(this.angle) * this.vel;
    this.pos.z += Math.cos(this.angle) * this.vel;
  }
}

// ==========================
// CAMERA FOLLOW
// ==========================
class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 5.5, -12);
  }
  update(target, angle) {
    const rotated = this.offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    const desired = target.clone().add(rotated);
    this.camera.position.lerp(desired, 0.08);
    this.camera.lookAt(target);
  }
}

const car = new Car();
const cameraFollow = new FollowCamera(camera);
let carModel = null;

// ==========================
// LOAD ASSETS WITH BACKUP SAFETY
// ==========================
const loader = new THREE.GLTFLoader();

loader.load(
  "assets/car.glb",
  (gltf) => {
    carModel = gltf.scene;
    carModel.scale.set(0.65, 0.65, 0.65);
    scene.add(carModel);
    startCountdown();
  },
  undefined,
  (error) => {
    console.warn("3D car model not found in /assets. Using a visual fallback box.");
    // Fallback block so the game doesn't break without the asset
    const boxGeo = new THREE.BoxGeometry(2, 1, 4);
    const boxMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    carModel = new THREE.Mesh(boxGeo, boxMat);
    scene.add(carModel);
    startCountdown();
  }
);

// ==========================
// COUNTDOWN
// ==========================
let countdown = 3;

function startCountdown() {
  gameState = STATE.COUNTDOWN;
  const interval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(interval);
      gameState = STATE.PLAYING;
    }
  }, 1000);
}

// ==========================
// MAIN LOOP
// ==========================
function animate() {
  requestAnimationFrame(animate);

  if (carModel) {
    if (gameState === STATE.COUNTDOWN) {
      uiElement.innerText = `READY IN: ${countdown}`;
    } 
    
    if (gameState === STATE.PLAYING) {
      car.update(input);
      
      carModel.position.copy(car.pos);
      carModel.rotation.y = car.angle;
      
      cameraFollow.update(car.pos, car.angle);
      
      // Basic UI Dashboard display
      uiElement.innerText = `SPEED: ${Math.round(car.vel * 10)} MPH`;
    }
  }

  renderer.render(scene, camera);
}

animate();

// Handle browser window resizing automatically
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
