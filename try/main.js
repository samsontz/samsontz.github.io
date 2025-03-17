import * as THREE from 'three';
import * as LocAR from 'locar';

const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.001, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();

document.body.appendChild(renderer.domElement);

// Handle window resizing
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Create a new LocationBased instance
const locar = new LocAR.LocationBased(scene, camera);

// Device orientation controls
const deviceControls = new LocAR.DeviceOrientationControls(camera);

// Webcam renderer
const cam = new LocAR.WebcamRenderer(renderer);

// Keep track of whether it’s the first position fix or not
let firstPosition = true;

// This object tracks existing points of interest so we don’t re-add them
const indexedObjects = {};

// Click handler (if you need to handle interactions)
const clickHandler = new LocAR.ClickHandler(renderer);

// Whenever we get a GPS update:
locar.on("gpsupdate", async (pos, distMoved) => {

  // If this is the first fix or we've moved > 100 meters, fetch some POIs
  if (firstPosition || distMoved > 100) {
    try {
      const response = await fetch(
        `https://hikar.org/webapp/map?bbox=${
          pos.coords.longitude - 0.02
        },${
          pos.coords.latitude - 0.02
        },${
          pos.coords.longitude + 0.02
        },${
          pos.coords.latitude + 0.02
        }&layers=poi&outProj=4326`
      );
      const pois = await response.json();

      // Add a direction arrow for each new POI
      pois.features.forEach((poi) => {
        if (!indexedObjects[poi.properties.osm_id]) {
          // Instead of a cube, create an ArrowHelper
          const dir = new THREE.Vector3(1, 2, 0);
          dir.normalize();
          const origin = new THREE.Vector3(0, 0, 0);
          const length = 20;
          const color = 0xffff00;

          const arrowHelper = new THREE.ArrowHelper(dir, origin, length, color);

          // Add arrow to the AR scene at the POI's coordinates
          locar.add(
            arrowHelper,
            poi.geometry.coordinates[0],
            poi.geometry.coordinates[1]
          );

          // Keep track so we don’t add duplicates
          indexedObjects[poi.properties.osm_id] = arrowHelper;
        }
      });
    } catch (err) {
      console.error("Error fetching POIs:", err);
    }

    firstPosition = false;
  }
});

locar.startGps();

// Main render loop
renderer.setAnimationLoop(() => {
  cam.update();
  deviceControls.update();
  renderer.render(scene, camera);
});
