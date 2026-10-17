import sys, pathlib, math, subprocess
sys.path.insert(0,'.local/video-tools')
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont
root=pathlib.Path.cwd(); out=root/'public/media';out.mkdir(exist_ok=True)
logo=Image.open('public/logos/HITS.png').convert('RGBA').crop((265,420,1305,980));logo.thumbnail((440,237))
font=lambda n:ImageFont.truetype('public/fonts/SpaceGrotesk.ttf',n)
ff=imageio_ffmpeg.get_ffmpeg_exe()
proc=subprocess.Popen([ff,'-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','-','-an','-c:v','libx264','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(out/'hits-placeholder.mp4')],stdin=subprocess.PIPE,stderr=open('.local/video-encode.log','w'))
for frame in range(288):
 t=frame/24
 im=Image.new('RGB',(1280,720),(7,11,28));d=ImageDraw.Draw(im)
 for x in range(0,1280,64):d.line((x,0,x,720),fill=(17,24,48))
 for y in range(0,720,64):d.line((0,y,1280,y),fill=(17,24,48))
 for i in range(4):
  r=155+i*36+math.sin(t*.65+i)*8
  d.ellipse((640-r,290-r*.64,640+r,290+r*.64),outline=(47+i*12,35+i*10,120+i*24),width=2)
  a=t*.5+i*1.57;x=640+math.cos(a)*r;y=290+math.sin(a)*r*.64
  d.ellipse((x-4,y-4,x+4,y+4),fill=(254,30,58))
 # The source logo keeps its original indigo/red colours on a soft light plate.
 d.rounded_rectangle((390,155,890,425),radius=16,fill=(232,234,249))
 im.paste(logo,(640-logo.width//2,290-logo.height//2),logo)
 title='THE FUTURE STARTS WITH US' if t<6 else 'IDEAS BECOME IMPACT'
 d.text((640,475),title,font=font(40),fill=(242,244,255),anchor='mm')
 d.text((640,533),'IUIC   /   HDSC   /   SUARA CENDEKIA   /   SUTERA   /   UI FESTIVAL',font=font(18),fill=(166,177,215),anchor='mm')
 d.text((640,640),'REHEARSAL VIDEO  ·  REPLACE WITH FINAL EVENT FILM',font=font(16),fill=(150,139,179),anchor='mm')
 d.line((440,594,440+400*min(t/11.9,1),594),fill=(254,30,58),width=3)
 fade=min(1,t/.65,(12-t)/.7)
 if fade<1:im=Image.blend(Image.new('RGB',im.size,(7,11,28)),im,max(0,fade))
 proc.stdin.write(im.tobytes())
proc.stdin.close();code=proc.wait();assert code==0,code
print('Created 12-second 1280x720 H.264 placeholder:',(out/'hits-placeholder.mp4').stat().st_size,'bytes')
subprocess.run([ff,'-y','-ss','4','-i',str(out/'hits-placeholder.mp4'),'-frames:v','1',str(root/'.local/placeholder-frame.png')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True)
