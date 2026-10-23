'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { useTheme } from './ThemeProvider';
import { brandMaterial } from './brandMaterials';

export default function PhonePreview({progress,total,quota}:{progress:number;total:number;quota:number}){
  const {theme} = useTheme();
  const host=useRef<HTMLDivElement>(null),live=useRef({progress,total,quota});
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{live.current={progress,total,quota};},[progress,total,quota]);
  useEffect(()=>{
    const inks: Record<string,[string,string]> = {"#0b0815":["#f4f5fb","#070b1c"],"#34204f":["#e0e0fa","#17224a"],"#14363c":["#e0e0fa","#17224a"],"#dfd7ee":["#141735","#f2f4ff"],"#f4efff":["#141735","#f2f4ff"],"#ddccff":["#141735","#f2f4ff"],"#e5d4ff":["#141735","#f2f4ff"],"#cbc3d8":["#141735","#f2f4ff"],"#ad91cb":["#5b607b","#a4afd0"],"#a99aba":["#5b607b","#a4afd0"],"#b69bcf":["#5b607b","#a4afd0"],"#756087":["#5b607b","#a4afd0"],"#c5a3ff":["#2e1fa8","#aaa7ff"],"#b796ff":["#2e1fa8","#aaa7ff"],"#a482ff":["#2e1fa8","#aaa7ff"],"#b49aff":["#2e1fa8","#aaa7ff"],"#78dcca":["#c50922","#ff6b79"],"#a2f1e8":["#c50922","#ff6b79"],"#bd97fa":["#2e1fa8","#2e1fa8"],"#241139":["#ffffff","#ffffff"],"#30213f":["#d9dcef","#202b50"]};
    const ink=(value:string)=>theme==='purple'?value:(inks[value]?.[theme==='hits-light'?0:1]??value);
    const element=host.current;if(!element)return;
    let renderer:InstanceType<typeof THREE.WebGLRenderer>;
    try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{const id=requestAnimationFrame(()=>setFallback(true));return()=>cancelAnimationFrame(id);}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setClearColor(0,0);element.appendChild(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,40);camera.position.z=7.1;
    const phone=new THREE.Group();scene.add(phone);
    const geometryResources:{dispose:()=>void}[]=[],materialResources:{dispose:()=>void}[]=[],textureResources:{dispose:()=>void}[]=[];
    const geom=<T extends {dispose:()=>void},>(value:T)=>{geometryResources.push(value);return value;};
    const mat=<T extends {dispose:()=>void},>(value:T)=>{materialResources.push(value);return brandMaterial(value,theme);};
    function rounded(w:number,h:number,r:number){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
    const bodyGeometry=geom(new THREE.ExtrudeGeometry(rounded(1.7,3.42,.22),{depth:.17,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.035,curveSegments:10}));
    phone.add(new THREE.Mesh(bodyGeometry,mat(new THREE.MeshStandardMaterial({color:0x292333,metalness:.94,roughness:.2}))));
    const bezel=new THREE.Mesh(geom(new THREE.ShapeGeometry(rounded(1.63,3.35,.2),16)),mat(new THREE.MeshBasicMaterial({color:0x050508})));bezel.position.z=.21;phone.add(bezel);
    const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1440;const ctx=canvas.getContext('2d')!;
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textureResources.push(texture);
    const screen=new THREE.Mesh(geom(new THREE.PlaneGeometry(1.53,3.12)),mat(new THREE.MeshBasicMaterial({map:texture,transparent:true,toneMapped:false})));screen.position.z=.22;phone.add(screen);
    const buttonMaterial=mat(new THREE.MeshStandardMaterial({color:0x9d8bac,metalness:.85,roughness:.25}));
    for(const [x,y,h]of [[-.875,.7,.33],[-.875,.17,.5],[.875,.45,.5]]){const b=new THREE.Mesh(geom(new THREE.BoxGeometry(.035,h,.1)),buttonMaterial);b.position.set(x,y,.08);phone.add(b);}
    const islands=new THREE.Mesh(geom(new THREE.ShapeGeometry(rounded(.48,.115,.055))),mat(new THREE.MeshBasicMaterial({color:0x020204})));islands.position.set(0,1.43,.235);phone.add(islands);
    scene.add(new THREE.AmbientLight(0xb29fdf,2.4));const light=new THREE.DirectionalLight(0xc3caff,5);light.position.set(3,3,5);scene.add(light);const rim=new THREE.PointLight(0x9858ff,36,12);rim.position.set(-3,-1,2);scene.add(rim);
    const ring=new THREE.Mesh(geom(new THREE.TorusGeometry(1.95,.008,4,100)),mat(new THREE.MeshBasicMaterial({color:0xa084d9,transparent:true,opacity:.35})));ring.rotation.set(1.12,.3,-.2);ring.position.y=-1.1;scene.add(ring);
    const satellites:InstanceType<typeof THREE.Mesh>[]=[];
    const crystalGeometry=geom(new THREE.OctahedronGeometry(.1,0)),crystalMaterial=mat(new THREE.MeshStandardMaterial({color:0xb993fa,metalness:.6,roughness:.22,emissive:0x553477,emissiveIntensity:.6}));
    for(let i=0;i<8;i++){const object=new THREE.Mesh(crystalGeometry,crystalMaterial);object.position.set(Math.cos(i*2.4)*1.9,Math.sin(i*2.4)*2.1,-.5);scene.add(object);satellites.push(object);}
    let disposed=false,frame=0,last=0,time=0,lastDraw='',logoReady=false;const logo=new Image();logo.onload=()=>{if(!disposed){logoReady=true;lastDraw='';}};logo.src='/logos/optimized/HITS.webp';
    void document.fonts.ready.then(()=>{if(!disposed)lastDraw='';});
    const media=matchMedia('(prefers-reduced-motion: reduce)');let reduced=media.matches;const change=()=>{reduced=media.matches;};media.addEventListener('change',change);
    function draw(connected:boolean){
      const {total,quota,progress}=live.current;ctx.clearRect(0,0,720,1440);ctx.save();ctx.beginPath();ctx.roundRect(0,0,720,1440,60);ctx.clip();ctx.fillStyle=ink('#0b0815');ctx.fillRect(0,0,720,1440);
      const bg=ctx.createRadialGradient(360,690,20,360,690,620);bg.addColorStop(0,ink('#34204f'));bg.addColorStop(1,ink('#0b0815'));ctx.fillStyle=bg;ctx.fillRect(0,100,720,1200);
      ctx.textAlign='left';ctx.fillStyle=ink('#dfd7ee');ctx.font='19px Space Grotesk, sans-serif';ctx.fillText('9:41',42,58);ctx.textAlign='right';ctx.fillText('•••  ▰',674,58);
      if(logoReady){ctx.save();ctx.filter=theme==='purple'?'brightness(0) invert(1)':'none';ctx.drawImage(logo,265,420,1040,560,46,114,170,92);ctx.restore();}
      ctx.textAlign='right';ctx.fillStyle=ink('#78dcca');ctx.font='14px Space Grotesk, sans-serif';ctx.fillText('● LIVE',665,159);
      ctx.textAlign='center';ctx.fillStyle=ink('#ad91cb');ctx.font='14px Space Grotesk, sans-serif';ctx.fillText('YOU ARE PART OF WHAT COMES NEXT',360,290);
      ctx.fillStyle=ink('#f4efff');ctx.font='64px Space Grotesk, sans-serif';ctx.fillText('Your spark.',360,385);ctx.fillStyle=ink('#c5a3ff');ctx.fillText('Our future.',360,460);
      ctx.font='21px Space Grotesk, sans-serif';ctx.fillStyle=ink('#a99aba');ctx.fillText(connected?'Your energy is in. Together, we make it happen.':'A single touch. A collective moment.',360,530);
      ctx.save();ctx.translate(360,770);ctx.strokeStyle=ink('#b796ff');ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,170,60,i*Math.PI/3,0,Math.PI*2);ctx.stroke();}ctx.beginPath();for(let i=0;i<7;i++){const a=i/6*Math.PI*2;const x=Math.cos(a)*78,y=Math.sin(a)*88;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();ctx.shadowColor=ink('#a482ff');ctx.shadowBlur=30;ctx.fillStyle=ink('#ddccff');ctx.font='bold 38px Space Grotesk, sans-serif';ctx.fillText('HITS',0,14);ctx.restore();
      ctx.fillStyle=connected?ink('#14363c'):ink('#bd97fa');ctx.beginPath();ctx.roundRect(46,1000,628,145,25);ctx.fill();ctx.textAlign='center';ctx.fillStyle=connected?ink('#a2f1e8'):ink('#241139');ctx.font='bold 32px Space Grotesk, sans-serif';ctx.fillText(connected?'✓  YOU’RE CONNECTED':'◎  ACTIVATE  →',360,1065);ctx.font='18px Space Grotesk, sans-serif';ctx.fillText(connected?'Thank you for being part of the moment':'Touch to send your energy',360,1104);
      ctx.textAlign='left';ctx.fillStyle=ink('#b69bcf');ctx.font='15px Space Grotesk, sans-serif';ctx.fillText('COLLECTIVE ENERGY',46,1230);ctx.textAlign='right';ctx.fillStyle=ink('#e5d4ff');ctx.font='25px Space Grotesk, sans-serif';ctx.fillText(`${total} / ${quota}`,674,1230);ctx.fillStyle=ink('#30213f');ctx.fillRect(46,1260,628,6);ctx.fillStyle=ink('#b49aff');ctx.fillRect(46,1260,628*progress,6);ctx.textAlign='center';ctx.fillStyle=ink('#756087');ctx.font='13px Space Grotesk, sans-serif';ctx.fillText('HITS × IUIC · UTHM',360,1340);ctx.fillStyle=ink('#cbc3d8');ctx.beginPath();ctx.roundRect(260,1394,200,6,3);ctx.fill();ctx.restore();texture.needsUpdate=true;
    }
    const resize=()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=7.1/Math.min(1,camera.aspect*1.35);camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(element);resize();
    function animate(now:number){if(disposed||document.hidden)return;frame=requestAnimationFrame(animate);if(last&&now-last<32)return;const delta=last?Math.min(.1,(now-last)/1000):0;last=now;if(!reduced)time+=delta;const connected=!reduced&&time%10>6;const drawKey=`${connected}-${live.current.total}-${live.current.quota}-${logoReady}`;if(drawKey!==lastDraw){draw(connected);lastDraw=drawKey;}
      phone.rotation.set(.06+Math.sin(time*.4)*.04,-.29+Math.sin(time*.3)*.13,-.085+Math.sin(time*.28)*.025);phone.position.y=Math.sin(time*.6)*.07;ring.rotation.z=time*.08;satellites.forEach((s,i)=>{s.rotation.set(time*.2+i,time*.4,0);});renderer.render(scene,camera);
    }const visibility=()=>{cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(animate);};document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(animate);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();media.removeEventListener('change',change);document.removeEventListener('visibilitychange',visibility);logo.onload=null;geometryResources.forEach(x=>x.dispose());materialResources.forEach(x=>x.dispose());textureResources.forEach(x=>x.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
  },[theme]);
  return <div className="phone-preview"><div ref={host} className="phone-canvas" aria-hidden="true"/>{fallback&&<div className="phone-fallback"><strong>HITS</strong><h3>Your spark.<br/>Our future.</h3><span>ACTIVATE →</span></div>}<div className="phone-preview-caption"><span>ACTIVATION PREVIEW</span><p>One touch. You’re part of the moment.</p></div></div>;
}
