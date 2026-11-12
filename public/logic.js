(function(root){
const defaults={low:5,high:20,normalWarn:2,normalDue:3,highWarn:3,highDue:4,lowDue:1,outWarn:1,outDue:2};
function day(t){const s=new Intl.DateTimeFormat('en-CA',{timeZone:'America/El_Salvador',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));return Date.parse(s+'T00:00:00Z')/86400000}
function status(v,r=defaults,now=Date.now()){
 if(!v)return {key:'unverified',label:'Sin verificar',color:'gray',reason:'No hay consulta registrada',rank:0};
 const age=Math.max(0,day(now)-day(v.checked_at));let warn=r.normalWarn,due=r.normalDue,low=false;
 if(v.availability==='out'){warn=r.outWarn;due=r.outDue}
 else if(v.availability==='available'&&v.quantity!==null&&v.quantity<=r.low){warn=0;due=r.lowDue;low=true}
 else if(v.availability==='available'&&v.quantity!==null&&v.quantity>=r.high){warn=r.highWarn;due=r.highDue}
 if(age>=due)return {key:'urgent',label:'Consultar urgente',color:'red',reason:'Se necesita consultar',rank:3,age,warn,due};
 if(age>=warn||v.availability==='unknown')return {key:'review',label:'En revisión',color:'amber',reason:low?'Pocas unidades: verificar nuevamente':v.availability==='unknown'?'Disponibilidad no confirmada':'Se recomienda consultar',rank:2,age,warn,due};
 return {key:'current',label:'Vigente',color:'green',reason:'Dentro del plazo de seguimiento',rank:1,age,warn,due};
}
function latest(records){const map=new Map();for(const v of records){const k=v.branch_id+'|'+v.medication_id,p=map.get(k);if(!p||v.checked_at>p.checked_at||v.checked_at===p.checked_at&&v.created_at>p.created_at)map.set(k,v)}return [...map.values()]}
const api={defaults,day,status,latest};root.FarmaLogic=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
