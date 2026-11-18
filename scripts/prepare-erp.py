#!/usr/bin/env python3
"""Prepare an audited ERP snapshot. Usage: python scripts/prepare-erp.py input.xlsx output-directory.
Requires openpyxl. Never infers missing balances or assigns ambiguous centers.
"""
import collections, hashlib, json, pathlib, re, sys, unicodedata
import openpyxl
ROOT = pathlib.Path(__file__).resolve().parents[1]
def normalize(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().upper()
    value = re.sub(r'\bN(?:RO|O|UMERO)?\.?\s*(?=\d)', ' ', value)
    value = re.sub(r'[^A-Z0-9]+', ' ', value)
    return re.sub(r'\s+', ' ', re.sub(r'\bFARMACIAS?\b', '', value)).strip()
def search(value):
    return ' '.join(unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower().split())
def code(value):
    return str(value).strip().lstrip('0') or '0'
def prepare(source):
    book = openpyxl.load_workbook(source, read_only=True, data_only=True)
    if len(book.sheetnames) != 1: raise ValueError('Select and verify the ERP worksheet before importing.')
    sheet = book.active
    branches = json.loads((ROOT/'public/branches.json').read_text())
    medications = json.loads((ROOT/'public/catalog.json').read_text()) + json.loads((ROOT/'private/isbm.json').read_text())
    aliases = collections.defaultdict(set)
    for med in medications:
        for alias in [med['code']] + [r.get('code_p2h') for r in med.get('source_records', [])]:
            if alias: aliases[code(alias)].add(med['id'])
    header = next(sheet.iter_rows(values_only=True))
    if [re.sub(r'\s', '', str(h)).upper() for h in header[:7]] != ['CADENA','SUCURSAL','ARTICULO','DESCRIPCION','EMPAQUE','PROVEEDOR','EXISTENCIA']:
        raise ValueError('Unexpected ERP columns')
    centers, articles, stock = {}, {}, []
    pairs = set()
    for row_number, values in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):
        if not any(v is not None for v in values): continue
        chain, raw, article, description, packaging, provider, quantity = values[:7]
        chain, raw, description, packaging = [str(x or '').strip() for x in (chain, raw, description, packaging)]
        if not isinstance(quantity, (int, float)) or not float(quantity).is_integer(): raise ValueError(f'Invalid balance in row {row_number}')
        article = code(int(article) if isinstance(article, (float, int)) else article)
        if article not in aliases: raise ValueError(f'Unmapped article {article}')
        chain_code, chain_name = [s.strip() for s in chain.split('-', 1)]
        center_code, name = [s.strip() for s in raw.split('-', 1)]
        center_key = chain_code + ':' + center_code
        if (center_key, article) in pairs: raise ValueError(f'Duplicate center/article in row {row_number}')
        pairs.add((center_key, article))
        if center_key not in centers:
            candidates = [b for b in branches if b['chain']==chain_code and normalize(b['name'])==normalize(name)]
            method = 'exact'
            # ERP names are truncated to 30 characters. Only accept a unique prefix
            # at that boundary, within the same chain, and enforce one-to-one below.
            if not candidates and len(name)>=29:
                candidates = [b for b in branches if b['chain']==chain_code and normalize(b['name']).startswith(normalize(name))]
                method = 'unique_prefix'
            centers[center_key] = dict(center_key=center_key, chain_code=chain_code, chain_name=chain_name,
                erp_code=center_code, name=name, raw_name=raw,
                branch_id=candidates[0]['id'] if len(candidates)==1 else None,
                match_method=method if len(candidates)==1 else 'ambiguous' if candidates else 'unmatched',
                candidates=[b['id'] for b in candidates], row_count=0, positive_count=0, zero_count=0, negative_count=0,
                search_text=search(' '.join([chain_code, chain_name, raw])))
        center = centers[center_key]
        if center['raw_name'] != raw: raise ValueError('Center code has conflicting names')
        center['row_count'] += 1
        center['positive_count' if quantity>0 else 'zero_count' if quantity==0 else 'negative_count'] += 1
        info = dict(article_code=article, description=description, packaging=packaging,
            medication_ids=sorted(aliases[article]), search_text=search(' '.join([article, description, packaging])))
        if article in articles and articles[article] != info: raise ValueError('Article has conflicting presentation')
        articles[article] = info
        if provider and str(provider).strip(): raise ValueError('Provider column now contains data; extend importer to retain it')
        stock.append(dict(source_row=row_number, center_key=center_key, article_code=article, quantity=int(quantity)))
    assigned = collections.Counter(c['branch_id'] for c in centers.values() if c['branch_id'])
    for center in centers.values():
        if center['branch_id'] and assigned[center['branch_id']]>1:
            center['branch_id']=None;center['match_method']='ambiguous'
    metadata = dict(source_hash=hashlib.sha256(source.read_bytes()).hexdigest(), sheet_name=sheet.title,
        row_count=len(stock), center_count=len(centers), article_count=len(articles),
        positive_count=sum(r['quantity']>0 for r in stock), zero_count=sum(r['quantity']==0 for r in stock),
        negative_count=sum(r['quantity']<0 for r in stock), linked_center_count=sum(bool(c['branch_id']) for c in centers.values()),
        quantity_sum=sum(r['quantity'] for r in stock), quantity_min=min(r['quantity'] for r in stock), quantity_max=max(r['quantity'] for r in stock),
        mapping_methods=dict(collections.Counter(c['match_method'] for c in centers.values())))
    book.close()
    return dict(metadata=metadata, centers=list(centers.values()), articles=list(articles.values()), stock=stock)
if __name__=='__main__':
    payload=prepare(pathlib.Path(sys.argv[1]));out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
    for name, value in payload.items(): (out/(name+'.json')).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')))
    print(json.dumps(payload['metadata'],ensure_ascii=False,indent=2))
