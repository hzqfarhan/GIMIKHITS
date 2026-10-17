'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTheme } from './ThemeProvider';
import { brandMaterial } from './brandMaterials';
import {hitsSilhouette} from './hitsSilhouette';

type CoreProps = { progress: number; ignition?: boolean; phase?: string; intensity?: number; framing?: number };
type Disposable = { dispose: () => void };
type SceneObject = InstanceType<typeof THREE.Object3D>;
const phasePower: Record<string, number> = { idle: 0, verify: 0.26, assemble: 0.52, charge: 0.88, countdown: 1.18, burst: 1.7 };

/** A procedural reactor shared by the stage, audience and launch sequence. */
export default function Core({ progress = 0, ignition = false, phase = 'idle', intensity, framing = 1 }: CoreProps) {
  const {theme} = useTheme();
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ progress, ignition, phase, intensity });
  const [fallback, setFallback] = useState(false);
  useEffect(() => { state.current = { progress, ignition, phase, intensity }; }, [progress, ignition, phase, intensity]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 760px)').matches;
    let reduced = motionQuery.matches;
    let renderer: InstanceType<typeof THREE.WebGLRenderer>;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !compact, powerPreference: compact ? 'low-power' : 'high-performance' });
    } catch {
      const fallbackFrame = requestAnimationFrame(() => setFallback(true));
      return () => cancelAnimationFrame(fallbackFrame);
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.35 : 1.7));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === 'purple' ? 1.2 : theme === 'hits-light' ? .95 : 1.05;
    el.appendChild(renderer.domElement);

    const geometries = new Set<Disposable>();
    const materials = new Set<Disposable>();
    const textures = new Set<Disposable>();
    const geometry = <T extends Disposable,>(value: T): T => { geometries.add(value); return value; };
    const material = <T extends Disposable,>(value: T): T => { materials.add(value); return brandMaterial(value, theme); };
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
    const reactor = new THREE.Group();
    scene.add(reactor);

    // This generated texture supplies soft light to particles and glow sprites.
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 96;
    const context = glowCanvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.12, 'rgba(255,255,255,.95)');
      gradient.addColorStop(0.3, 'rgba(255,255,255,.3)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 96, 96);
    }
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    textures.add(glowTexture);
    function glow(color: number, size: number, opacity: number, parent: SceneObject = reactor) {
      const spriteMaterial = material(new THREE.SpriteMaterial({ map: glowTexture, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.setScalar(size);
      parent.add(sprite);
      return sprite;
    }
    const aura = glow(0x7548ff, 7.1, 0.4);
    const innerAura = glow(0x9a63ff, 3.2, 0.7);
    const nucleusGlow = glow(0xbafaff, 1.3, 0.95);
    const shellGeometry = geometry(new THREE.IcosahedronGeometry(1.1, 0));
    const shellMaterial = material(new THREE.MeshPhysicalMaterial({
      color: 0x6540e8, emissive: 0x4d26b5, emissiveIntensity: 0.95, metalness: 0.42,
      roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.12, transparent: true,
      opacity: 0.42, side: THREE.DoubleSide, flatShading: true, depthWrite: false,
    }));
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    reactor.add(shell);
    const edgesMaterial = material(new THREE.LineBasicMaterial({ color: 0xd2b4ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    const edges = new THREE.LineSegments(geometry(new THREE.EdgesGeometry(shellGeometry)), edgesMaterial);
    reactor.add(edges);
    const inner = new THREE.Mesh(
      geometry(new THREE.OctahedronGeometry(0.69, 0)),
      material(new THREE.MeshBasicMaterial({ color: 0x78edff, wireframe: true, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending })),
    );
    const heart = new THREE.Mesh(
      geometry(new THREE.IcosahedronGeometry(0.23, 1)),
      material(new THREE.MeshBasicMaterial({ color: 0xe8faff })),
    );
    const cageGeometry = geometry(new THREE.DodecahedronGeometry(1.4, 0));
    const cage = new THREE.LineSegments(
      geometry(new THREE.EdgesGeometry(cageGeometry)),
      material(new THREE.LineBasicMaterial({ color: 0x8654d6, transparent: true, opacity: 0.21, blending: THREE.AdditiveBlending })),
    );
    reactor.add(inner, heart, cage);

    // A bevelled low-poly badge carries the supplied HITS artwork inside the orb.
    // The badge gently tilts while the surrounding shell rotates independently.
    const badge = new THREE.Group();
    badge.position.z = 1.08;
    reactor.add(badge);
    const badgeShape = new THREE.Shape();
    badgeShape.moveTo(-.96,-.57);badgeShape.lineTo(.96,-.57);
    badgeShape.lineTo(1.12,-.38);badgeShape.lineTo(1.12,.38);
    badgeShape.lineTo(.96,.57);badgeShape.lineTo(-.96,.57);
    badgeShape.lineTo(-1.12,.38);badgeShape.lineTo(-1.12,-.38);badgeShape.closePath();
    const badgeGeometry=geometry(new THREE.ExtrudeGeometry(badgeShape,{depth:.13,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.055,bevelThickness:.035}));
    const badgeMaterial=material(new THREE.MeshStandardMaterial({color:0x141127,emissive:0x22113e,emissiveIntensity:.55,metalness:.8,roughness:.3,flatShading:true}));
    const badgeBase=new THREE.Mesh(badgeGeometry,badgeMaterial);badge.add(badgeBase);
    const badgeOutline=new THREE.LineSegments(geometry(new THREE.EdgesGeometry(badgeGeometry)),material(new THREE.LineBasicMaterial({color:0xb5a0ff,transparent:true,opacity:.65,blending:THREE.AdditiveBlending})));
    badge.add(badgeOutline);
    const logoMaterial=material(new THREE.ShaderMaterial({
      uniforms:{logoMap:{value:null}},transparent:true,depthWrite:false,
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:`uniform sampler2D logoMap; varying vec2 vUv; void main(){vec2 uv=vec2(265.0/1563.0,583.0/1563.0)+vUv*vec2(1040.0/1563.0,560.0/1563.0);vec4 brand=texture2D(logoMap,uv);if(brand.a<0.03)discard;vec3 tint=mix(vec3(0.82,0.88,1.0),brand.rgb,${theme === 'purple' ? '0.18' : '1.0'});gl_FragColor=vec4(tint,brand.a);}`,
    }));
    const logoFace=new THREE.Mesh(geometry(new THREE.PlaneGeometry(1.98,1.066)),logoMaterial);
    logoFace.position.z=.18;logoFace.visible=false;badge.add(logoFace);
    const logoTexture=new THREE.TextureLoader().load('/logos/HITS.png',(texture:InstanceType<typeof THREE.Texture>)=>{
      if(disposed){texture.dispose();return;}
      logoMaterial.uniforms.logoMap.value=texture;logoFace.visible=!contourLoaded;
    });
    textures.add(logoTexture);
    let contourLoaded=false;
    void hitsSilhouette().then(contours=>{
      if(disposed)return;
      const paths=new THREE.ShapePath();paths.userData={style:{fillRule:'evenodd'}};
      contours.forEach(points=>{paths.moveTo(points[0][0],points[0][1]);points.slice(1).forEach(([x,y])=>paths.lineTo(x,y));paths.currentPath.closePath();});
      const shapes=paths.toShapes();if(!shapes.length)return;
      const sculptedGeometry=geometry(new THREE.ExtrudeGeometry(shapes,{depth:.18,bevelEnabled:false,steps:1,curveSegments:2}));
      // Project the actual artwork onto the extruded silhouette, preserving the
      // red-to-blue circuit symbol instead of painting every letter one colour.
      if(theme !== 'purple') {
        const positions=sculptedGeometry.getAttribute('position');
        const uv=sculptedGeometry.getAttribute('uv');
        for(let i=0;i<positions.count;i++) uv.setXY(i,positions.getX(i)/2.15+.5,positions.getY(i)/(2.15*560/1040)+.5);
        uv.needsUpdate=true;
      }
      const face=theme === 'purple' ? material(new THREE.MeshStandardMaterial({color:0xd5d9ff,metalness:.58,roughness:.24,emissive:0x53417d,emissiveIntensity:.45})) : logoMaterial;
      const side=material(new THREE.MeshStandardMaterial({color:0x7752c4,metalness:.72,roughness:.26,emissive:0x432b77,emissiveIntensity:.5}));
      const sculpted=new THREE.Mesh(sculptedGeometry,[face,side]);badge.add(sculpted);
      if(theme === 'hits-dark') {
        const rim=material(new THREE.LineBasicMaterial({color:0xe2e8ff,transparent:true,opacity:.7}));
        // The neutral rim separates the original dark ink from the dark reactor.
        rim.color.set(0xe2e8ff);
        badge.add(new THREE.LineSegments(geometry(new THREE.EdgesGeometry(sculptedGeometry)),rim));
      }
      badgeBase.visible=false;badgeOutline.visible=false;logoFace.visible=false;contourLoaded=true;
    }).catch(()=>{/* The supplied artwork remains on the low-poly badge if tracing is unavailable. */});
    heart.visible=false;

    // A holographic docking platform anchors the reactor in physical depth.
    const platform = new THREE.Group();
    platform.position.y = -2.65;
    scene.add(platform);
    const platformMaterial = material(new THREE.LineBasicMaterial({color:0x9471ed,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));
    const platformPoints: number[] = [];
    for(let ring=0;ring<3;ring++) {
      const radius=2.35+ring*.4;
      for(let segment=0;segment<72;segment++) {
        if(segment%12>9)continue;
        const a=segment/72*Math.PI*2,b=(segment+1)/72*Math.PI*2;
        platformPoints.push(Math.cos(a)*radius,ring*.07,Math.sin(a)*radius,Math.cos(b)*radius,ring*.07,Math.sin(b)*radius);
      }
    }
    for(let index=0;index<12;index++) {
      const a=index/12*Math.PI*2;
      platformPoints.push(Math.cos(a)*2.2,0,Math.sin(a)*2.2,Math.cos(a)*3.25,0,Math.sin(a)*3.25);
    }
    const platformGeometry=geometry(new THREE.BufferGeometry());
    platformGeometry.setAttribute('position',new THREE.Float32BufferAttribute(platformPoints,3));
    platform.add(new THREE.LineSegments(platformGeometry,platformMaterial));
    const sweep=new THREE.Mesh(geometry(new THREE.TorusGeometry(2.85,.012,4,64,Math.PI*.5)),material(new THREE.MeshBasicMaterial({color:0x7fe9ff,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false})));
    sweep.rotation.x=Math.PI/2; sweep.position.y=.15; platform.add(sweep);

    // Twin particle-free helices cross behind the crystal as dimensional data rails.
    const helixGroup=new THREE.Group();
    helixGroup.rotation.z=.34;
    reactor.add(helixGroup);
    const helixMaterial=material(new THREE.LineBasicMaterial({color:0xb483f5,transparent:true,opacity:.28,blending:THREE.AdditiveBlending,depthWrite:false}));
    for(let strand=0;strand<2;strand++) {
      const points: InstanceType<typeof THREE.Vector3>[]=[];
      for(let index=0;index<=100;index++) {
        const a=index/100*Math.PI*3+strand*Math.PI;
        points.push(new THREE.Vector3(Math.cos(a)*1.65,(index/100-.5)*4.5,Math.sin(a)*1.65));
      }
      helixGroup.add(new THREE.Line(geometry(new THREE.BufferGeometry().setFromPoints(points)),helixMaterial));
    }

    // Transparent satellite panels form a slow-moving outer constellation.
    const constellation=new THREE.Group();
    scene.add(constellation);
    const panelGeometry=geometry(new THREE.BoxGeometry(.38,.58,.06));
    const panelEdges=geometry(new THREE.EdgesGeometry(panelGeometry));
    const panelMaterial=material(new THREE.MeshBasicMaterial({color:0x8c6bd6,transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending}));
    const panelWire=material(new THREE.LineBasicMaterial({color:0x9fbfff,transparent:true,opacity:.36,blending:THREE.AdditiveBlending}));
    const panels: {object:SceneObject;angle:number;y:number}[]=[];
    const constellationPoints:number[]=[];
    const panelCount=compact?4:7;
    for(let index=0;index<panelCount;index++) {
      const angle=index/panelCount*Math.PI*2+.3;
      const x=Math.cos(angle)*3.35,y=Math.sin(angle*2)*1.6,z=-1.4+Math.sin(angle)*.7;
      const object=new THREE.Group();
      object.add(new THREE.Mesh(panelGeometry,panelMaterial),new THREE.LineSegments(panelEdges,panelWire));
      object.position.set(x,y,z);object.rotation.set(.2,angle*.35,.18);
      constellation.add(object);panels.push({object,angle,y});
      const point=glow(index%2?0x9c89ff:0x6cecff,.2,.7,object);point.position.y=.29;
      if(index>0){const previous=panels[index-1].object.position;constellationPoints.push(previous.x,previous.y,previous.z,x,y,z);}
    }
    const constellationGeometry=geometry(new THREE.BufferGeometry());
    constellationGeometry.setAttribute('position',new THREE.Float32BufferAttribute(constellationPoints,3));
    constellation.add(new THREE.LineSegments(constellationGeometry,material(new THREE.LineBasicMaterial({color:0x9378c5,transparent:true,opacity:.12,depthWrite:false}))));

    const orbitColors = [0xbd83ff, 0x70eaff, 0xf570dd, 0x9f7aff];
    const orbits: { carrier: SceneObject; mesh: InstanceType<typeof THREE.Mesh>; base: number[]; speed: number }[] = [];
    for (let index = 0; index < 4; index++) {
      const radius = 1.7 + index * 0.27;
      const carrier = new THREE.Group();
      const base = [0.55 + index * 0.55, 0.35 + index * 0.67, index * 0.65];
      carrier.rotation.set(base[0], base[1], base[2]);
      reactor.add(carrier);
      const ring = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.008, 5, compact ? 84 : 128, Math.PI * (index === 3 ? 1.35 : 1.78))),
        material(new THREE.MeshBasicMaterial({ color: orbitColors[index], transparent: true, opacity: index === 1 ? 0.8 : 0.6, blending: THREE.AdditiveBlending, depthWrite: false })),
      );
      carrier.add(ring);
      const satellite = glow(orbitColors[index], 0.36, 1, carrier);
      satellite.position.set(radius, 0, 0);
      orbits.push({ carrier, mesh: ring, base, speed: (index % 2 ? -1 : 1) * (0.12 + index * 0.035) });
    }

    // Fine tick marks and discontinuous arcs form a dimensional instrument dial.
    const dial = new THREE.Group();
    dial.rotation.set(0.48, -0.14, 0);
    reactor.add(dial);
    const ticks: number[] = [];
    for (let index = 0; index < 96; index++) {
      const angle = index / 96 * Math.PI * 2;
      const length = index % 8 === 0 ? 0.14 : 0.045;
      ticks.push(Math.cos(angle) * 2.8, Math.sin(angle) * 2.8, 0, Math.cos(angle) * (2.8 + length), Math.sin(angle) * (2.8 + length), 0);
    }
    const tickGeometry = geometry(new THREE.BufferGeometry());
    tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    const tickMaterial = material(new THREE.LineBasicMaterial({ color: 0x9e84db, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending }));
    dial.add(new THREE.LineSegments(tickGeometry, tickMaterial));
    for (let index = 0; index < 3; index++) {
      const arc = new THREE.Mesh(
        geometry(new THREE.TorusGeometry(2.69, 0.014, 5, 40, Math.PI * 0.32)),
        material(new THREE.MeshBasicMaterial({ color: index === 1 ? 0x79e4ef : 0xb290f5, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false })),
      );
      arc.rotation.z = index * Math.PI * 2 / 3;
      dial.add(arc);
    }

    const shardGeometry = geometry(new THREE.OctahedronGeometry(1, 0));
    const shardEdgesGeometry = geometry(new THREE.EdgesGeometry(shardGeometry));
    const shardMaterial = material(new THREE.MeshStandardMaterial({ color: 0x7853e6, emissive: 0x4c30b0, emissiveIntensity: 0.8, metalness: 0.65, roughness: 0.22 }));
    const shardEdgesMaterial = material(new THREE.LineBasicMaterial({ color: 0xd3adff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending }));
    const shards: { group: SceneObject; angle: number; height: number; radius: number; size: number }[] = [];
    const shardCount = compact ? 6 : 10;
    for (let index = 0; index < shardCount; index++) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(shardGeometry, shardMaterial);
      const wire = new THREE.LineSegments(shardEdgesGeometry, shardEdgesMaterial);
      body.scale.set(0.13, 0.32, 0.13);
      wire.scale.copy(body.scale);
      group.add(body, wire);
      const point = glow(index % 3 === 0 ? 0x70f3ff : 0xc394ff, 0.38, 0.65, group);
      point.position.y = -0.16;
      reactor.add(group);
      shards.push({ group, angle: index / shardCount * Math.PI * 2, height: Math.sin(index * 2.4) * 0.85, radius: 2.05 + (index % 3) * 0.25, size: 0.75 + (index % 3) * 0.16 });
    }

    const beamMaterial = material(new THREE.MeshBasicMaterial({ color: 0x9dbbff, transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const beam = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.012, 0.012, 7.2, 6, 1, true)), beamMaterial);
    reactor.add(beam);
    const coneMaterial = material(new THREE.MeshBasicMaterial({ color: 0x9565ff, transparent: true, opacity: 0.024, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    const cone = new THREE.Mesh(geometry(new THREE.CylinderGeometry(0.36, 0.02, 3.5, 16, 1, true)), coneMaterial);
    cone.position.y = 1.75;
    reactor.add(cone);
    const lowerCone = cone.clone();
    lowerCone.rotation.z = Math.PI;
    lowerCone.position.y = -1.75;
    reactor.add(lowerCone);

    const starsCount = compact ? 430 : 950;
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);
    const tint = new THREE.Color();
    for (let index = 0; index < starsCount; index++) {
      const a = index * 2.399963;
      const r = 2.9 + ((index * 31) % 100) / 100 * 4.2;
      const y = 1 - index / Math.max(1, starsCount - 1) * 2;
      const spread = Math.sqrt(1 - y * y);
      starPositions.set([Math.cos(a) * spread * r * 1.4, y * r, Math.sin(a) * spread * r - 1.8], index * 3);
      tint.set(theme === 'purple' ? (index % 5 === 0 ? 0x69dbe9 : index % 3 === 0 ? 0xe4a5e9 : 0xa494e6) : (index % 5 === 0 ? 0xfe0008 : theme === 'hits-light' ? 0x2e1fa8 : 0xaaa7ff));
      starColors.set([tint.r, tint.g, tint.b], index * 3);
    }
    const starsGeometry = geometry(new THREE.BufferGeometry());
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMaterial = material(new THREE.PointsMaterial({ size: compact ? 0.035 : 0.027, map: glowTexture, vertexColors: true, transparent: true, opacity: 0.68, blending: THREE.AdditiveBlending, depthWrite: false }));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
    const beltCount = compact ? 190 : 440;
    const beltPositions = new Float32Array(beltCount * 3);
    for (let index = 0; index < beltCount; index++) {
      const a = index * 2.399963;
      const r = 1.7 + ((index * 17) % 100) / 100 * 1.2;
      beltPositions.set([Math.cos(a) * r, Math.sin(index * 17.3) * 0.12, Math.sin(a) * r], index * 3);
    }
    const beltGeometry = geometry(new THREE.BufferGeometry());
    beltGeometry.setAttribute('position', new THREE.BufferAttribute(beltPositions, 3));
    const beltMaterial = material(new THREE.PointsMaterial({ color: 0xc4a1ff, size: 0.035, map: glowTexture, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    const belt = new THREE.Points(beltGeometry, beltMaterial);
    belt.rotation.z = -0.3;
    reactor.add(belt);

    const shockwave = new THREE.Mesh(
      geometry(new THREE.TorusGeometry(1, 0.018, 6, 120)),
      material(new THREE.MeshBasicMaterial({ color: 0xc0faff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    shockwave.visible = false;
    scene.add(shockwave);
    scene.add(new THREE.AmbientLight(theme === 'purple' ? 0xa18fe8 : 0xffffff, theme === 'hits-light' ? 2.6 : 2.2));
    const cyanLight = new THREE.PointLight(theme === 'purple' ? 0x82eeff : 0xfe0008, 24, 14);
    cyanLight.position.set(2, 2.5, 3);
    const violetLight = new THREE.PointLight(theme === 'purple' ? 0xc851ff : 0x3048ff, 28, 14);
    violetLight.position.set(-2.5, -1, 2.5);
    scene.add(cyanLight, violetLight);

    let baseCameraZ = 10.4;
    const resize = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      baseCameraZ = 10.4 / framing / Math.min(1, Math.max(0.45, camera.aspect));
      camera.position.z = baseCameraZ;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reduced) return;
      const box = el.getBoundingClientRect();
      if (!box.width || !box.height) return;
      pointer.x = THREE.MathUtils.clamp((event.clientX - box.left) / box.width - 0.5, -0.6, 0.6);
      pointer.y = THREE.MathUtils.clamp((event.clientY - box.top) / box.height - 0.5, -0.6, 0.6);
    };
    const onPointerLeave = () => { pointer.x = 0; pointer.y = 0; };
    const onMotion = () => { reduced = motionQuery.matches; if (reduced) onPointerLeave(); };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerleave', onPointerLeave);
    motionQuery.addEventListener('change', onMotion);

    let frame = 0;
    let disposed = false;
    let contextLost = false;
    let lastTime = 0;
    let elapsed = 0;
    let power = 0;
    let smoothedProgress = 0;
    let spin = 0;
    let previousPhase = state.current.phase;
    let phaseElapsed = 0;
    const scaleTarget = new THREE.Vector3(1, 1, 1);
    const minimumFrame = 1000 / (compact ? 30 : 60) - 1;

    function animate(now: number) {
      if (disposed || contextLost || document.hidden) return;
      frame = requestAnimationFrame(animate);
      if (lastTime && now - lastTime < (reduced ? 100 : minimumFrame)) return;
      const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.12) : 1 / 60;
      lastTime = now;
      elapsed += delta;
      const current = state.current;
      if (previousPhase !== current.phase) { previousPhase = current.phase; phaseElapsed = 0; }
      phaseElapsed += delta;
      const phaseTarget = phasePower[current.phase] ?? (current.ignition ? 0.8 : 0);
      const target = THREE.MathUtils.clamp(current.intensity ?? Math.max(phaseTarget, current.ignition && current.phase === 'idle' ? 0.8 : 0), 0, 2);
      const ease = 1 - Math.exp(-delta * 2.4);
      power += (target - power) * ease;
      smoothedProgress += (THREE.MathUtils.clamp(current.progress, 0, 1) - smoothedProgress) * ease;
      const charge = smoothedProgress * 0.4 + power;
      if (!reduced) spin += delta * (0.32 + power * 0.82);
      const t = reduced ? 0 : elapsed;

      reactor.rotation.y = Math.sin(t * 0.13) * 0.2 + pointer.x * 0.16;
      reactor.rotation.x += ((pointer.y * 0.1) - reactor.rotation.x) * 0.035;
      const reactorScale = current.phase === 'burst' && !reduced ? 1 + Math.min(phaseElapsed, 3) * 0.1 : 1 + power * 0.025;
      scaleTarget.setScalar(reactorScale);
      reactor.scale.lerp(scaleTarget, ease);
      shell.rotation.set(spin * 0.31, spin * 0.6, Math.sin(t * 0.2) * 0.12);
      edges.rotation.copy(shell.rotation);
      badge.rotation.y=Math.sin(t*.48)*.19+pointer.x*.1;
      badge.rotation.x=Math.sin(t*.36)*.075;
      badge.position.y=Math.sin(t*.65)*.065;
      badgeMaterial.emissiveIntensity=.55+Math.min(charge,1.5)*.22;
      inner.rotation.set(-spin * 0.5, -spin * 0.85, spin * 0.2);
      cage.rotation.set(spin * 0.11, -spin * 0.23, 0.2);
      cage.scale.setScalar(1 + power * 0.09);
      platform.rotation.y=-spin*.12;
      platformMaterial.opacity=.2+Math.min(charge,1.5)*.1;
      sweep.rotation.z=spin*.8;
      helixGroup.rotation.y=-spin*.19;
      helixMaterial.opacity=.22+Math.min(charge,1.5)*.12;
      constellation.rotation.y=Math.sin(t*.09)*.13+pointer.x*.05;
      constellation.rotation.z=Math.sin(t*.07)*.035;
      panels.forEach((panel,index)=>{
        panel.object.rotation.y=panel.angle*.35+Math.sin(t*.22+index)*.4;
        panel.object.rotation.z=.18+Math.sin(t*.18+index)*.09;
      });
      panelWire.opacity=.28+Math.min(charge,1.5)*.1;
      heart.rotation.set(spin, spin * 0.7, 0);
      heart.scale.setScalar(1 + charge * 0.23 + Math.sin(t * (2 + power)) * 0.07);
      shellMaterial.emissiveIntensity = 0.75 + charge * 0.6;
      edgesMaterial.opacity = Math.min(1, 0.72 + charge * 0.16);
      nucleusGlow.scale.setScalar(1.35 + charge * 0.8);
      innerAura.scale.setScalar(3.15 + charge * 0.55);
      innerAura.material.opacity = (0.55 + Math.min(charge, 1.7) * 0.12) * (theme === 'hits-light' ? .32 : 1);
      aura.material.opacity = (0.36 + charge * 0.13) * (theme === 'hits-light' ? .25 : theme === 'hits-dark' ? .85 : 1);

      const alignment = Math.min(power, 1);
      orbits.forEach((orbit, index) => {
        orbit.carrier.rotation.x = orbit.base[0] * (1 - alignment * 0.45) + Math.sin(t * 0.12 + index) * 0.08;
        orbit.carrier.rotation.y = orbit.base[1] + spin * orbit.speed;
        orbit.carrier.rotation.z = orbit.base[2] + spin * orbit.speed * 2.5;
        orbit.mesh.material.opacity = 0.5 + Math.min(charge, 1.5) * 0.23;
      });
      dial.rotation.z = -spin * 0.13;
      dial.rotation.x = 0.48 + Math.sin(t * 0.15) * 0.13;
      tickMaterial.opacity = 0.34 + charge * 0.17;
      shards.forEach((shard, index) => {
        const angle = shard.angle + spin * (index % 2 ? 0.35 : -0.23);
        const radius = shard.radius + Math.sin(t * 0.5 + index) * 0.08 - Math.min(power, 1) * 0.22;
        shard.group.position.set(Math.cos(angle) * radius, shard.height + Math.sin(t * 0.8 + index) * 0.15, Math.sin(angle) * radius * 0.6);
        shard.group.rotation.set(t * 0.13 + index, -angle, Math.sin(t * 0.25 + index) * 0.4);
        shard.group.scale.setScalar(shard.size * (1 + power * 0.08));
      });
      belt.rotation.y = -spin * 0.4;
      belt.rotation.x = 0.25 + Math.sin(t * 0.13) * 0.16;
      stars.rotation.y = -t * 0.012;
      stars.rotation.z = Math.sin(t * 0.03) * 0.03;
      starsMaterial.opacity = 0.6 + Math.min(charge, 1.5) * 0.15;
      beamMaterial.opacity = 0.065 + charge * 0.07;
      coneMaterial.opacity = 0.014 + charge * 0.019;
      violetLight.intensity = 28 + charge * 11;
      cyanLight.intensity = 24 + charge * 10;

      // A single outward wave adds impact without repeated flashing.
      shockwave.visible = current.phase === 'burst' && !reduced && phaseElapsed < 3.4;
      if (shockwave.visible) {
        shockwave.scale.setScalar(1 + phaseElapsed * 4.1);
        shockwave.material.opacity = Math.max(0, 0.92 - phaseElapsed * 0.29);
      }
      const zoom = reduced ? 0 : Math.min(power, 1.2) * 0.65;
      camera.position.z += (baseCameraZ - zoom - camera.position.z) * ease;
      camera.position.x += (pointer.x * 0.35 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.25 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    const resume = () => {
      cancelAnimationFrame(frame);
      lastTime = 0;
      if (!document.hidden && !disposed && !contextLost) frame = requestAnimationFrame(animate);
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      setFallback(true);
    };
    const onContextRestored = () => { contextLost = false; setFallback(false); resume(); };
    document.addEventListener('visibilitychange', resume);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    frame = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', resume);
      motionQuery.removeEventListener('change', onMotion);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      geometries.forEach(value => value.dispose());
      materials.forEach(value => value.dispose());
      textures.forEach(value => value.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [framing, theme]);

  return (
    <div className={'core-visual ' + (ignition ? 'igniting' : '')} data-phase={phase} aria-hidden="true">
      <div className="core-halo" />
      <div className="core-canvas" ref={host} />
      {fallback && <div className="fallback-core"><span>◇</span></div>}
      <div className="core-floor" />
    </div>
  );
}
