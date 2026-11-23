import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpVec3(out, a, b, t) {
  out.x = lerp(a.x, b.x, t);
  out.y = lerp(a.y, b.y, t);
  out.z = lerp(a.z, b.z, t);
  return out;
}

/**
 * Dolly 3D verso il modello radio, poi callback di arrivo sulla UI ufficiale.
 */
export function playApproach3D(opts = {}) {
  const {
    modelUrl,
    durationMs = 4200,
    onMid = null,
    onArrive = null,
    onDone = null
  } = opts;

  const root = document.createElement('div');
  root.className = 'scene-approach scene-approach-3d';
  root.setAttribute('aria-hidden', 'true');
  const canvasHost = document.createElement('div');
  canvasHost.className = 'scene-approach-3d-host';
  root.appendChild(canvasHost);
  document.body.appendChild(root);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a120c);
  scene.fog = new THREE.Fog(0x1a120c, 4.5, 14);

  const camera = new THREE.PerspectiveCamera(
    42,
    Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
    0.05,
    40
  );

  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x2a1a10, 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe6c8, 1.35);
  key.position.set(-2.4, 3.2, 3.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb8d0ff, 0.35);
  fill.position.set(3.2, 1.4, 1.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd8a8, 0.45);
  rim.position.set(0.2, 1.8, -3.2);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 64),
    new THREE.MeshStandardMaterial({
      color: 0x3a2a1c,
      roughness: 0.92,
      metalness: 0.05
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.72;
  scene.add(floor);

  let disposed = false;
  let raf = 0;
  let modelRoot = null;
  const clockStart = performance.now();
  let midFired = false;
  let arriveFired = false;

  const camFrom = new THREE.Vector3(-2.8, 1.55, 4.6);
  const camTo = new THREE.Vector3(0.05, 0.22, 2.05);
  const lookFrom = new THREE.Vector3(-0.35, 0.35, 0.1);
  const lookTo = new THREE.Vector3(0, 0.05, 0);
  const camPos = new THREE.Vector3();
  const lookPos = new THREE.Vector3();

  function frameModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    /* Orientamento tipico export Blender → faccia verso +Z camera */
    object.rotation.y = Math.PI;
    const box2 = new THREE.Box3().setFromObject(object);
    const size2 = box2.getSize(new THREE.Vector3());
    const maxDim = Math.max(size2.x, size2.y, size2.z, 0.001);
    object.scale.setScalar(1.75 / maxDim);
    object.position.y += 0.05;
    floor.position.y = -size2.y * (1.75 / maxDim) * 0.52;
  }

  function onResize() {
    if (disposed) return;
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    try { renderer.dispose(); } catch (e) { /* ignore */ }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  function tick(now) {
    if (disposed) return;
    const t = Math.min(1, (now - clockStart) / durationMs);
    const e = easeInOutCubic(t);

    lerpVec3(camPos, camFrom, camTo, e);
    lerpVec3(lookPos, lookFrom, lookTo, e);
    camera.position.copy(camPos);
    camera.lookAt(lookPos);

    if (modelRoot) {
      modelRoot.rotation.y = Math.PI + (1 - e) * 0.22;
    }

    renderer.render(scene, camera);

    if (!midFired && t >= 0.48) {
      midFired = true;
      try { onMid?.(); } catch (err) { /* ignore */ }
    }
    if (!arriveFired && t >= 0.82) {
      arriveFired = true;
      root.classList.add('is-end');
      try { onArrive?.(); } catch (err) { /* ignore */ }
    }
    if (t >= 1) {
      window.setTimeout(() => {
        cleanup();
        try { onDone?.(); } catch (err) { /* ignore */ }
      }, 520);
      return;
    }
    raf = window.requestAnimationFrame(tick);
  }

  root.classList.add('is-run');
  camera.position.copy(camFrom);
  camera.lookAt(lookFrom);

  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      if (disposed) return;
      modelRoot = gltf.scene || gltf.scenes?.[0];
      if (!modelRoot) {
        cleanup();
        try { onDone?.(); } catch (e) { /* ignore */ }
        return;
      }
      modelRoot.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
          if (obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (!m) return;
              m.side = THREE.FrontSide;
              if ('roughness' in m) m.roughness = Math.min(0.92, (m.roughness ?? 0.7));
              if ('metalness' in m) m.metalness = Math.max(0.05, (m.metalness ?? 0.15));
              m.needsUpdate = true;
            });
          }
        }
      });
      frameModel(modelRoot);
      scene.add(modelRoot);
      raf = window.requestAnimationFrame(tick);
    },
    undefined,
    () => {
      cleanup();
      try { onDone?.(); } catch (e) { /* ignore */ }
    }
  );

  return { stop: cleanup, el: root };
}
