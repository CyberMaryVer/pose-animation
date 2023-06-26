import * as THREE from 'https://cdn.skypack.dev/three@0.133.0/build/three.module.js';
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/GLTFLoader.js';
import {BVHLoader} from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/BVHLoader.js';
import { DRACOLoader } from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/loaders/DRACOLoader';
import Stats from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/libs/stats.module.js';
import * as SkeletonUtils from 'https://cdn.skypack.dev/three@0.133.0/examples/jsm/utils/SkeletonUtils.js';

const fileInput = document.getElementById('fileInput');
const openBtn = document.getElementById('openBtn');
const animBtn = document.getElementById('animBtn');
const modelBtn = document.getElementById('modelBtn');


function traverseBones(object, callback) {
  object.traverse !== undefined
    ? object.traverse(callback)
    : callback(object);
}

function listAnimation(name) {
  const option = document.createElement('option');
  option.value = name;
  option.innerText = name;
  animBtn.appendChild(option);
}

function listModel(name) {
  const option = document.createElement('option');
  option.value = name;
  option.innerText = name;
  modelBtn.appendChild(option);
}

function init() {

  ////////////////////     three "boilerplate"    /////////////////////////

  const clock = new THREE.Clock();
  const container = document.getElementById('container');

  const stats = new Stats();
  container.appendChild(stats.dom);

  const renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

// Add a camera
  const camera = new THREE.PerspectiveCamera(
  50,  window.innerWidth / window.innerHeight,  0.1,  100000);
  camera.position.z = -100;
  camera.position.x = 10;
  camera.position.y = -10;

//  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100000);
//  camera.position.set(0, 30, 160);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 30, 0);
  controls.update();
  controls.enablePan = false;
  controls.enableDamping = true;

  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(10, -20, -100);
  scene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambLight);

  ///////////////////         end boilerplate        //////////////////////

  let mixer, model, currentAction;
  const animationActions = {};
  const crossFadeTime = 0.2;

  function setupAnimation(result, model, clipName) {
    const newClip = retargetBVH(result, model);
    const animAction = mixer.clipAction(newClip);
    animationActions[clipName] = animAction;
    listAnimation(clipName);
  }

  function retargetBVH(BVHLoaderResult, model) {

    const clip = BVHLoaderResult.clip;
    const skeleton = BVHLoaderResult.skeleton;

    /* find model's weighted skeleton and give the model a pointer to it */
    if (!model.skeleton) {
      model.traverse((child) => {
        if (child.isBone) {
            console.log("Bone Name:", child.name);
        }
        if (child.skeleton) {
            model.skeleton = child.skeleton;

            // Print all model key names
            const keys = Object.keys(child.skeleton);
            console.log("Model Key Names:");
            console.log(keys);

        }
      });
    }

    // *Special Note* SkeletonUtils.retargetClip seems to output an animationClip
    // with more frames (time arrays) than necessary and a reduced duration.
    // I'm supplying fps and modifying input clip duration to fix that

    /* get fps from first track. */
    const fps = 1 / clip.tracks[0].times[1] || 1;
    clip.duration += 1 / fps;

    const options = {
      fps: fps,
    };

    const newClip = SkeletonUtils.retargetClip(model, skeleton, clip, options);

    /* can dispose of bvhLoader skeleton */
    skeleton.dispose();

    /* THREE.SkinnedMesh.pose() to reset the model */
    model.traverse(function(child) {
      if (child.type === "SkinnedMesh") {
        child.pose();
      }
    });

    return newClip;
  }

  const gltfLoader = new GLTFLoader();
  const bvhLoader = new BVHLoader();

  // Optional: Provide a DRACOLoader instance to decode compressed mesh data
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath( './addons/draco_decoder/' );
  gltfLoader.setDRACOLoader( dracoLoader );

//  const path = 'https://raw.githubusercontent.com/shootTheLuck/shootTheLuck.github.io/master/assets';
    const path = './assets';
  const path1 = path + '/models/anime.glb'
  const path2 = path + '/models/humanoid.glb'
  gltfLoader.load(path1, (gltf) => {
    model = gltf.scene;
    const armature = model.getObjectByName('Armature');
    const mesh = model.getObjectByName('Mesh');
    scene.add(model);
    model.scale.set(20, 20, 20); // Increase the scale by a factor of 2

    // Update the model's pose
    model.updateMatrixWorld(true);

    mixer = new THREE.AnimationMixer(model);

    bvhLoader.load(path + '/animations/avatar_dance8.bvh', (result) => {
      setupAnimation(result, model, 'avatar_dance');
    });

    bvhLoader.load(path + '/animations/avatar_cross_arms.bvh', (result) => {
      setupAnimation(result, model, 'avatar_cross_arms');
    });

    bvhLoader.load(path + '/animations/avatar_walk.bvh', (result) => {
      setupAnimation(result, model, 'avatar_walk');
    });

    bvhLoader.load(path + '/animations/avatar_laugh_short.bvh', (result) => {
      setupAnimation(result, model, 'avatar_laugh');
    });

    bvhLoader.load(path + '/animations/gestures.bvh', (result) => {
      setupAnimation(result, model, 'avatar_gestures');
    });

    animate();
  });

  fileInput.addEventListener('change', (evt) => {
    const fakePath = evt.target.value;
    const name = fakePath.substring(fakePath.lastIndexOf('\\') + 1, fakePath.lastIndexOf('.'));
    const file = evt.target.files[0];

    const reader = new window.FileReader();
    reader.onload = function parseBVH(loadedEvent) {
      const result = bvhLoader.parse(loadedEvent.target.result);
      setupAnimation(result, model, name);
    };

    reader.readAsText(file);
  });

  openBtn.addEventListener('click', (evt) => {
    fileInput.click();
  });

  animBtn.addEventListener('change', (evt) => {
    const action = animationActions[animBtn.value];
    action.reset();
    action.enabled = true;
    action.play();
    if (currentAction !== undefined) {
      currentAction.crossFadeTo(action, crossFadeTime, false);
    }
    currentAction = action;
  });

  function animate() {
    const delta = clock.getDelta();
    mixer.update(delta);
    controls.update();
    stats.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  window.onresize = function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

}

init();
