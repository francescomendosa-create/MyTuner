import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/three/examples/jsm/libs/meshopt_decoder.module.js';

function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeDolly(t) {
  /* Resta in movimento fino alla faccia: non deve fermarsi prima e poi saltare. */
  const s = t * t * (3 - 2 * t);
  return 0.72 * t + 0.28 * s;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function loadTexture(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

const glbCache = new Map();

function loadGlb(url) {
  if (glbCache.has(url)) {
    return glbCache.get(url);
  }
  const p = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(url, resolve, undefined, (err) => {
      glbCache.delete(url);
      reject(err);
    });
  });
  glbCache.set(url, p);
  return p;
}

export function preloadModel3D(url) {
  if (!url) return;
  loadGlb(url).catch(() => {});
}

/**
 * Environment map calda da soggiorno per riflessi realistici su legno lucido,
 * vetro del dial, manopola in ottone spazzolato e griglia metallica.
 */
function buildWarmRoomEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x282018);

  const l1 = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff6e5 })
  );
  l1.position.set(-5, 2.5, 3);
  l1.lookAt(0, 0.5, 0);
  envScene.add(l1);

  const l2 = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffebd2 })
  );
  l2.position.set(4, 2, 4);
  l2.lookAt(0, 0.5, 0);
  envScene.add(l2);

  const rt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return rt;
}

/**
 * Ombra di contatto morbida sotto la radio sul piano del tavolo.
 */
function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  const g = ctx.createRadialGradient(128, 64, 18, 128, 64, 118);
  g.addColorStop(0.0, 'rgba(8, 4, 1, 0.84)');
  g.addColorStop(0.42, 'rgba(12, 6, 2, 0.55)');
  g.addColorStop(0.75, 'rgba(14, 7, 3, 0.20)');
  g.addColorStop(1.0, 'rgba(14, 7, 3, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Proiezione prospettica (Camera Projection): assegna alle geometrie 3D (tavolo e fondale)
 * le UV esatte della foto del soggiorno vista dalla camera di riferimento `projCam`.
 * Così a t=0 l'ambiente combacia al pixel con la foto originale, e muovendo la camera
 * in avanti si ottiene vera prospettiva e parallasse 3D senza texture stirate.
 */
function projectGeometryUVsFromCamera(mesh, projCam, photoAspect, vBias = 0) {
  mesh.updateMatrixWorld(true);
  const geom = mesh.geometry;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  /* Cover mapping: adatta la foto (1024x636) a qualsiasi viewport senza tagli o disallineamenti */
  const viewAspect = projCam.aspect || photoAspect;
  let scaleU = 1.0;
  let scaleV = 1.0;
  if (viewAspect > photoAspect) {
    scaleV = photoAspect / viewAspect;
  } else {
    scaleU = viewAspect / photoAspect;
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    v.project(projCam);
    const u = THREE.MathUtils.clamp(v.x * 0.5 * scaleU + 0.5, 0.002, 0.998);
    const w = THREE.MathUtils.clamp(v.y * 0.5 * scaleV + 0.5 + vBias, 0.002, 0.998);
    uv.setXY(i, u, w);
  }
  uv.needsUpdate = true;
}

function collectMeshes(root, test) {
  const out = [];
  root.traverse((obj) => {
    if (obj.isMesh && test(String(obj.name || ''))) out.push(obj);
  });
  return out;
}

function spinPivot(parent, meshes) {
  const list = meshes.filter(Boolean);
  if (!list.length) return null;
  parent.updateMatrixWorld(true);
  const box = new THREE.Box3();
  list.forEach((m) => box.expandByObject(m));
  if (box.isEmpty()) return null;
  const center = box.getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();
  parent.add(pivot);
  pivot.position.copy(parent.worldToLocal(center));
  list.forEach((m) => pivot.attach(m));
  return pivot;
}

function rememberMaterials(root) {
  const bag = [];
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m || !m.color) return;
      const cloned = m.clone();
      if (Array.isArray(obj.material)) {
        const i = obj.material.indexOf(m);
        if (i >= 0) obj.material[i] = cloned;
      } else obj.material = cloned;
      bag.push({
        mat: cloned,
        color: cloned.color.clone(),
        emissive: cloned.emissive ? cloned.emissive.clone() : null,
        name: String(obj.name || '')
      });
    });
  });
  return bag;
}

/**
 * Ambiente soggiorno 3D completo (Camera Projection dalla foto originale)
 * + radio a pezzi (Bang). La telecamera è la stessa di prima.
 * Manopole e tasti seguono lo stato del gameplay.
 */
export function playApproach3D(opts = {}) {
  const {
    modelUrl,
    worldUrl = '',
    roomEmptyUrl = '',
    roomWallUrl = '',
    targetEl = null,
    durationMs = 4700,
    freezeAt = null,
    /* 'soggiorno' | 'falegname' */
    preset = 'soggiorno',
    photoAspect: photoAspectOpt = 0,
    onReady = null,
    onArrive = null,
    onDone = null,
    onFail = null,
    getFace = null
  } = opts;

  const isWorkshop = preset === 'falegname';
  const useWorld = Boolean(worldUrl);
  const photoAspect = photoAspectOpt > 0
    ? photoAspectOpt
    : (isWorkshop ? 3072 / 1290 : 1024 / 636);

  const root = document.createElement('div');
  root.className = 'scene-approach scene-approach-3d';
  root.setAttribute('aria-hidden', 'true');
  const canvasHost = document.createElement('div');
  canvasHost.className = 'scene-approach-3d-host';
  root.appendChild(canvasHost);
  document.body.appendChild(root);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    });
  } catch (e) {
    if (root.parentNode) root.parentNode.removeChild(root);
    try { onFail?.(); } catch (err) { /* ignore */ }
    return { stop() {}, setT() {}, setFace() {}, el: root };
  }
  /* 2x tiene la texture nitida e non fa perdere il contesto WebGL (a 3x + ombre il telefono mostra solo un lampo). */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* Reinhard tiene i colori della texture, senza lo schiacciamento scuro di ACES. */
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = useWorld ? 1.28 : (isWorkshop ? 1.62 : 1.5);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy?.() || 8);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(isWorkshop ? 0x1a1510 : 0x1f1710);

  const envRT = buildWarmRoomEnv(renderer);
  scene.environment = envRT.texture;

  const fovStart = useWorld ? 40 : (isWorkshop ? 36 : 34);
  const fovEnd = 32;
  const camera = new THREE.PerspectiveCamera(
    fovStart,
    Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
    0.05,
    40
  );

  /* Illuminazione: soggiorno = finestra sx; falegname = lampada articolare dall'alto-sinistra */
  const hemi = new THREE.HemisphereLight(
    isWorkshop ? 0xfff2dc : 0xfff8ee,
    isWorkshop ? 0x3a2a1c : 0x4a3424,
    isWorkshop ? 0.72 : 0.85
  );
  if (useWorld) hemi.intensity = 1.2;
  scene.add(hemi);

  const sunKey = new THREE.DirectionalLight(
    isWorkshop ? 0xffe2b8 : 0xfff6e4,
    isWorkshop ? 2.15 : 1.85
  );
  sunKey.position.set(
    isWorkshop ? -1.8 : -3.2,
    isWorkshop ? 4.2 : 2.8,
    isWorkshop ? 1.6 : 3.0
  );
  sunKey.castShadow = !useWorld;
  sunKey.shadow.mapSize.set(1024, 1024);
  sunKey.shadow.radius = 6;
  sunKey.shadow.camera.near = 0.8;
  sunKey.shadow.camera.far = 12;
  sunKey.shadow.camera.left = -2.4;
  sunKey.shadow.camera.right = 2.4;
  sunKey.shadow.camera.top = 2.0;
  sunKey.shadow.camera.bottom = -1.2;
  sunKey.shadow.bias = -0.0006;
  scene.add(sunKey);

  const fill = new THREE.DirectionalLight(
    isWorkshop ? 0xe4eef8 : 0xfff0d8,
    isWorkshop ? 0.7 : 0.82
  );
  fill.position.set(isWorkshop ? 2.8 : 2.5, isWorkshop ? 1.6 : 1.2, isWorkshop ? 2.4 : 3.2);
  scene.add(fill);

  /* Luce frontale: la faccia resta chiara come nel viewer dove è stato creato il modello. */
  const faceLight = new THREE.DirectionalLight(0xfffaf2, isWorkshop ? 0.85 : 0.95);
  faceLight.position.set(0.2, 0.8, 4.2);
  scene.add(faceLight);

  if (isWorkshop) {
    /* Rimbalzo caldo della lampada sul banco */
    const lampBounce = new THREE.PointLight(0xffc878, 0.55, 6.5, 2.0);
    lampBounce.position.set(-0.6, 2.4, 0.9);
    scene.add(lampBounce);
  }

  let disposed = false;
  let raf = 0;
  let startTime = 0;
  let endTimer = 0;
  let arriveFired = false;

  const camStart = new THREE.Vector3(-1.12, 0.69, 2.95);
  const camEnd = new THREE.Vector3(0, 0.53, 2.15);
  const lookStart = new THREE.Vector3(0.06, 0.50, 0.02);
  const lookEnd = new THREE.Vector3(0, 0.53, 0.27);
  const camPos = new THREE.Vector3();
  const lookPos = new THREE.Vector3();

  let radioW = 1.888;
  let radioH = 1.015;
  let radioZFace = 0.205;
  let radioYCenter = 0.545;
  let radioFrontZ = 0.2;
  const radioAnchor = new THREE.Vector3();
  let worldCamPos = null;
  let worldCamLook = null;
  let tunePivot = null;
  let volPivot = null;
  let powerPivot = null;
  let pausePivot = null;
  let signalPivot = null;
  let cursorPivot = null;
  let cursorX0 = 0;
  let cursorTravel = 0.09;
  let slideParts = [];
  let matBag = [];
  let faceKey = '';

  function rigGameplayParts(modelRoot) {
    const by = (re) => collectMeshes(modelRoot, (name) => re.test(name));
    tunePivot = spinPivot(modelRoot, by(/Tuning fluted grip|Molded concentric tuning|Tuning index/));
    volPivot = spinPivot(modelRoot, by(/Volume fluted grip|Spun volume cap|Volume index/));
    powerPivot = spinPivot(modelRoot, by(/Power pivoted rocker/));
    pausePivot = spinPivot(modelRoot, by(/Pause pivoted rocker/));
    signalPivot = spinPivot(modelRoot, by(/Tapered signal pointer/));
    cursorPivot = spinPivot(modelRoot, by(/Sliding dial cursor/));
    cursorX0 = cursorPivot ? cursorPivot.position.x : 0;
    cursorTravel = 0.09;
    const scaleMarks = by(/Frequency chart|Cream dial ink printed scale/);
    if (cursorPivot && scaleMarks.length) {
      const box = new THREE.Box3();
      scaleMarks.forEach((m) => box.expandByObject(m));
      const span = box.getSize(new THREE.Vector3()).x / (modelRoot.scale.x || 1);
      if (span > 0.02) cursorTravel = span * 0.42;
    }
    const slides = [
      [/FM\/AM selector|FM\/AM toggle/, 0.011],
      [/MONO\/STEREO selector/, 0.011],
      [/AUTO\/MANUAL selector/, 0.011],
      [/PRESET selector|PRESET toggle/, 0]
    ];
    slideParts = slides.map(([re, travel]) => {
      const meshes = by(re);
      const pivot = spinPivot(modelRoot, meshes);
      return pivot ? { pivot, x0: pivot.position.x, z0: pivot.position.z, travel } : null;
    }).filter(Boolean);
    matBag = rememberMaterials(modelRoot);
  }

  function applyGameplayFace(face) {
    if (!face) return;
    const key = [
      face.power ? 1 : 0,
      face.stopped ? 1 : 0,
      Math.round((face.tuneDeg || 0) * 10),
      Math.round((face.volDeg || 0) * 10),
      face.am ? 1 : 0,
      face.stereo ? 1 : 0,
      face.manual ? 1 : 0,
      face.preset ? 1 : 0,
      Math.round((face.signalDeg || 0) * 2),
      Math.round((face.tune01 || 0) * 200),
    ].join('|');
    if (key === faceKey) return;
    faceKey = key;
    const zOf = (deg) => -THREE.MathUtils.degToRad(deg || 0);
    if (tunePivot) tunePivot.rotation.z = zOf(face.tuneDeg);
    if (volPivot) volPivot.rotation.z = zOf(face.volDeg);
    if (signalPivot) signalPivot.rotation.z = zOf(face.signalDeg);
    if (cursorPivot) {
      const p = Math.max(0, Math.min(1, face.tune01 ?? 0.5));
      cursorPivot.position.x = cursorX0 + (p - 0.5) * cursorTravel;
    }
    if (powerPivot) powerPivot.rotation.x = face.power ? 0.32 : -0.22;
    if (pausePivot) pausePivot.rotation.x = face.stopped ? 0.28 : -0.16;
    const dx = [
      face.am ? 0.006 : -0.012,
      face.stereo ? 0.006 : -0.012,
      face.manual ? 0.006 : -0.012,
      0
    ];
    slideParts.forEach((part, i) => {
      part.pivot.position.x = part.x0 + dx[i];
      part.pivot.position.z = part.z0 + (i === 3 && face.preset ? -0.004 : 0);
    });
    const on = Boolean(face.power);
    matBag.forEach((rec) => {
      const lamp = /pilot lens|Lamp ferrule/i.test(rec.name);
      const ch = /Channel (Down|Up) key/i.test(rec.name);
      const cast = /Cast key/i.test(rec.name);
      if (on) rec.mat.color.copy(rec.color);
      else rec.mat.color.copy(rec.color).multiplyScalar(lamp ? 0.22 : 0.48);
      if (rec.mat.emissive) {
        if (on && lamp) rec.mat.emissive.set(0xc8f6ff);
        else if (on && ch) rec.mat.emissive.set(0x39e86a);
        else if (on && cast) rec.mat.emissive.set(0x3c78ff);
        else if (rec.emissive) rec.mat.emissive.copy(rec.emissive);
        else rec.mat.emissive.set(0x000000);
        rec.mat.emissiveIntensity = on && (lamp || ch || cast) ? (lamp ? 0.85 : 0.55) : 0;
      }
    });
  }

  function calibrateCameraEndpoints() {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const aspect = vw / vh;
    const rect = targetEl?.getBoundingClientRect?.();
    const fracH = rect && rect.height > 40 ? rect.height / vh : 0.88;
    const fracW = rect && rect.width > 60 ? rect.width / vw : 0.86;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fovEnd * 0.5));

    /* Usa esattamente le dimensioni della faccia frontale (piano cornice a z = radioZFace)
       così la radio 3D a t=1 combacia al pixel con il .chassis della Vintage 50 ufficiale! */
    const distForH = radioH / (2 * tanHalf * fracH);
    const distForW = radioW / (2 * tanHalf * aspect * fracW);
    /* Stesso rapporto della faccia di gameplay: altezza e larghezza arrivano insieme. */
    const distEnd = (distForH + distForW) * 0.5;

    let dyWorld = 0;
    let dxWorld = 0;
    if (rect && rect.height > 40 && rect.width > 60) {
      const cyNorm = ((rect.top + rect.height * 0.5) / vh) - 0.5;
      const cxNorm = ((rect.left + rect.width * 0.5) / vw) - 0.5;
      const visibleHAtEnd = 2 * distEnd * tanHalf;
      const visibleWAtEnd = visibleHAtEnd * aspect;
      dyWorld = cyNorm * visibleHAtEnd;
      dxWorld = -cxNorm * visibleWAtEnd;
    }

    camEnd.set(dxWorld, radioYCenter + dyWorld, radioZFace + distEnd);
    lookEnd.set(dxWorld, radioYCenter + dyWorld, radioZFace);

    if (useWorld && worldCamPos) {
      camStart.copy(worldCamPos);
      lookStart.copy(worldCamLook);
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(fovEnd * 0.5));
      const distEnd = radioH / (2 * tanHalf * Math.max(0.55, fracH));
      camEnd.set(radioAnchor.x, radioAnchor.y, radioFrontZ + distEnd);
      lookEnd.set(radioAnchor.x, radioAnchor.y, radioFrontZ);
      return;
    }

    /* Partenza: radio GIÀ poggiata sul tavolo e ben visibile, poi solo zoom come soggiorno.
       Falegname: frontale, radio ~42% altezza schermo (non minuscola che “appare dopo”). */
    if (isWorkshop) {
      const distStart = Math.max(distEnd * 2.7, 4.1);
      camStart.set(
        -distStart * 0.05,
        radioYCenter + 0.36,
        radioZFace + distStart
      );
      lookStart.set(0, radioYCenter, radioZFace);
    } else {
      const distStart = Math.max(distEnd * 3.2, 4.6);
      camStart.set(
        -distStart * 0.18,
        radioYCenter + 0.28,
        radioZFace + distStart
      );
      lookStart.set(0, radioYCenter, radioZFace);
    }
  }

  function buildProjectedRoom(texRoomEmpty, texRoomWall) {
    const projCam = new THREE.PerspectiveCamera(fovStart, camera.aspect, 0.05, 40);
    projCam.position.copy(camStart);
    projCam.lookAt(lookStart);
    projCam.updateMatrixWorld(true);
    projCam.updateProjectionMatrix();
    const vBias = camera.aspect > photoAspect
      ? (isWorkshop ? -0.02 : -0.055)
      : (isWorkshop ? 0.03 : 0.0);

    if (texRoomWall) texRoomWall.anisotropy = maxAniso;
    if (texRoomEmpty) texRoomEmpty.anisotropy = maxAniso;

    /* Fondale fotografico (foto originale integra del banco / soggiorno) */
    const bgZ = isWorkshop ? -1.15 : -1.45;
    const distToBg = camStart.z - bgZ;
    const visH = 2 * distToBg * Math.tan(THREE.MathUtils.degToRad(fovStart * 0.5));
    const visW = visH * Math.max(photoAspect, camera.aspect);
    const bgGeom = new THREE.PlaneGeometry(
      visW * (isWorkshop ? 1.85 : 1.55),
      visH * (isWorkshop ? 1.85 : 1.55),
      32,
      20
    );
    const bgMat = new THREE.MeshBasicMaterial({
      map: texRoomEmpty || texRoomWall || null,
      color: 0xffffff
    });
    const bgMesh = new THREE.Mesh(bgGeom, bgMat);
    bgMesh.position.set(isWorkshop ? 0.04 : 0.18, radioYCenter + (isWorkshop ? -0.05 : 0.06), bgZ);
    projectGeometryUVsFromCamera(bgMesh, projCam, photoAspect, vBias);
    scene.add(bgMesh);

    const tableMat = new THREE.MeshBasicMaterial({
      map: texRoomEmpty || null,
      color: 0xffffff
    });

    /* Piano Y=0: la radio poggia QUI dalla prima frame */
    const tblW = isWorkshop ? 8.5 : 6.8;
    const tblBackZ = isWorkshop ? -0.55 : -0.82;
    const tblFrontZ = isWorkshop ? 0.70 : 0.88;
    const tblD = tblFrontZ - tblBackZ;
    const tblCenterZ = (tblBackZ + tblFrontZ) * 0.5;
    const tblX = isWorkshop ? 0.04 : 0.12;

    const topGeom = new THREE.PlaneGeometry(tblW, tblD, 48, 24);
    topGeom.rotateX(-Math.PI / 2);
    const tableTop = new THREE.Mesh(topGeom, tableMat);
    tableTop.position.set(tblX, 0.0, tblCenterZ);
    projectGeometryUVsFromCamera(tableTop, projCam, photoAspect, vBias);
    scene.add(tableTop);

    /* Grembiule: CORTO sul falegname (solo spessore banco), alto sul soggiorno */
    const frontH = isWorkshop ? 0.42 : 1.55;
    const frontGeom = new THREE.PlaneGeometry(tblW, frontH, 48, isWorkshop ? 8 : 14);
    const tableFront = new THREE.Mesh(frontGeom, tableMat);
    tableFront.position.set(tblX, -frontH * 0.5, tblFrontZ);
    projectGeometryUVsFromCamera(tableFront, projCam, photoAspect, vBias);
    scene.add(tableFront);

    const shadowCatcher = new THREE.Mesh(
      new THREE.PlaneGeometry(tblW, tblD),
      new THREE.ShadowMaterial({ opacity: isWorkshop ? 0.30 : 0.16 })
    );
    shadowCatcher.rotation.x = -Math.PI / 2;
    shadowCatcher.position.set(tblX, 0.0015, tblCenterZ);
    shadowCatcher.receiveShadow = true;
    scene.add(shadowCatcher);

    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(radioW * 1.14, 0.76),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.84
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0.02, 0.003, -0.01);
    scene.add(contactShadow);
  }

  function applyCameraAt(t) {
    const e = easeDolly(t);
    const arcZ = useWorld ? 0 : Math.sin(Math.PI * e) * (isWorkshop ? 0.10 : 0.14);
    const arcY = useWorld ? 0 : Math.sin(Math.PI * e) * (isWorkshop ? 0.035 : 0.04);
    camPos.set(
      lerp(camStart.x, camEnd.x, e),
      lerp(camStart.y, camEnd.y, e) + arcY,
      lerp(camStart.z, camEnd.z, e) + arcZ
    );
    lookPos.set(
      lerp(lookStart.x, lookEnd.x, e),
      lerp(lookStart.y, lookEnd.y, e),
      lerp(lookStart.z, lookEnd.z, e)
    );
    const fov = lerp(fovStart, fovEnd, e);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.position.copy(camPos);
    camera.lookAt(lookPos);
    try { applyGameplayFace(getFace?.()); } catch (e) { /* ignore */ }
    renderer.render(scene, camera);
  }

  function onResize() {
    if (disposed) return;
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    calibrateCameraEndpoints();
  }
  window.addEventListener('resize', onResize);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    window.clearTimeout(endTimer);
    window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    try { envRT.dispose(); } catch (e) { /* ignore */ }
    try { renderer.dispose(); } catch (e) { /* ignore */ }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  renderer.domElement.addEventListener('webglcontextlost', (ev) => {
    ev.preventDefault();
    if (disposed) return;
    cleanup();
    try { (onFail || onDone)?.(); } catch (err) { /* ignore */ }
  });

  function tick(now) {
    if (disposed) return;
    if (!startTime) startTime = now;
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    try {
      applyCameraAt(t);
    } catch (e) {
      cleanup();
      try { (onFail || onDone)?.(); } catch (err) { /* ignore */ }
      return;
    }

    /* La faccia di gameplay entra solo a zoom concluso, sulla stessa misura. */
    if (!arriveFired && t >= 1) {
      arriveFired = true;
      root.classList.add('is-end');
      try { onArrive?.(); } catch (err) { /* ignore */ }
    }
    if (t >= 1) {
      endTimer = window.setTimeout(() => {
        cleanup();
        try { onDone?.(); } catch (err) { /* ignore */ }
      }, 700);
      return;
    }
    raf = window.requestAnimationFrame(tick);
  }

  const boot = async () => {
    try {
      const loaded = await Promise.all(useWorld
        ? [loadGlb(modelUrl), loadGlb(worldUrl)]
        : [loadGlb(modelUrl), loadTexture(roomEmptyUrl), loadTexture(roomWallUrl)]);
      const gltf = loaded[0];
      const texRoomEmpty = useWorld ? null : loaded[1];
      const texRoomWall = useWorld ? null : loaded[2];
      const worldGltf = useWorld ? loaded[1] : null;
      if (disposed) return;

      const baseScene = gltf.scene || gltf.scenes?.[0];
      if (!baseScene) {
        cleanup();
        try { (onFail || onDone)?.(); } catch (e) { /* ignore */ }
        return;
      }
      /* Clona la radice così la cache in memoria rimane intatta per replay istantanei */
      const modelRoot = baseScene.clone(true);
      /* Il modello arriva sdraiato, faccia verso il basso.
         La mette in piedi: faccia verso la camera e verso l'alto, cassa a destra. */
      modelRoot.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, 0, 1, 0,
        0, -1, 0, 0,
        0, 0, 0, 1
      ));
      modelRoot.updateMatrixWorld(true);
      const rawBox = new THREE.Box3().setFromObject(modelRoot);
      const rawH = rawBox.getSize(new THREE.Vector3()).y || 1;
      /* Nel salotto 3D l'altezza è quella di una radio vera sul mobile. Altrimenti resta la scala della carrellata. */
      modelRoot.scale.multiplyScalar((useWorld ? 0.56 : 1.04) / rawH);

      modelRoot.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.castShadow = !useWorld;
        obj.receiveShadow = !useWorld;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          m.side = THREE.DoubleSide;
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach((k) => {
            if (m[k]) {
              m[k].anisotropy = maxAniso;
              m[k].needsUpdate = true;
            }
          });
          if ('envMapIntensity' in m) m.envMapIntensity = 0.18;
          /* La scala FM/AM è carta stampata: il normal map la faceva sembrare scolpita. */
          if (m.normalScale) m.normalScale.set(0.08, 0.08);
          m.needsUpdate = true;
        });
      });

      scene.add(modelRoot);
      rigGameplayParts(modelRoot);
      try { applyGameplayFace(getFace?.()); } catch (e) { /* ignore */ }
      /* Attendi il layout vero del .chassis, poi allarga la faccia esattamente su quel rettangolo. */
      await new Promise((r) => window.requestAnimationFrame(() => r()));
      if (disposed) return;
      const faceRect = targetEl?.getBoundingClientRect?.();
      const faceAspect = faceRect && faceRect.width > 80 && faceRect.height > 40
        ? faceRect.width / faceRect.height
        : 978 / 508;
      let box = new THREE.Box3().setFromObject(modelRoot);
      let size = box.getSize(new THREE.Vector3());
      const haveAspect = size.x / Math.max(size.y, 1e-6);
      /* Niente stiramento in larghezza: deformava la scala FM/AM stampata. */
      if (!useWorld && haveAspect > 0.2) modelRoot.scale.x *= faceAspect / haveAspect;
      modelRoot.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(modelRoot);
      size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      if (useWorld && worldGltf) {
        const worldRoot = worldGltf.scene || worldGltf.scenes?.[0];
        worldRoot.traverse((obj) => {
          if (!obj.isMesh) return;
          obj.castShadow = false;
          obj.receiveShadow = true;
        });
        scene.add(worldRoot);
        const camHolder = new THREE.Object3D();
        camHolder.applyMatrix4(new THREE.Matrix4().set(
          0.9993798964236851, -0.005201295117062011, 0.03482483529450786, -1.2805290222167969,
          0.0, 0.9890296069671825, 0.14771742125538334, 2.5073909759521484,
          -0.035211115065904644, -0.14762582115417885, 0.9884163061708209, 10.113485336303711,
          0, 0, 0, 1
        ));
        worldCamPos = camHolder.position.clone();
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camHolder.quaternion);
        worldCamLook = worldCamPos.clone().add(fwd.multiplyScalar(8));
        const ray = new THREE.Raycaster();
        const down = new THREE.Vector3(0, -1, 0);
        let spot = null;
        [[-1.15, 2.25], [-0.35, 2.15], [-1.9, 2.45], [0.15, 1.9]].forEach(([x, z]) => {
          if (spot) return;
          ray.set(new THREE.Vector3(x, 3.2, z), down);
          const hits = ray.intersectObject(worldRoot, true);
          const hit = hits[0];
          if (hit && hit.point.y < 0.4 && hit.point.y > -1.2) {
            spot = { x, z, y: hit.point.y };
          }
        });
        if (!spot) spot = { x: -1.15, z: 2.25, y: -0.28 };
        modelRoot.position.set(spot.x - center.x, spot.y - box.min.y, spot.z - center.z);
      } else {
        modelRoot.position.set(-center.x, -box.min.y, -center.z);
      }
      modelRoot.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(modelRoot);
      size = box.getSize(new THREE.Vector3());
      const placed = box.getCenter(new THREE.Vector3());

      radioW = size.x || 1.888;
      radioH = size.y || 1.061;
      radioZFace = useWorld ? box.max.z : size.z * 0.5;
      radioFrontZ = box.max.z;
      radioYCenter = useWorld ? placed.y : (size.y || 1.061) * 0.5;
      radioAnchor.set(placed.x, placed.y, box.max.z);
      calibrateCameraEndpoints();
      if (!useWorld) buildProjectedRoom(texRoomEmpty, texRoomWall);

      const initialT = typeof freezeAt === 'number' ? THREE.MathUtils.clamp(freezeAt, 0, 1) : 0;
      applyCameraAt(initialT);
      root.classList.add('is-run');
      try { onReady?.(); } catch (e) { /* ignore */ }

      if (typeof freezeAt === 'number') return;

      startTime = performance.now();
      raf = window.requestAnimationFrame(tick);
    } catch (e) {
      cleanup();
      try { (onFail || onDone)?.(); } catch (err) { /* ignore */ }
    }
  };

  boot();

  /* v315: pezzi Bang legati al gameplay */
  return { stop: cleanup, setT: applyCameraAt, setFace: applyGameplayFace, el: root };
}
