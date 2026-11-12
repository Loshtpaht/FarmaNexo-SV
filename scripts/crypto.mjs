import {randomBytes,pbkdf2Sync,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import fs from 'node:fs';
export const iterations=600000;
export function sourceHash(){const h=createHash('sha256');for(const f of fs.readdirSync('public').sort()){h.update(f);h.update(fs.readFileSync('public/'+f))}return h.digest('hex')}
export function seal(html,password){const salt=randomBytes(32),iv=randomBytes(12),key=pbkdf2Sync(password,salt,iterations,32,'sha256'),cipher=createCipheriv('aes-256-gcm',key,iv);const bytes=Buffer.concat([cipher.update(html,'utf8'),cipher.final(),cipher.getAuthTag()]);return {version:1,algorithm:'AES-GCM',kdf:'PBKDF2-SHA256',iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),ciphertext:bytes.toString('base64')}}
export function unseal(pack,password){const key=pbkdf2Sync(password,Buffer.from(pack.salt,'base64'),pack.iterations,32,'sha256'),bytes=Buffer.from(pack.ciphertext,'base64'),d=createDecipheriv('aes-256-gcm',key,Buffer.from(pack.iv,'base64'));d.setAuthTag(bytes.subarray(-16));return Buffer.concat([d.update(bytes.subarray(0,-16)),d.final()]).toString('utf8')}
