import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
const context={Intl};vm.createContext(context);vm.runInContext(fs.readFileSync('public/erp-logic.js','utf8'),context);
test('ERP: abreviaturas explícitas, saldo firmado y unidad ausente sin inferencias',()=>{
 const logic=context.FarmaErpLogic;
 for(const [source,label] of Object.entries({TAB:'tabletas',INH:'inhaladores',FRA:'frascos',TUB:'tubos',AMP:'ampollas',VIA:'viales',SOB:'sobres',TAR:'tarros',TTO:'tratamientos',PZA:'piezas'}))assert.equal(logic.unit(source+' /  1'),label);
 assert.equal(logic.unit('/  1'),'unidad no especificada en el ERP');
 assert.match(logic.quantity(-4,'TAB / 1'),/-4 tabletas/);
 assert.match(logic.unit('UNKNOWN / 1'),/no reconocida/);
});
test('ERP: publicación completa, negativos, centros pendientes y acceso de solo lectura al corte',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon; create role authenticated; create table public.farmanexo_branches(id text primary key);');
  await db.exec(fs.readFileSync('supabase/erp-inventory.sql','utf8').replace(/alter publication supabase_realtime add table[^;]+;/g,''));
  const staging='11111111-1111-4111-8111-111111111111',published='22222222-2222-4222-8222-222222222222';
  for(const [id,status] of [[staging,'staging'],[published,'published']]){
   await db.query(`insert into public.farmanexo_erp_imports(id,source_hash,source_url,sheet_name,report_date,date_basis,status,row_count,center_count,article_count,positive_count,zero_count,negative_count,linked_center_count,quantity_sum) values($1::uuid,$1::text,'https://example.test/source','ERP_20261117','2026-11-17','Pestaña',$2,1,1,1,0,0,1,0,-3)`,[id,status]);
   await db.query(`insert into public.farmanexo_erp_centers values($1,'ERP:001','ERP','ERP','001','Centro sin vínculo','001-Centro sin vínculo',null,'unmatched','{}',1,0,0,1,'centro sin vinculo')`,[id]);
   await db.query(`insert into public.farmanexo_erp_articles values($1,'129','Artículo original','TAB / 1',array['canonical-med'],'articulo original 129 tab')`,[id]);
   await db.query(`insert into public.farmanexo_erp_stock values($1,2,'ERP:001','129',-3)`,[id]);
  }
  await db.exec('set role anon');
  assert.equal((await db.query('select count(*) from public.farmanexo_erp_stock')).rows[0].count,1);
  const catalog=(await db.query('select public.farmanexo_erp_catalog() as result')).rows[0].result;
  assert.equal(catalog.import.id,published);assert.equal(catalog.centers.length,1);assert.equal(catalog.articles[0].packaging,'TAB / 1');
  const result=(await db.query(`select public.farmanexo_erp_search('','ERP','','','negative','pending',0,25) as result`)).rows[0].result;
  assert.equal(result.total,1);assert.equal(result.rows[0].quantity,-3);assert.equal(result.rows[0].branch_id,null);
  assert.equal((await db.query(`select public.farmanexo_erp_search('no existe') as result`)).rows[0].result.total,0);
  assert.equal((await db.query(`select public.farmanexo_erp_search('articulo') as result`)).rows[0].result.total,1);
  assert.equal((await db.query(`select public.farmanexo_erp_medication('canonical-med') as result`)).rows[0].result.length,0,'Unmapped center must not acquire a fabricated branch');
  await assert.rejects(db.query(`update public.farmanexo_erp_stock set quantity=0`));
  await assert.rejects(db.query(`delete from public.farmanexo_erp_stock`));
  await assert.rejects(db.query(`insert into public.farmanexo_erp_stock values($1,3,'ERP:001','129',999)`,[published]));
  await db.exec('reset role');
  await db.query(`insert into public.farmanexo_branches values('BRANCH')`);
  await db.query(`update public.farmanexo_erp_centers set branch_id='BRANCH',match_method='exact' where import_id=$1`,[published]);
  await db.exec('set role anon');
  const balances=(await db.query(`select public.farmanexo_erp_medication('canonical-med') as result`)).rows[0].result;
  assert.equal(balances.length,1);assert.equal(balances[0].quantity,-3);assert.equal(balances[0].branch_id,'BRANCH');
 }finally{await db.close();}
});
