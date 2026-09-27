/**
 * R3F-friendly three.quarks layer: one BatchedRenderer + pooled one-shot systems.
 * Spawn via spawnVfx() from combat hooks — keep particle counts small.
 */
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  ApplyForce,
  BatchedRenderer,
  Bezier,
  ColorOverLife,
  ConstantColor,
  ConstantValue,
  Gradient,
  IntervalValue,
  ParticleSystem,
  PiecewiseBezier,
  PointEmitter,
  RenderMode,
  SizeOverLife,
  SphereEmitter,
  Vector3,
  Vector4,
} from "three.quarks";
import { QUARKS_VFX, type QuarksSpawnRequest, type QuarksVfxKind } from "./quarksConfig";
import { setQuarksSpawnHandler } from "./spawnVfx";

type PoolSlot = {
  kind: QuarksVfxKind;
  system: ParticleSystem;
  busyUntil: number;
};

function makeSoftParticleTexture(size: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeParticleMaterial(map: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    color: 0xffffff,
  });
}

function createHitSpark(material: THREE.Material): ParticleSystem {
  // Chrona teal / warm gold flecks — Temporal Distortion hit proof.
  return new ParticleSystem({
    duration: 0.45,
    looping: false,
    autoDestroy: false,
    prewarm: false,
    shape: new SphereEmitter({ radius: 0.12, thickness: 1, arc: Math.PI * 2 }),
    startLife: new IntervalValue(0.18, 0.38),
    startSpeed: new IntervalValue(1.4, 3.2),
    startSize: new IntervalValue(0.06, 0.14),
    startColor: new ConstantColor(new Vector4(0.55, 0.95, 0.9, 1)),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(16),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    worldSpace: true,
    material,
    renderMode: RenderMode.BillBoard,
    renderOrder: 20,
    behaviors: [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 0.55, 0.2, 0), 0]])),
      new ColorOverLife(
        new Gradient(
          [
            [new Vector3(1, 0.92, 0.55), 0],
            [new Vector3(0.35, 0.85, 0.9), 0.45],
            [new Vector3(0.15, 0.35, 0.55), 1],
          ],
          [
            [1, 0],
            [0, 1],
          ],
        ),
      ),
      new ApplyForce(new Vector3(0, 1, 0), new ConstantValue(2.2)),
    ],
  });
}

function createCastBurst(material: THREE.Material): ParticleSystem {
  // Soft cyan cast bloom — Quicken / cast wind-up proof.
  return new ParticleSystem({
    duration: 0.55,
    looping: false,
    autoDestroy: false,
    prewarm: false,
    shape: new PointEmitter(),
    startLife: new IntervalValue(0.25, 0.5),
    startSpeed: new IntervalValue(0.4, 1.6),
    startSize: new IntervalValue(0.12, 0.28),
    startColor: new ConstantColor(new Vector4(0.65, 0.9, 1, 1)),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(22),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    worldSpace: true,
    material,
    renderMode: RenderMode.BillBoard,
    renderOrder: 19,
    behaviors: [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.4, 0.9, 0.7, 0), 0]])),
      new ColorOverLife(
        new Gradient(
          [
            [new Vector3(0.95, 0.98, 1), 0],
            [new Vector3(0.45, 0.85, 1), 0.4],
            [new Vector3(0.2, 0.4, 0.85), 1],
          ],
          [
            [1, 0],
            [0, 1],
          ],
        ),
      ),
      new ApplyForce(new Vector3(0, 1.4, 0), new ConstantValue(1.1)),
    ],
  });
}

function factoryFor(kind: QuarksVfxKind, material: THREE.Material): ParticleSystem {
  return kind === "hitSpark" ? createHitSpark(material) : createCastBurst(material);
}

function activateSlot(slot: PoolSlot, req: QuarksSpawnRequest, now: number): void {
  const { system } = slot;
  const lift = req.kind === "castBurst" ? 1.55 : 1.05;
  system.emitter.position.set(req.x, req.y + lift, req.z);
  system.restart();
  system.play();
  slot.busyUntil = now + (req.kind === "castBurst" ? 700 : 550);
}

export function QuarksVfxLayer() {
  const batchRef = useRef<BatchedRenderer | null>(null);
  const poolRef = useRef<PoolSlot[]>([]);
  const texRef = useRef<THREE.CanvasTexture | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const batch = useMemo(() => {
    if (!QUARKS_VFX.enabled) return null;
    return new BatchedRenderer();
  }, []);

  useEffect(() => {
    if (!QUARKS_VFX.enabled || !batch) {
      setQuarksSpawnHandler(null);
      return;
    }

    batchRef.current = batch;
    const tex = makeSoftParticleTexture(QUARKS_VFX.particleTexSize);
    const mat = makeParticleMaterial(tex);
    texRef.current = tex;
    matRef.current = mat;

    const pool: PoolSlot[] = [];
    const specs: Array<{ kind: QuarksVfxKind; n: number }> = [
      { kind: "hitSpark", n: QUARKS_VFX.hitSparkPool },
      { kind: "castBurst", n: QUARKS_VFX.castBurstPool },
    ];

    for (const { kind, n } of specs) {
      for (let i = 0; i < n; i++) {
        const system = factoryFor(kind, mat);
        batch.addSystem(system);
        batch.add(system.emitter);
        system.pause();
        pool.push({ kind, system, busyUntil: 0 });
      }
    }
    poolRef.current = pool;

    setQuarksSpawnHandler((req) => {
      const now = performance.now();
      const free = pool.find((s) => s.kind === req.kind && now >= s.busyUntil);
      if (!free) return;
      activateSlot(free, req, now);
    });

    return () => {
      setQuarksSpawnHandler(null);
      for (const slot of pool) {
        try {
          batch.deleteSystem(slot.system);
          slot.system.dispose();
        } catch {
          /* ignore dispose races */
        }
      }
      poolRef.current = [];
      mat.dispose();
      tex.dispose();
      texRef.current = null;
      matRef.current = null;
      batchRef.current = null;
    };
  }, [batch]);

  useFrame((_, delta) => {
    batchRef.current?.update(delta);
  });

  if (!batch) return null;
  return <primitive object={batch} />;
}
