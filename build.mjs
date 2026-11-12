import fs from 'node:fs';import {sourceHash} from './scripts/crypto.mjs';
const artifact=JSON.parse(fs.readFileSync('sealed/dashboard.json','utf8'));
if(artifact.sourceHash!==sourceHash())throw Error('El código cambió. Vuelve a cifrar con node scripts/seal.mjs antes de publicar.');
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('scripts/gate.html','dist/index.html');fs.copyFileSync('sealed/dashboard.json','dist/dashboard.json');fs.writeFileSync('dist/.nojekyll','');
