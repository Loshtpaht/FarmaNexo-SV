import fs from 'node:fs';import {sourceHash} from './scripts/crypto.mjs';
const artifact=JSON.parse(fs.readFileSync('sealed/isbm.json','utf8'));
if(artifact.sourceHash!==sourceHash())throw Error('Los datos ISBM cambiaron. Vuelve a cifrar con node scripts/seal.mjs antes de publicar.');
fs.rmSync('dist',{recursive:true,force:true});fs.cpSync('public','dist',{recursive:true});fs.copyFileSync('sealed/isbm.json','dist/isbm.enc.json');fs.writeFileSync('dist/.nojekyll','');
