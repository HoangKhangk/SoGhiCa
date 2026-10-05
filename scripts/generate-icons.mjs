// Render the simple book app mark without third-party tools or remote services.
import {writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
const points=[[256,155],[236,143],[213,135],[189,133],[165,134],[142,137],[119,139],[119,355],[142,351],[165,350],[189,352],[213,357],[236,363],[256,371],[276,363],[299,357],[323,352],[347,350],[370,351],[393,355],[393,139],[370,137],[347,134],[323,133],[299,135],[276,143],[256,155]];
const lines=points.slice(1).map((p,i)=>[...points[i],...p]);
lines.push([256,155,256,371],[162,192,211,192],[162,241,211,241],[301,192,350,192],[301,241,350,241]);
function distance(x,y,line){const [ax,ay,bx,by]=line;const t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)));return Math.hypot(x-ax-t*(bx-ax),y-ay-t*(by-ay));}
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(buffer){let value=0xffffffff;for(const byte of buffer)value=table[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
function chunk(type,data){const content=Buffer.concat([Buffer.from(type),data]);const length=Buffer.alloc(4);length.writeUInt32BE(data.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc(content));return Buffer.concat([length,content,checksum]);}
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable.png',512],['apple-touch-icon.png',180]]){
  const raw=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    let coverage=0;
    for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){
      const px=(x+(sx+.5)/2)*512/size,py=(y+(sy+.5)/2)*512/size;
      if(lines.some(line=>distance(px,py,line)<11.5))coverage+=.25;
    }
    const offset=y*(size*4+1)+1+x*4;
    raw[offset]=Math.round(255*coverage);raw[offset+1]=Math.round(135+120*coverage);raw[offset+2]=Math.round(99+156*coverage);raw[offset+3]=255;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
  await writeFile(new URL(`../assets/${name}`,import.meta.url),png);
  console.log(`Generated ${name} (${size} × ${size})`);
}
