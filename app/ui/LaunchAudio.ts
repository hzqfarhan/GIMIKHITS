/** Original synthesised event cues; no external files or autoplay dependency. */
export class LaunchAudio {
  private context:AudioContext|null=null;
  private master:GainNode|null=null;
  private voices=new Set<AudioScheduledSourceNode>();
  async enable(){
    this.context??=new AudioContext();
    if(!this.master){this.master=this.context.createGain();this.master.gain.value=.7;this.master.connect(this.context.destination);}
    await this.context.resume();this.master.gain.setTargetAtTime(.7,this.context.currentTime,.05);
  }
  mute(){this.stop();if(this.context&&this.master)this.master.gain.setTargetAtTime(0,this.context.currentTime,.04);}
  stop(){for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
  close(){this.stop();void this.context?.close();}
  private note(frequency:number,duration:number,delay=0,level=.08,end=frequency,type:OscillatorType='sine'){
    const c=this.context;if(!c||!this.master||c.state!=='running')return;
    const start=c.currentTime+delay,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.018);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(this.master);this.voices.add(osc);osc.onended=()=>{this.voices.delete(osc);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.03);
  }
  private sweep(duration:number,up=true){
    const c=this.context;if(!c||!this.master)return;
    const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.18;
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.7;
    filter.frequency.setValueAtTime(up?180:3200,c.currentTime);filter.frequency.exponentialRampToValueAtTime(up?4200:100,c.currentTime+duration);
    gain.gain.setValueAtTime(.0001,c.currentTime);gain.gain.exponentialRampToValueAtTime(.16,c.currentTime+duration*.6);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};source.start();
  }
  cue(name:string){
    if(name==='tap'){this.note(880,.08,0,.035,660);return;}
    if(name==='activation'){this.note(660,.2,0,.035);this.note(990,.25,.08,.025);return;}
    if(name.startsWith('countdown')){this.note(440,.3,0,.11);this.note(880,.18,0,.035);return;}
    if(name==='verify'||name==='ready'){[440,554,660,880].forEach((n,i)=>this.note(n,.55,i*.09,.065));return;}
    if(name==='assemble'){[220,330,440,554,660].forEach((n,i)=>this.note(n,.6,i*.16,.05));this.sweep(1.2);return;}
    if(name==='charge'){this.note(90,3.9,0,.07,360,'triangle');this.note(180,3.9,0,.025,720);this.sweep(4);return;}
    if(name==='burst'){this.note(140,1.8,0,.16,35);[220,330,440,554,660,880].forEach((n,i)=>this.note(n,2.8,i*.055,.045));this.sweep(1.7,false);return;}
    this.note(440,.3,0,.05,660);
  }
}
