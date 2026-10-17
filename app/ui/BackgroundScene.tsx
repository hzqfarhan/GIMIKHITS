'use client';
import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import { useTheme } from './ThemeProvider';
import { brandMaterial } from './brandMaterials';

/** Lightweight edge constellation; the central reading and scanning area stays clear. */
export default function BackgroundScene(){
  const {theme} = useTheme();
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const compact=matchMedia('(max-width:700px)').matches,motion=matchMedia('(prefers-reduced-motion:reduce)');
    let reduced=motion.matches,disposed=false,frame=0,last=0,time=0;
    let renderer:InstanceType<typeof THREE.WebGLRenderer>;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setClearColor(0,0);el.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,1,.1,60);camera.position.z=12;
    const geometries:{dispose:()=>void}[]=[],materials:{dispose:()=>void}[]=[];
    const geom=<T extends {dispose:()=>void},>(x:T)=>{geometries.push(x);return x;};
    const mat=<T extends {dispose:()=>void},>(x:T)=>{materials.push(x);return brandMaterial(x,theme);};
    const crystal=geom(new THREE.IcosahedronGeometry(.55,0)),edges=geom(new THREE.EdgesGeometry(crystal));
    const glass=mat(new THREE.MeshStandardMaterial({color:0x7553ba,metalness:.6,roughness:.25,transparent:true,opacity:.19,depthWrite:false,flatShading:true}));
    const wire=mat(new THREE.LineBasicMaterial({color:0xb2a0ff,transparent:true,opacity:.48,blending:THREE.AdditiveBlending}));
    const objects:{group:InstanceType<typeof THREE.Group>;side:number;y:number;depth:number}[]=[];
    for(let i=0;i<(compact?6:10);i++){
      const group=new THREE.Group();group.add(new THREE.Mesh(crystal,glass),new THREE.LineSegments(edges,wire));
      const size=.45+(i%3)*.3;group.scale.set(size,size*(i%2?1.55:1),size);
      const side=i%2?-1:1,y=((i%5)/4-.5)*9,depth=-.5-(i%3)*1.2;
      objects.push({group,side,y,depth});scene.add(group);
      if(i%3===0){const ring=new THREE.Mesh(geom(new THREE.TorusGeometry(.85,.008,4,48)),mat(new THREE.MeshBasicMaterial({color:0x72cfe8,transparent:true,opacity:.25})));ring.rotation.x=.8;group.add(ring);}
    }
    const points:number[]=[];for(let i=0;i<(compact?70:160);i++){const side=i%2?1:-1;points.push(side*(3.8+(i*17%100)/100*3),((i*31%100)/100-.5)*12,-(i%7));}
    const dustGeometry=geom(new THREE.BufferGeometry());dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const dust=new THREE.Points(dustGeometry,mat(new THREE.PointsMaterial({color:0xbfa4ff,size:.022,transparent:true,opacity:.45,depthWrite:false})));scene.add(dust);
    scene.add(new THREE.AmbientLight(0xa08dd7,2));const light=new THREE.PointLight(theme==='purple'?0xa685ff:0x786bff,45,30);light.position.set(2,3,6);scene.add(light);
    let edge=5;const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();edge=Math.tan(Math.PI/8)*12*camera.aspect*.94;};
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const motionChange=()=>{reduced=motion.matches;};motion.addEventListener('change',motionChange);
    function animate(now:number){if(disposed||document.hidden)return;frame=requestAnimationFrame(animate);if(last&&now-last<(reduced?250:50))return;const delta=last?Math.min(.12,(now-last)/1000):0;last=now;if(!reduced)time+=delta;
      objects.forEach((item,i)=>{item.group.position.set(item.side*(edge+Math.sin(time*.16+i)*.15),item.y+Math.sin(time*.3+i)*.25,item.depth);item.group.rotation.set(time*.12+i,time*.19+i*.3,time*.08);});
      dust.scale.x=Math.max(.35,edge/5);dust.rotation.z=Math.sin(time*.05)*.025;renderer.render(scene,camera);
    }
    const visibility=()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(animate);};document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(animate);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();motion.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);geometries.forEach(x=>x.dispose());materials.forEach(x=>x.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[theme]);
  return <div className="background-constellation" ref={host} aria-hidden="true"/>;
}
