"""Render illustrative previews from the game's sprites and shared attack timeline.

Requires Pillow and ffmpeg. These are animation explainers, not gameplay recordings.
Usage: python3 scripts/render-ultimate-previews.py /path/to/output
"""
import json
import math
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/civdle-ultimate-previews')
OUT.mkdir(parents=True, exist_ok=True)
TIMING = json.loads((ROOT / 'src/lib/combatAnimation.json').read_text())
W, H, FPS, SECONDS = 1280, 720, 30, 8
FONT_PATH = next(p for p in [Path('/System/Library/Fonts/Supplemental/Arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')] if p.exists())
FONTS = {n: ImageFont.truetype(str(FONT_PATH), n) for n in [13, 16, 18, 22, 26, 36]}
SHEETS = {}
for name in ['griffin', 'archer', 'mage', 'sprite', 'imp', 'zombie']:
    SHEETS[name] = Image.open(ROOT / f'src/lib/assets/units/{name}.png').convert('RGBA')

KINDS = {
    'melee': ('griffin', 'Crushing Blow', '3x damage to one enemy, front row first', [2], '#edb573'),
    'ranged': ('archer', 'Volley', '2x damage to each living back-row enemy', [1, 3, 5], '#fbbf24'),
    'magic': ('mage', 'Arcane Burst', '1.25x damage to every living enemy', [1, 2, 3, 4, 5], '#b7a1fa'),
}
# Staggered positions match the battlefield, enlarged for the explainers.
POSITIONS = {1:(1040,239),2:(867,310),3:(1040,381),4:(867,452),5:(1040,523)}
ENEMIES = {1:'sprite',2:'imp',3:'zombie',4:'imp',5:'sprite'}

def text(draw, xy, value, size=18, fill='#dddddd', anchor=None):
    draw.text(xy, value, font=FONTS[size], fill=fill, anchor=anchor)

def sprite(image, name, x, y, pose=0, frame=0, scale=1, opacity=1, flip=False):
    sheet = SHEETS[name]
    sw, sh = sheet.width // 4, sheet.height // 4
    cell = sheet.crop((frame*sw,pose*sh,(frame+1)*sw,(pose+1)*sh))
    size = (round(80*scale), round(100*scale))
    cell = cell.resize(size, Image.Resampling.LANCZOS)
    if flip: cell = cell.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if opacity < 1: cell.putalpha(cell.getchannel('A').point(lambda a:int(a*opacity)))
    image.alpha_composite(cell, (round(x-size[0]/2),round(y-size[1]/2)))

def motion(progress):
    frames = TIMING['frames']
    if not 0 <= progress <= 1: return 0,1,1
    for start,end in zip(frames,frames[1:]):
        if start['offset'] <= progress <= end['offset']:
            q=(progress-start['offset'])/(end['offset']-start['offset'])
            return tuple(start[k]+(end[k]-start[k])*q for k in ['travel','scale','opacity'])
    return 0,1,1

def render(kind, t):
    unit,title,rule,targets,color = KINDS[kind]
    # First play at game speed; then repeat at half speed.
    slow = t >= 3.7
    elapsed = (t-4.1)/2 if slow else t-1.0
    progress = elapsed / (TIMING['ultimateMs']/1000)
    active = 0 <= progress < 1
    impact = progress >= TIMING['impactAt']
    image = Image.new('RGBA', (W,H), '#090909')
    draw = ImageDraw.Draw(image)
    text(draw,(44,24),'CIVDLE / ULTIMATE ANIMATION PREVIEW',16,'#999999')
    text(draw,(44,55),f'{kind.title()} — {title}',36)
    text(draw,(44,103),rule,22,color)
    text(draw,(1236,30),'HALF-SPEED REPLAY' if slow else 'NORMAL SPEED',16,'#bbbbbb','ra')
    draw.rounded_rectangle((32,151,1248,623),radius=12,fill='#101010',outline='#272727',width=2)
    text(draw,(60,173),'YOUR ARMY',16,'#999999')
    text(draw,(1214,173),'ENEMY ARMY',16,'#999999','ra')
    text(draw,(637,360),'VS',36,'#333333','mm')
    if active:
        draw.rounded_rectangle((420,173,810,208),radius=6,fill='#241b10',outline='#6b4c2c')
        text(draw,(615,190),title.upper(),18,'#f5c17c','mm')
    for pos,(x,y) in POSITIONS.items():
        selected = pos in targets
        if selected and active and not impact:
            draw.ellipse((x-43,y+35,x+43,y+54),outline=color,width=2)
        hit = selected and impact
        frame = min(3,max(0,int((elapsed-TIMING['impactAt']*1.3)/.45*3))) if hit else int(t/.3)%4
        sprite(image,ENEMIES[pos],x,y,pose=2 if hit and active else 0,frame=frame if hit and active else int(t/.3)%4,flip=True)
        draw = ImageDraw.Draw(image)
        text(draw,(x,y+53),ENEMIES[pos].title(),16,anchor='mt')
        text(draw,(x,y+73),f'{"Front" if pos in [2,4] else "Back"} / {pos}',13,'#888888','mt')
        draw.rounded_rectangle((x-28,y+94,x+28,y+98),radius=2,fill='#292424')
        fraction = (0.4 if kind=='melee' else 0.6 if kind=='ranged' else 0.75) if hit else 1
        draw.rounded_rectangle((x-28,y+94,x-28+56*fraction,y+98),radius=2,fill='#c47d79')
        if hit and active:
            text(draw,(x,y-52),{'melee':'3x','ranged':'2x','magic':'1.25x'}[kind],22,color,'mm')
    travel,scale,opacity = motion(progress)
    distance = min(TIMING['maxBlinkPx'],(1248-32)*TIMING['blinkWidthFraction'])
    sx,sy=268+distance*travel,381
    sprite(image,unit,sx,sy,pose=1 if active else 0,frame=min(3,max(0,int(elapsed/.45*3))) if active else int(t/.3)%4,scale=scale,opacity=opacity)
    draw = ImageDraw.Draw(image)
    if opacity > .2:
        text(draw,(sx,sy+61*scale),unit.title(),18,anchor='mt')
        text(draw,(sx,sy+87*scale),'ULTIMATE' if active else 'Action 3 of 3',13,color,'mt')
    if active and kind!='melee' and TIMING['launchAt'] <= progress < TIMING['impactAt']:
        q=(progress-TIMING['launchAt'])/(TIMING['impactAt']-TIMING['launchAt'])
        for pos in targets:
            tx,ty=POSITIONS[pos]
            sourcex=268+distance
            px,py=sourcex+(tx-sourcex)*q,381+(ty-381)*q
            angle=math.atan2(ty-381,tx-sourcex)
            if kind=='ranged':
                dx,dy=math.cos(angle),math.sin(angle)
                draw.line((px-25*dx,py-25*dy,px+7*dx,py+7*dy),fill=color,width=3)
                draw.polygon([(px+13*dx,py+13*dy),(px+2*dx-5*dy,py+2*dy+5*dx),(px+2*dx+5*dy,py+2*dy-5*dx)],fill=color)
            else:
                glow=Image.new('RGBA',(W,H)); gd=ImageDraw.Draw(glow)
                gd.ellipse((px-13,py-13,px+13,py+13),fill=(167,139,250,170))
                image=Image.alpha_composite(image,glow.filter(ImageFilter.GaussianBlur(8)))
                draw=ImageDraw.Draw(image)
                draw.ellipse((px-9,py-9,px+9,py+9),fill='#eee7ff')
    text(draw,(44,650),'Automatic on each unit’s third personal action. Speed controls when that action arrives.',18)
    text(draw,(44,683),'Illustrative preview • game sprites + shared motion timing • HP changes show relative coverage, not a recorded battle',13,'#777777')
    return image.convert('RGB')

for kind in KINDS:
    path=OUT/f'{kind}-ultimate.mp4'
    proc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(path)],stdin=subprocess.PIPE)
    for frame in range(SECONDS*FPS): proc.stdin.write(render(kind,frame/FPS).tobytes())
    proc.stdin.close()
    if proc.wait(): raise RuntimeError('ffmpeg failed')
    render(kind,1.65).save(OUT/f'{kind}-preview.png')
    print(path,flush=True)
