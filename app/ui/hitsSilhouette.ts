type Point=[number,number];
let cached:Promise<Point[][]>|undefined;
/** Trace the alpha boundary of the supplied artwork, retaining counters and gaps. */
export function hitsSilhouette(){
  return cached??=new Promise<Point[][]>((resolve,reject)=>{
    const image=new Image();image.onerror=()=>reject(new Error('HITS artwork unavailable'));
    image.onload=()=>{try{
      const width=240,height=130,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true})!;ctx.drawImage(image,265,420,1040,560,0,0,width,height);
      const rgba=ctx.getImageData(0,0,width,height).data;
      const inside=(x:number,y:number)=>x>=0&&y>=0&&x<width&&y<height&&rgba[(y*width+x)*4+3]>125;
      type Edge={a:Point;b:Point;direction:number;used:boolean};const edges:Edge[]=[],from=new Map<string,Edge[]>();
      const key=(p:Point)=>`${p[0]},${p[1]}`;
      const edge=(a:Point,b:Point,direction:number)=>{const e={a,b,direction,used:false};edges.push(e);const list=from.get(key(a))||[];list.push(e);from.set(key(a),list);};
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(inside(x,y)){
        if(!inside(x,y-1))edge([x,y],[x+1,y],0);
        if(!inside(x+1,y))edge([x+1,y],[x+1,y+1],1);
        if(!inside(x,y+1))edge([x+1,y+1],[x,y+1],2);
        if(!inside(x-1,y))edge([x,y+1],[x,y],3);
      }
      const loops:Point[][]=[];
      for(const start of edges){if(start.used)continue;const points:Point[]=[];let current:Edge|undefined=start;
        while(current&&!current.used){current.used=true;points.push(current.a);if(key(current.b)===key(start.a))break;const options:Edge[]=(from.get(key(current.b))||[]).filter(e=>!e.used);const direction:number=current.direction;let next:Edge|undefined;for(const turn of [1,0,3,2]){next=options.find(e=>e.direction===(direction+turn)%4);if(next)break;}current=next;}
        const simple=points.filter((point,i)=>{const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];return (point[0]-before[0])*(after[1]-point[1])!==(point[1]-before[1])*(after[0]-point[0]);});
        if(simple.length>=3)loops.push(simple.map(([x,y])=>[(x/width-.5)*2.15,(.5-y/height)*2.15*560/1040]));
      }resolve(loops);
    }catch(error){reject(error);}};image.src='/logos/HITS.png';
  });
}
