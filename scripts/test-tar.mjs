// Independent deterministic ustar fixture writer, used only by development tests.
import { gzipSync } from 'node:zlib';
export function makeTar(entries) {
  const parts=[];
  for(const [name,contents,type='0'] of entries) {
    const data=Buffer.from(contents); const h=Buffer.alloc(512);
    h.write(name,0,100,'utf8'); h.write('0000644\0',100,8,'ascii');
    h.write('0000000\0',108,8,'ascii');h.write('0000000\0',116,8,'ascii');
    h.write(data.length.toString(8).padStart(11,'0')+'\0',124,12,'ascii');
    h.write('00000000000\0',136,12,'ascii'); h.fill(32,148,156);h.write(type,156,1,'ascii');h.write('ustar\0',257,6,'ascii');h.write('00',263,2,'ascii');
    h.write(h.reduce((a,b)=>a+b,0).toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');
    parts.push(h,data,Buffer.alloc((512-data.length%512)%512));
  }
  parts.push(Buffer.alloc(1024));return gzipSync(Buffer.concat(parts));
}
