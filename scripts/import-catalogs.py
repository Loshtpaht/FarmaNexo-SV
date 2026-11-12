"""Import only the Medicamentos sheet; preserve original phase and provenance."""
import argparse,collections,json,pathlib,openpyxl,re,copy
parser=argparse.ArgumentParser();parser.add_argument('tariff');args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parent.parent
base=json.loads((root/'private/complement109.json').read_text())
def rawcode(v):return str(int(v)) if isinstance(v,(int,float)) else str(v or '').strip()
def norm(v):return rawcode(v).lstrip('0') or '0'
def txt(v):return re.sub(r'\s+',' ',str(v or '')).strip()
def num(v):return float(v) if isinstance(v,(int,float)) else None
w=openpyxl.load_workbook(args.tariff,read_only=True,data_only=True)
rows=[(i,r) for i,r in enumerate(w['Medicamentos'].values,1) if len(r)>15 and r[14] in ['FASE 1','FASE 2','FASE 3']]
base_by={norm(m['code']):copy.deepcopy(m) for m in base}
public=[];isbm=list(base_by.values());matches=[];variants=[];counts=collections.Counter()
conflicts={'10000153':'Gel en el complemento; crema en tarifas. Se mantienen por separado para confirmar la forma.','10000331':'Suspensión oral en el complemento; inyectable en tarifas. Se mantienen por separado para confirmar la vía.','25010405':'Frasco-ampolla de 10 ml en el complemento; pluma de 3 ml en tarifas. Se mantienen por separado para confirmar la presentación.'}
for m in isbm:
 m['collection']='isbm';m['sources']=['Complemento 109'];m['aliases']=[];m['source_records']=[{'source':'Complemento 109','number':m['number'],'code':m['code'],'description':m['name'],'presentation':m['presentation']}]
for row,r in rows:
 code=norm(r[1]);phase=r[14];counts[phase]+=1
 source={'source':'Tarifas · Medicamentos','row':row,'code_p2h':rawcode(r[0]),'code_tca':rawcode(r[1]),'barcode':rawcode(r[2]),'description':txt(r[3]),'state':txt(r[4]),'phase':phase,'agreement':txt(r[15]),'price_rollout_iva':num(r[12]),'price_pilot_iva':num(r[11])}
 entry={'id':f'{"phase1" if phase=="FASE 1" else "phase2" if phase=="FASE 2" else "isbm"}:{code}','code':rawcode(r[1]),'name':txt(r[3]),'composition':'No desglosada en tarifas','presentation':'Confirmar presentación comercial según descripción','type':'No desglosado en tarifas','unit':'UNIDAD (confirmar en consulta)','collection':'phase1' if phase=='FASE 1' else 'phase2' if phase=='FASE 2' else 'isbm','state':txt(r[4]),'treatment':txt(r[5]),'controlled':txt(r[6]),'injectable':txt(r[7]),'specialist':txt(r[8]),'group':txt(r[10] or r[9]),'agreement':txt(r[15]),'price_rollout_iva':num(r[12]),'price_pilot_iva':num(r[11]),'sources':['Tarifas · Medicamentos'],'aliases':[],'source_records':[source]}
 if phase!='FASE 3':public.append(entry);continue
 old=base_by.get(code)
 if old:
  if code in conflicts:
   old['review_note']=conflicts[code];entry['review_note']=conflicts[code];entry['id']='isbm:'+code+':tarifa';entry['type']={'10000153':'CREMA','10000331':'INYECTABLE (según tarifas; confirmar)','25010405':'SOLUCIÓN INYECTABLE EN PLUMA'}[code];entry['presentation']={'10000153':'Crema; envase no informado en tarifas','10000331':'Inyectable 1 mg/ml; envase no informado en tarifas','25010405':'PLUMA X 3 ML (300 UI)'}[code];entry['unit']={'10000153':'ENVASE (confirmar)','10000331':'ENVASE (confirmar)','25010405':'PLUMA'}[code];isbm.append(entry);variants.append({'code':code,'excel_id':old['id'],'tariff_id':entry['id'],'note':conflicts[code]});continue
  old['sources'].append('Tarifas · Medicamentos');old['source_records'].append(source)
  if txt(r[3])!=old['name']:old['aliases'].append(txt(r[3]))
  for k in ['state','treatment','controlled','injectable','specialist','group','agreement','price_rollout_iva','price_pilot_iva']:old[k]=entry[k]
  if code=='10000118':old['review_note']='Tarifas dice loción/crema y el complemento especifica loción. Confirmar forma comercial; no asumir que la crema es intercambiable.'
  matches.append({'code':code,'id':old['id'],'tariff_row':row,'excel_number':old['number'],'description_tariff':txt(r[3]),'description_excel':old['name'],'leading_zero_variant':rawcode(r[1])!=old['code']})
 else:isbm.append(entry)
ids={m['id'] for m in isbm};assert len(ids)==len(isbm)
audit={'sources':{'tariff':'TARIFAS MEDICAMENTOS-IMAGENES -LABORATORIOS ROLL OUT 12112025 v2.xlsx','sheet':'Medicamentos','complement':'109 Medicamentos ISBM.xlsx'},'tariff_rows':dict(counts),'complement_rows':len(base),'merged_same_code':len(matches),'leading_zero_matches':sum(m['leading_zero_variant'] for m in matches),'separate_variants':variants,'isbm_records':len(isbm),'isbm_unique_codes':len({norm(m['code']) for m in isbm}),'matches':matches,'tariff_coverage':[{'row':i,'code':rawcode(r[1]),'collection':'phase1' if r[14]=='FASE 1' else 'phase2' if r[14]=='FASE 2' else 'isbm'} for i,r in rows]}
for name,data in [('public/catalog.json',public),('private/isbm.json',isbm),('private/reconciliation.json',audit),('public/isbm-index.json',{'ids':sorted(ids),'record_count':len(isbm),'code_count':audit['isbm_unique_codes'],'complement_count':len(base)})]:(root/name).write_text(json.dumps(data,ensure_ascii=False,indent=2))
print({k:v for k,v in audit.items() if k not in ['matches','tariff_coverage','separate_variants']});print('Variants:',variants)
