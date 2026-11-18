(function(root){
  'use strict';
  // The divisor is preserved as source packaging, never interpreted as a box conversion.
  const units = Object.freeze({TAB:'tabletas',INH:'inhaladores',FRA:'frascos',TUB:'tubos',AMP:'ampollas',VIA:'viales',SOB:'sobres',TAR:'tarros',TTO:'tratamientos',PZA:'piezas'});
  function unit(packaging) {
    const abbreviation=String(packaging||'').trim().split(/[\s/]+/)[0].toUpperCase();
    return units[abbreviation] || (abbreviation ? `unidad no reconocida (${abbreviation})` : 'unidad no especificada en el ERP');
  }
  function quantity(amount,packaging) { return new Intl.NumberFormat('es-SV').format(amount)+' '+unit(packaging); }
  const api=Object.freeze({unit,quantity,units});
  root.FarmaErpLogic=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
