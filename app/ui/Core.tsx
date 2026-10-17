'use client';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Core({progress=0, ignition=false}:{progress:number; ignition?:boolean}) {
  const host=useRef<HTMLDivElement>(null);
  const energy=useRef(progress);
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{energy.current=progress},[progress]);
  useEffect(()=>{
    const el=host.current;
    if(!el)return;
    let renderer:any;
    try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});} catch {setFallback(true);return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.8));
    el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(38,1,.1,100);
    camera.position.set(0,.2,9.6);
    const group=new THREE.Group();scene.add(group);
    const materials:any[]=[];const geometries:any[]=[];
    function mesh(geo:any,mat:any) {geometries.push(geo);materials.push(mat);return new THREE.Mesh(geo,mat);}
    const crystal=mesh(new THREE.IcosahedronGeometry(1.22,0),new THREE.MeshPhysicalMaterial({color:0x7b3eff,metalness:.7,roughness:.15,transparent:true,opacity:.38,side:THREE.DoubleSide,flatShading:true,emissive:0x38158c,emissiveIntensity:.6}));
    group.add(crystal);
    const wireGeo=new THREE.EdgesGeometry(crystal.geometry);geometries.push(wireGeo);
    const wireMat=new THREE.LineBasicMaterial({color:0xa399ff,transparent:true,opacity:.8});materials.push(wireMat);
    const wire=new THREE.LineSegments(wireGeo,wireMat);group.add(wire);
    const inner=mesh(new THREE.IcosahedronGeometry(.62,1),new THREE.MeshBasicMaterial({color:0xbcb3ff,wireframe:true,transparent:true,opacity:.5}));group.add(inner);
    const kernel=mesh(new THREE.SphereGeometry(.22,24,24),new THREE.MeshBasicMaterial({color:0xffffff}));group.add(kernel);
    const orbits:any[]=[];
    for(let i=0;i<3;i++) {
      const ring=mesh(new THREE.TorusGeometry(1.95+i*.25,.009,8,180),new THREE.MeshBasicMaterial({color:i===1?0xe65aff:0x9275ff,transparent:true,opacity:.48}));
      ring.rotation.set(Math.PI*.32+i*.65,.3+i*.7,i*.5);group.add(ring);orbits.push(ring);
    }
    const arcs=mesh(new THREE.TorusGeometry(2.72,.012,6,200,Math.PI*1.35),new THREE.MeshBasicMaterial({color:0x7262c9,transparent:true,opacity:.35}));arcs.rotation.x=.2;group.add(arcs);
    const p=new Float32Array(700*3);
    for(let i=0;i<700;i++){const a=i*2.399963;const y=1-(i/699)*2;const radius=2.7+Math.sin(i*7.3)*.8;const r=Math.sqrt(1-y*y);p[i*3]=Math.cos(a)*r*radius;p[i*3+1]=y*radius;p[i*3+2]=Math.sin(a)*r*radius;}
    const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(p,3));geometries.push(pg);
    const pm=new THREE.PointsMaterial({color:0xb1a2ff,size:.022,transparent:true,opacity:.6});materials.push(pm);
    const particles=new THREE.Points(pg,pm);scene.add(particles);
    scene.add(new THREE.AmbientLight(0xa39cff,3));
    const light=new THREE.PointLight(0x8f5bff,35,20);light.position.set(2,3,4);scene.add(light);
    const pink=new THREE.PointLight(0xff39d5,20,20);pink.position.set(-3,-1,2);scene.add(pink);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame=0;let active=true;const start=performance.now();
    function animate(now:number) {
      if(!active)return;
      const t=(now-start)/1000;const speed=ignition?2:1;
      if(!reduced){group.rotation.y=t*.13*speed;group.rotation.z=Math.sin(t*.2)*.08;crystal.rotation.x=t*.12;wire.rotation.copy(crystal.rotation);inner.rotation.y=-t*.25;particles.rotation.y=-t*.025;orbits.forEach((ring,i)=>ring.rotation.z=t*(.08+i*.03)*speed);}
      const pulse=1+Math.sin(t*2)*.1+energy.current*.25;kernel.scale.setScalar(pulse);
      crystal.material.emissiveIntensity=.5+energy.current;
      renderer.render(scene,camera);frame=requestAnimationFrame(animate);
    }
    frame=requestAnimationFrame(animate);
    return ()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.domElement.remove()};
  },[ignition]);
  return <div className={`core-visual ${ignition?'igniting':''}`} aria-hidden="true"><div className="core-halo"/><div className="core-canvas" ref={host}/>{fallback&&<div className="fallback-core"><span>◇</span></div>}<div className="core-floor"/></div>;
}
