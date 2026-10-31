import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const SECTION_VH = 420;

export default function ScrollAnimation() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef(null);
  const [scrollP, setScrollP] = useState(0);
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      targetRef.current = p;
      setScrollP(p);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.2, 6.2);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Environment for reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    scene.environment = pmrem.fromScene(env).texture;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x22d3ee, 0.9);
    rim.position.set(-5, 3, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0x6366f1, 0.6);
    fill.position.set(0, -2, 3);
    scene.add(fill);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2.0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Materials
    const matShell = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a, metalness: 0.7, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.2,
    });
    const matAccent = new THREE.MeshPhysicalMaterial({
      color: 0x6366f1, metalness: 0.5, roughness: 0.2, clearcoat: 1.0,
      emissive: 0x6366f1, emissiveIntensity: 0.35,
    });
    const matScreen = new THREE.MeshPhysicalMaterial({
      color: 0x020617, metalness: 0.1, roughness: 0.05, clearcoat: 1.0,
    });
    const matBoard = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b, metalness: 0.4, roughness: 0.5,
    });
    const matBattery = new THREE.MeshPhysicalMaterial({
      color: 0x10b981, metalness: 0.4, roughness: 0.3, clearcoat: 0.4,
    });

    // Canvas texture for "CertTrack" label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 128;
    const lctx = labelCanvas.getContext('2d');
    lctx.fillStyle = 'transparent';
    lctx.clearRect(0, 0, 512, 128);
    lctx.font = 'bold 72px sans-serif';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    const grad = lctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#6366f1');
    grad.addColorStop(1, '#22d3ee');
    lctx.fillStyle = grad;
    lctx.fillText('CertTrack', 256, 64);
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const matLabel = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true });

    const group = new THREE.Group();
    scene.add(group);

    const parts = [];

    function addPart(mesh, baseY, dir) {
      mesh.position.y = baseY;
      mesh.castShadow = true;
      group.add(mesh);
      parts.push({ mesh, baseY, dir });
    }

    const bottom = new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.34, 1.8, 6, 0.12), matShell);
    addPart(bottom, -1.1, -1.6);

    const battery = new THREE.Mesh(new RoundedBoxGeometry(2.7, 0.28, 1.45, 6, 0.1), matBattery);
    addPart(battery, -0.5, -0.7);

    const board = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.18, 1.6, 6, 0.08), matBoard);
    addPart(board, 0.0, 0.0);

    const screen = new THREE.Mesh(new RoundedBoxGeometry(2.85, 0.12, 1.55, 6, 0.06), matScreen);
    addPart(screen, 0.55, 0.7);

    const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.62), matLabel);
    labelPlane.position.set(0, 0.62, 0);
    labelPlane.rotation.x = -Math.PI / 2;
    group.add(labelPlane);
    parts.push({ mesh: labelPlane, baseY: 0.62, dir: 0.7 });

    const top = new THREE.Mesh(new RoundedBoxGeometry(3.55, 0.42, 1.95, 6, 0.14), matShell);
    addPart(top, 1.15, 1.6);

    const strip = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.1, 0.16, 4, 0.05), matAccent);
    strip.position.set(0, 1.4, 0);
    addPart(strip, 1.4, 1.8);

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    const animate = () => {
      const target = targetRef.current;
      currentRef.current += (target - currentRef.current) * 0.08;
      if (Math.abs(target - currentRef.current) < 0.0001) currentRef.current = target;
      const p = currentRef.current;
      const explode = Math.sin(p * Math.PI);

      parts.forEach((part) => {
        part.mesh.position.y = part.baseY + explode * part.dir;
      });
      group.rotation.y = p * Math.PI * 0.6 + Math.sin(clock.getElapsedTime() * 0.4) * 0.15;
      group.position.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.08;

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      pmrem.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      labelTex.dispose();
    };
  }, [reduced]);

  const opacityFor = (a, b) => {
    const mid = (a + b) / 2;
    const half = (b - a) / 2;
    const d = Math.abs(scrollP - mid);
    return Math.max(0, 1 - d / half);
  };
  const show = (a, b) => scrollP >= a && scrollP <= b;

  if (reduced) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">CertTrack 3D view</h2>
          <p className="text-gray-400">Animation disabled per your system preferences.</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${SECTION_VH}vh` }} aria-label="3D product animation">
      <div className="sticky top-0 h-screen w-full overflow-hidden relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/60" />

        <div className="absolute inset-0 z-10 flex items-center px-6 md:px-12">
          <motion.div className="max-w-3xl" animate={{ opacity: opacityFor(0, 0.15), y: show(0, 0.15) ? 0 : 20 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0, 0.15) ? 'auto' : 'none' }}>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">CertTrack</h1>
            <p className="mt-4 text-xl text-gray-300">Credentials, verified.</p>
            <div className="mt-10 flex items-center gap-3 text-sm text-gray-400">
              <span className="inline-block w-8 h-px bg-cyan-400" />
              Scroll to explore
            </div>
          </motion.div>

          <motion.div className="absolute right-6 md:right-12 top-[40%] max-w-xl text-right"
            animate={{ opacity: opacityFor(0.2, 0.4), x: show(0.2, 0.4) ? 0 : 30 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0.2, 0.4) ? 'auto' : 'none' }}>
            <span className="text-cyan-400 text-sm font-mono">01</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">Verified Credentials</h2>
            <p className="mt-3 text-gray-300 text-lg">Cryptographically signed certificates with public JWKS verification.</p>
          </motion.div>

          <motion.div className="absolute left-6 md:left-12 top-1/3 max-w-md"
            animate={{ opacity: opacityFor(0.45, 0.65), x: show(0.45, 0.65) ? 0 : -30 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0.45, 0.65) ? 'auto' : 'none' }}>
            <span className="text-cyan-400 text-sm font-mono">02</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">Credit Ledger</h2>
            <p className="mt-3 text-gray-300 text-lg">Automatic credit calculation with versioned rules and audit trail.</p>
          </motion.div>

          <motion.div className="absolute right-6 md:right-12 bottom-1/3 max-w-md text-right"
            animate={{ opacity: opacityFor(0.45, 0.65), x: show(0.45, 0.65) ? 0 : 30 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0.45, 0.65) ? 'auto' : 'none' }}>
            <span className="text-cyan-400 text-sm font-mono">03</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">Real-time Verification</h2>
            <p className="mt-3 text-gray-300 text-lg">Socket.IO notifications and SLA reminders for verifiers.</p>
          </motion.div>

          <motion.div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 max-w-xl"
            animate={{ opacity: opacityFor(0.7, 0.9), y: show(0.7, 0.9) ? 0 : 20 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0.7, 0.9) ? 'auto' : 'none' }}>
            <span className="text-cyan-400 text-sm font-mono">SPECS</span>
            <h2 className="text-3xl md:text-5xl font-bold mt-2">Secure by Design</h2>
            <ul className="mt-4 space-y-2 text-gray-300 text-lg">
              <li>Ed25519 signed credentials</li>
              <li>JWT rotation + CSRF protection</li>
              <li>RBAC: Student/Faculty/HOD/Admin</li>
              <li>OCR & fraud detection</li>
            </ul>
          </motion.div>

          <motion.div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
            animate={{ opacity: opacityFor(0.9, 1.0), scale: show(0.9, 1.0) ? 1 : 0.95 }} transition={{ duration: 0.4 }}
            style={{ pointerEvents: show(0.9, 1.0) ? 'auto' : 'none' }}>
            <h2 className="text-4xl md:text-6xl font-bold">Verified. Ready.</h2>
            <p className="mt-4 text-gray-300 text-lg max-w-xl">Start issuing and verifying credentials today.</p>
            <a href="/register" className="mt-8 inline-flex items-center justify-center h-12 px-8 rounded-full bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors">
              Get Started
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
