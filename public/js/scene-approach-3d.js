import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/examples/jsm/loaders/GLTFLoader.js';

function easeInOutQuart(t) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeDolly(t) {
  /* Partenza dolce, avanzamento fluido, frenata morbidissima sull'arrivo frontale */
  return 0.55 * easeInOutQuart(t) + 0.45 * easeOutCubic(t);
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

/**
 * Ambiente soggiorno 3D completo (Camera Projection dalla foto originale)
 * + radio 3D originale 552k triangoli FERMA sul tavolo.
 * La telecamera parte dall'inquadratura 3/4 sinistra della foto e si avvicina
 * con arco fluido fino ad allinearsi frontalmente al pixel con la Vintage 50 ufficiale.
 */
export function playApproach3D(opts = {}) {
  const {
    modelUrl,
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
    onDone = null
  } = opts;

  const isWorkshop = preset === 'falegname';
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

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
  });
  /* Piena densità pixel fino a 3x Retina per nitidezza massima del 3D su smartphone e monitor HiDPI */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isWorkshop ? 1.08 : 1.03;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);

  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy?.() || 8);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(isWorkshop ? 0x1a1510 : 0x1f1710);

  const envRT = buildWarmRoomEnv(renderer);
  scene.environment = envRT.texture;

  const fovStart = isWorkshop ? 36 : 34;
  const fovEnd = 32;
  const camera = new THREE.PerspectiveCamera(
    fovStart,
    Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
    0.05,
    40
  );

  /* Illuminazione: soggiorno = finestra sx; falegname = lampada articolare dall'alto-sinistra */
  const hemi = new THREE.HemisphereLight(
    isWorkshop ? 0xffe8c8 : 0xfff4e2,
    isWorkshop ? 0x1a120c : 0x261a10,
    isWorkshop ? 0.42 : 0.56
  );
  scene.add(hemi);

  const sunKey = new THREE.DirectionalLight(
    isWorkshop ? 0xffd9a0 : 0xfff1d6,
    isWorkshop ? 1.85 : 1.48
  );
  sunKey.position.set(
    isWorkshop ? -1.8 : -3.2,
    isWorkshop ? 4.2 : 2.8,
    isWorkshop ? 1.6 : 3.0
  );
  sunKey.castShadow = true;
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
    isWorkshop ? 0xc8d4e0 : 0xffe6c4,
    isWorkshop ? 0.32 : 0.44
  );
  fill.position.set(isWorkshop ? 2.8 : 2.5, isWorkshop ? 1.6 : 1.2, isWorkshop ? 2.4 : 3.2);
  scene.add(fill);

  if (isWorkshop) {
    /* Rimbalzo caldo della lampada sul banco */
    const lampBounce = new THREE.PointLight(0xffc878, 0.55, 6.5, 2.0);
    lampBounce.position.set(-0.6, 2.4, 0.9);
    scene.add(lampBounce);
  }

  let disposed = false;
  let raf = 0;
  let startTime = 0;
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
    const distEnd = Math.max(distForH, distForW) * 1.018;

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

    /* Partenza: radio GIÀ poggiata sul tavolo e ben visibile, poi solo zoom come soggiorno.
       Falegname: frontale, radio ~42% altezza schermo (non minuscola che “appare dopo”). */
    if (isWorkshop) {
      const tanHalfStart = Math.tan(THREE.MathUtils.degToRad(fovStart * 0.5));
      const fracHStart = 0.42;
      const distStart = Math.max(radioH / (2 * tanHalfStart * fracHStart), distEnd * 1.55);
      camStart.set(
        -distStart * 0.05,
        radioYCenter + 0.22,
        radioZFace + distStart * 0.98
      );
      /* Guarda leggermente sopra il centro: la base Y=0 resta sul piano del banco in basso */
      lookStart.set(0.02, radioYCenter + 0.12, 0.02);
    } else {
      const distStart = Math.max(distEnd * 1.85, 3.25);
      camStart.set(
        -distStart * 0.37,
        radioYCenter + 0.32,
        distStart * 0.93
      );
      lookStart.set(0.08, radioYCenter + 0.06, 0.0);
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
    const arcZ = Math.sin(Math.PI * e) * (isWorkshop ? 0.10 : 0.14);
    const arcY = Math.sin(Math.PI * e) * (isWorkshop ? 0.035 : 0.04);
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
    window.cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
    try { envRT.dispose(); } catch (e) { /* ignore */ }
    try { renderer.dispose(); } catch (e) { /* ignore */ }
    if (root.parentNode) root.parentNode.removeChild(root);
  }

  function tick(now) {
    if (disposed) return;
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    applyCameraAt(t);

    /* Arrivo super graduale: già al 72% la camera è quasi frontale e inizia un crossfade
       vellutato di 1.25s con messa a fuoco progressiva verso la Vintage 50 in alta definizione */
    if (!arriveFired && t >= 0.72) {
      arriveFired = true;
      root.classList.add('is-end');
      try { onArrive?.(); } catch (err) { /* ignore */ }
    }
    if (t >= 1) {
      window.setTimeout(() => {
        cleanup();
        try { onDone?.(); } catch (err) { /* ignore */ }
      }, 320);
      return;
    }
    raf = window.requestAnimationFrame(tick);
  }

  const boot = async () => {
    try {
      const [gltf, texRoomEmpty, texRoomWall] = await Promise.all([
        loadGlb(modelUrl),
        loadTexture(roomEmptyUrl),
        loadTexture(roomWallUrl)
      ]);
      if (disposed) return;

      const baseScene = gltf.scene || gltf.scenes?.[0];
      if (!baseScene) {
        cleanup();
        try { onDone?.(); } catch (e) { /* ignore */ }
        return;
      }
      /* Clona la radice così la cache in memoria rimane intatta per replay istantanei */
      const modelRoot = baseScene.clone(true);

      /* Qualità massima PBR sul modello originale 552k */
      modelRoot.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          m.side = THREE.FrontSide;
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach((k) => {
            if (m[k]) {
              m[k].anisotropy = maxAniso;
              m[k].needsUpdate = true;
            }
          });
          if ('envMapIntensity' in m) m.envMapIntensity = 0.85;
          m.needsUpdate = true;
        });
      });

      /* Centra e poggia ESATTAMENTE a Y = 0 sul tavolo. La radio resta 100% FERMA! */
      const box = new THREE.Box3().setFromObject(modelRoot);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      modelRoot.position.set(-center.x, -box.min.y, -center.z);
      modelRoot.rotation.set(0, 0, 0);

      radioW = size.x || 1.888;
      /* Escludi i ~4.5% di piedini sotto: il .chassis ufficiale Vintage 50 corrisponde al corpo cornice */
      radioH = (size.y || 1.061) * 0.956;
      radioZFace = size.z * 0.375;
      radioYCenter = (size.y || 1.061) * 0.536;

      scene.add(modelRoot);
      /* Attendi 1 frame di layout così .skin-vintage50 ha già applicato la misura reale del .chassis */
      await new Promise((r) => window.requestAnimationFrame(() => r()));
      if (disposed) return;
      calibrateCameraEndpoints();
      buildProjectedRoom(texRoomEmpty, texRoomWall);

      const initialT = typeof freezeAt === 'number' ? THREE.MathUtils.clamp(freezeAt, 0, 1) : 0;
      applyCameraAt(initialT);
      root.classList.add('is-run');
      try { onReady?.(); } catch (e) { /* ignore */ }

      if (typeof freezeAt === 'number') return;

      startTime = performance.now();
      raf = window.requestAnimationFrame(tick);
    } catch (e) {
      cleanup();
      try { onDone?.(); } catch (err) { /* ignore */ }
    }
  };

  boot();

  return { stop: cleanup, setT: applyCameraAt, el: root };
}
