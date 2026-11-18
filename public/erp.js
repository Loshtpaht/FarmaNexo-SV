/* ERP balances retain their original date, article, packaging and signed quantity.
 * Manual checks stay in their own append-only history and take precedence on the
 * same calendar day (the source report has no time of day).
 */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => new Intl.NumberFormat('es-SV').format(value);
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const date = value => new Intl.DateTimeFormat('es-SV', {dateStyle:'medium', timeZone:'America/El_Salvador'}).format(new Date(value + 'T12:00:00-06:00'));
  let catalog = null, callbacks = {}, loading = false, catalogPromise, lastCatalogCheck = 0, mountedImport, result, request = 0, searchTimer;
  let filters = {query:'', chain:'', center:'', article:'', balance:'', mapping:''}, page = 1;
  const medicationCache = new Map(), medicationRequests = new Map();
  const reportTime = () => catalog?.import.report_date + 'T12:00:00-06:00';
  function centerForBranch(id) { return catalog?.centers.find(c => c.branch_id === id); }
  function sameDayOrLater(check) { return check && catalog && FarmaLogic.day(check.checked_at) >= FarmaLogic.day(reportTime()); }
  function manualFor(row) {
    return (callbacks.records?.() || []).filter(v => v.branch_id === row.branch_id && row.medication_ids.includes(v.medication_id) && sameDayOrLater(v))
      .sort((a,b) => b.checked_at.localeCompare(a.checked_at) || (b.received_at || b.created_at).localeCompare(a.received_at || a.created_at))[0];
  }
  function sourceRecord(row, medicationId) {
    return {source_type:'erp', branch_id:row.branch_id, medication_id:medicationId, quantity:row.quantity < 0 ? null : row.quantity,
      erp_quantity:row.quantity, erp_packaging:row.packaging, availability:row.quantity < 0 ? 'unknown' : row.quantity === 0 ? 'out' : 'available',
      checked_at:reportTime(), commercial:row.description, channel:'ERP · corte del reporte', center_key:row.center_key};
  }
  function effectiveRecord(branchId, medicationId, manual) {
    if (!catalog || !medicationId || sameDayOrLater(manual)) return manual;
    const source = medicationCache.get(medicationId)?.find(r => r.branch_id === branchId);
    return source ? sourceRecord(source, medicationId) : manual;
  }
  async function loadMedication(id) {
    if (!id || !catalog || medicationCache.has(id)) return;
    if (medicationRequests.has(id)) return medicationRequests.get(id);
    const importId = catalog.import.id;
    const pending = FarmaSync.erpMedication(id).then(rows => {
      if (catalog?.import.id !== importId) return;
      medicationCache.set(id, rows);
      callbacks.changed?.();
    }).catch(() => callbacks.notice?.('No se pudieron consultar los saldos ERP del medicamento. Vuelve a seleccionarlo.'))
      .finally(() => medicationRequests.delete(id));
    medicationRequests.set(id, pending);
    return pending;
  }
  function overview() {
    const host = $('#erpSummary');
    if (!host) return;
    host.hidden = !catalog;
    if (!catalog) return;
    const i = catalog.import;
    host.innerHTML = `<div><div class="eyebrow">REPORTE COMPARTIDO DEL ERP</div><h2>${number(i.row_count)} saldos disponibles</h2><p>${number(i.center_count)} centros · ${i.article_count} artículos · Corte ${esc(date(i.report_date))}</p><small>Es un corte importado. Las verificaciones posteriores se actualizan en tiempo real.</small></div><button class="btn primary" data-view="erp">Consultar existencias ERP →</button>`;
  }
  async function ensure(force = false) {
    if (!FarmaSync.state().connected) return;
    if (catalogPromise) return catalogPromise;
    if (catalog && !force && Date.now()-lastCatalogCheck<60000) return;
    catalogPromise = (async () => {
      try {
        const next = await FarmaSync.erpCatalog();
        lastCatalogCheck = Date.now();
        if (JSON.stringify(next?.import) !== JSON.stringify(catalog?.import)) {
          request++;
          catalog = next;
          mountedImport = undefined;
          medicationCache.clear();
          medicationRequests.clear();
          result = undefined;
          overview();
          callbacks.changed?.();
          if (callbacks.visible?.()) render();
        }
      } catch {
        if (callbacks.visible?.()) showError('No se pudo cargar el reporte ERP. Revisa la conexión e inténtalo otra vez.');
      } finally { catalogPromise = null; }
    })();
    return catalogPromise;
  }
  function showError(message) {
    const host = $('#erp');
    if (!host) return;
    if ($('#erpStatus')) {
      $('#erpStatus').textContent = message;
      $('#erpStatus').hidden = false;
      $('#erpRetry').hidden = false;
    } else {
      host.innerHTML = `<div class="panel empty"><b>${esc(message)}</b><p>Los saldos no se convierten a cero cuando falla la conexión.</p><button id="erpRetry" class="btn secondary">Reintentar</button></div>`;
      $('#erpRetry').onclick = () => ensure(true).then(render);
    }
  }
  const option = (value, text, selected) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(text)}</option>`;
  function updateCenters() {
    $('#erpCenter').innerHTML = option('', 'Todos los centros', filters.center) + catalog.centers.filter(c => !filters.chain || c.chain_code === filters.chain)
      .map(c => option(c.center_key, `${c.chain_code} · ${c.erp_code} · ${c.name}${c.branch_id ? '' : ' · Sin vínculo'}`, filters.center)).join('');
  }
  function render() {
    const host = $('#erp');
    if (!catalog) {
      host.innerHTML = '<div class="panel empty"><b>Consultando el reporte de existencias…</b></div>';
      if (FarmaSync.state().connected) ensure(true).then(() => { if (!catalog) showError('Todavía no hay un reporte ERP publicado.'); });
      else showError('Conecta con la base compartida para consultar el reporte ERP.');
      return;
    }
    if (mountedImport === catalog.import.id && $('#erpRows')) { renderRows(); return; }
    mountedImport = catalog.import.id;
    const i = catalog.import, chains = [...new Map(catalog.centers.map(c => [c.chain_code, c.chain_name])).entries()];
    host.innerHTML = `<section class="panel erp-intro"><div class="cataloghead"><div><div class="eyebrow">EXISTENCIAS REPORTADAS POR EL ERP</div><h2>Corte ${esc(date(i.report_date))}</h2><p>Importado ${esc(new Intl.DateTimeFormat('es-SV',{dateStyle:'medium',timeZone:'America/El_Salvador'}).format(new Date(i.imported_at)))}. ${esc(i.date_basis)}</p></div><a class="btn secondary" href="${esc(i.source_url)}" target="_blank" rel="noopener">Ver archivo original ↗</a></div><div class="erp-metrics"><div><strong>${number(i.row_count)}</strong><span>Saldos importados</span></div><div><strong>${i.center_count}</strong><span>Centros del ERP</span></div><div><strong>${i.article_count}</strong><span>Artículos identificados</span></div><button type="button" data-erp-balance="negative"><strong>${i.negative_count}</strong><span>Saldos negativos · revisar</span></button><button type="button" data-erp-mapping="pending"><strong>${i.center_count-i.linked_center_count}</strong><span>Centros sin vínculo al mapa</span></button></div><details class="erp-legend"><summary>Unidades y criterios del reporte</summary><p class="hint">Las unidades se muestran completas: TAB = tabletas, INH = inhaladores, FRA = frascos, TUB = tubos, AMP = ampollas, VIA = viales, SOB = sobres, TAR = tarros, TTO = tratamientos y PZA = piezas. «/ 1» sin abreviatura indica unidad no especificada. Se conserva el empaque original del ERP. No se convierte a cajas ni se suman presentaciones distintas. Los centros sin vínculo también están incluidos. Este reporte no es una conexión automática al ERP.</p></details></section>
      <div class="filters glass-surface erp-filters"><label class="search"><span>⌕</span><input type="search" id="erpSearch" maxlength="160" value="${esc(filters.query)}" placeholder="Buscar artículo, código o centro…" aria-label="Buscar existencias ERP"></label><select id="erpChain" aria-label="Cadena ERP">${option('','Todas las cadenas',filters.chain)}${chains.map(([code,name]) => option(code,`${code} · ${name}`,filters.chain)).join('')}</select><select id="erpCenter" aria-label="Centro ERP"></select><select id="erpArticle" aria-label="Artículo ERP">${option('','Todos los artículos',filters.article)}${catalog.articles.map(a => option(a.article_code,`${a.article_code} · ${a.description} · ${FarmaErpLogic.unit(a.packaging)} (${a.packaging})`,filters.article)).join('')}</select><select id="erpBalance" aria-label="Saldo ERP">${[['','Todos los saldos'],['positive','Saldo positivo'],['low','Pocas unidades ERP (1–5)'],['zero','Saldo cero'],['negative','Saldo negativo · revisar']].map(([v,t]) => option(v,t,filters.balance)).join('')}</select><select id="erpMapping" aria-label="Vínculo al directorio">${[['','Todos los centros'],['linked','Con vínculo al directorio'],['pending','Sin vínculo al directorio']].map(([v,t]) => option(v,t,filters.mapping)).join('')}</select><button class="rowbtn" id="erpClear">Limpiar</button></div>
      <p id="erpStatus" class="erp-status" role="status" hidden></p><button id="erpRetry" class="btn secondary" hidden>Reintentar consulta</button>
      <div class="tablewrap"><table class="erp-table" aria-label="Existencias del ERP"><thead><tr><th>Centro / cadena</th><th>Artículo / empaque ERP</th><th>Saldo ERP al corte</th><th>Seguimiento / actualización</th><th>Acción</th></tr></thead><tbody id="erpRows"></tbody></table><div id="erpEmpty" class="empty" hidden><b>No hay saldos con estos filtros</b><p>Prueba otro centro o artículo.</p></div></div><div class="pagination"><span id="erpPagination" role="status"></span><div><button id="erpPrev" class="rowbtn" aria-label="Página ERP anterior">←</button><span id="erpPage"></span><button id="erpNext" class="rowbtn" aria-label="Página ERP siguiente">→</button></div></div><p class="hint">«Actualizar» registra una consulta nueva compartida con todas las personas. El saldo original del ERP permanece como referencia; una verificación del mismo día o posterior tiene prioridad. Para verificar un medicamento exclusivo ISBM se solicita la contraseña del apartado.</p>`;
    updateCenters();
    for (const [id,key] of [['erpChain','chain'],['erpCenter','center'],['erpArticle','article'],['erpBalance','balance'],['erpMapping','mapping']]) {
      $('#' + id).onchange = e => {
        filters[key] = e.target.value; page = 1;
        if (key === 'chain') { filters.center = ''; updateCenters(); }
        query();
      };
    }
    $('#erpSearch').oninput = e => { filters.query=e.target.value; page=1; clearTimeout(searchTimer); searchTimer=setTimeout(query,250); };
    $('#erpClear').onclick = () => { clearTimeout(searchTimer); filters={query:'',chain:'',center:'',article:'',balance:'',mapping:''}; page=1; mountedImport=undefined; render(); };
    $('#erpPrev').onclick = () => { page--; query(); };
    $('#erpNext').onclick = () => { page++; query(); };
    $('#erpRetry').onclick = query;
    host.querySelector('[data-erp-balance]').onclick = () => { filters.balance='negative'; $('#erpBalance').value='negative'; page=1; query(); };
    host.querySelector('[data-erp-mapping]').onclick = () => { filters.mapping='pending'; $('#erpMapping').value='pending'; page=1; query(); };
    query();
  }
  async function query() {
    clearTimeout(searchTimer);
    const current = ++request;
    loading = true;
    $('#erpStatus').hidden = false;
    $('#erpStatus').textContent = 'Consultando saldos…';
    $('#erpRetry').hidden = true;
    $('#erpPrev').disabled = $('#erpNext').disabled = true;
    $('#erpRows').closest('table').setAttribute('aria-busy','true');
    try {
      const next = await FarmaSync.erpSearch({p_query:normalize(filters.query),p_chain:filters.chain,p_center:filters.center,p_article:filters.article,p_balance:filters.balance,p_mapping:filters.mapping,p_offset:(page-1)*25,p_limit:25});
      if (current !== request || !$('#erpRows')) return;
      if (next.import_id !== catalog.import.id) { await ensure(true); return; }
      result = next;
      loading = false;
      $('#erpStatus').hidden = true;
      renderRows();
    } catch {
      if (current === request) { loading=false; result=undefined; $('#erpRows').innerHTML=''; $('#erpPagination').textContent='Consulta no disponible'; $('#erpEmpty').hidden=true; showError('No se pudieron consultar los saldos. Reintenta; una consulta fallida no significa que no haya existencias.'); }
    } finally {
      if (current === request && $('#erpRows')) $('#erpRows').closest('table').setAttribute('aria-busy','false');
    }
  }
  function renderRows() {
    if (!$('#erpRows') || !result || loading) return;
    $('#erpRows').innerHTML = result.rows.map(row => {
      const manual = row.branch_id ? manualFor(row) : undefined;
      const v = manual || sourceRecord(row, row.medication_ids[0]);
      const state = FarmaLogic.status(v, callbacks.rules?.());
      const medId = row.medication_ids.find(id => !callbacks.protected?.(id)) || row.medication_ids[0];
      return `<tr><td><strong>${esc(row.center_name)}</strong><small>${esc(row.chain_code)} · Centro ${esc(row.erp_code)}</small><small>${row.branch_id ? esc(row.branch_id) : '<span class="erp-pending">Sin vínculo al directorio</span>'}</small></td><td class="catalogname"><strong>${esc(row.description)}</strong><small>Código ERP: ${esc(row.article_code)}</small><small>Unidad: ${esc(FarmaErpLogic.unit(row.packaging))}</small><small>Empaque ERP original: ${esc(row.packaging)}</small></td><td><strong class="erp-amount ${row.quantity<0?'negative':''}">${number(row.quantity)}</strong><small>${esc(FarmaErpLogic.unit(row.packaging))}</small>${row.quantity<0?'<small class="erp-negative">Saldo negativo · inconsistencia a revisar</small>':row.quantity===0?'<small>Sin saldo en el ERP al corte</small>':''}</td><td><span class="badge ${state.color}">${esc(state.label)}</span><small>${row.quantity<0&&!manual?'Confirmar saldo negativo con el centro':esc(state.reason)}</small>${manual?`<strong class="erp-manual">Actualización posterior</strong><small>${esc(callbacks.quantity?.(manual))}</small><small>${esc(new Intl.DateTimeFormat('es-SV',{dateStyle:'medium',timeZone:'America/El_Salvador'}).format(new Date(manual.checked_at)))} · ${esc(manual.channel)} · ${esc(manual.verifier)}</small>`:'<small>Fuente: ERP · no confirmado por llamada</small>'}</td><td>${row.branch_id?`<div class="erp-actions"><button class="rowbtn" data-detail="${esc(row.branch_id)}">Ver sucursal</button><button class="rowbtn" data-verify="${esc(row.branch_id)}" data-med="${esc(medId)}">Actualizar</button></div>`:'<small>Identificar sucursal antes de registrar una verificación.</small>'}</td></tr>`;
    }).join('');
    $('#erpEmpty').hidden = result.total > 0;
    $('#erpPagination').textContent = `${result.total ? number((page-1)*25+1) : 0}–${number(Math.min(page*25,result.total))} de ${number(result.total)} saldos`;
    const pages=Math.max(1,Math.ceil(result.total/25));
    $('#erpPage').textContent=`${page} / ${pages}`;
    $('#erpPrev').disabled=page<=1;
    $('#erpNext').disabled=page>=pages;
  }
  function exportPage() {
    if (!result || loading || !catalog) { callbacks.notice?.('Espera a que termine la consulta ERP para exportar.'); return; }
    const header=['Fecha corte ERP','Cadena','Código centro ERP','Centro ERP','Sucursal directorio','Vínculo','Código artículo ERP','Descripción ERP','Empaque ERP original','Unidad completa ERP','Saldo ERP al corte','Consulta posterior','Cantidad consulta','Unidad consulta','Canal','Verificado por'];
    const rows=result.rows.map(row=>{
      const manual=manualFor(row);
      return [catalog.import.report_date,row.chain_code,row.erp_code,row.center_name,row.branch_id||'',row.branch_id?'Vinculado':'Pendiente',row.article_code,row.description,row.packaging,FarmaErpLogic.unit(row.packaging),row.quantity,manual?.checked_at||'',manual?.quantity??'',manual?callbacks.medicationUnit?.(manual.medication_id)||'':'',manual?.channel||'',manual?.verifier||''];
    });
    const cell=value=>{const safe=typeof value==='string'&&/^[=+@\-]/.test(value)?"'"+value:value;return '"'+String(safe??'').replace(/"/g,'""')+'"';};
    const csv='\ufeff'+[header,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`farmanexo-erp-${catalog.import.report_date}-pagina-${page}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    callbacks.notice?.(`Página exportada: ${rows.length} saldos, con unidades completas y empaque original.`);
  }
  function openCenter(key) {
    filters={query:'',chain:'',center:key,article:'',balance:'',mapping:''};page=1;mountedImport=undefined;
    callbacks.open?.();
  }
  function branchMarkup(id) {
    const c=centerForBranch(id);
    if (!c) return '';
    return `<div class="dialoginfo erp-branch-summary"><strong>Existencias ERP · corte ${esc(date(catalog.import.report_date))}</strong><p>${c.row_count} artículos · ${c.positive_count} con saldo positivo · ${c.zero_count} en cero · ${c.negative_count} con saldo negativo.</p><button class="btn secondary" data-erp-center="${esc(c.center_key)}">Ver saldos de este centro →</button></div>`;
  }
  document.addEventListener('click', e => {
    const button = e.target.closest('[data-erp-center]');
    if (button) { $('#dialog').close(); openCenter(button.dataset.erpCenter); }
  });
  window.addEventListener('erp-import-changed', () => ensure(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) ensure(true); });
  window.FarmaErp = Object.freeze({init(options){callbacks=options;},ensure,render,loadMedication,effectiveRecord,centerForBranch,branchMarkup,
    exportPage,refreshManual(){ if(callbacks.visible?.())renderRows(); },getReport:()=>catalog?.import,
    openCenter,number,date, isLoadingMedication:id=>medicationRequests.has(id)});
})();
