const origin='https://loshtpaht.github.io';
const page='https://loshtpaht.github.io/FarmaNexo-SV/';
Deno.serve(async(req:Request)=>{
 const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
 const answer=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return answer({error:'Origen no permitido'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return answer({error:'Método no permitido'},405);
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const bearer=req.headers.get('authorization');if(!bearer?.startsWith('Bearer '))return answer({error:'Inicia sesión con una cuenta del equipo.'},401);
 const userHeaders={apikey:anon,Authorization:bearer,'Content-Type':'application/json'};
 try{
  const userResponse=await fetch(url+'/auth/v1/user',{headers:userHeaders});if(!userResponse.ok)return answer({error:'La sesión no es válida. Vuelve a entrar.'},401);
  const user=await userResponse.json();if(!user.id||!user.email_confirmed_at)return answer({error:'Se necesita una cuenta confirmada.'},403);
  const roleResponse=await fetch(url+'/rest/v1/rpc/farmanexo_role',{method:'POST',headers:userHeaders,body:'{}'});const role=await roleResponse.json();if(!roleResponse.ok||role!=='admin')return answer({error:'Solo un administrador puede generar accesos.'},403);
  const body=await req.json(),email=String(body.email||'').trim().toLowerCase(),targetRole=String(body.role||'editor');
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['viewer','editor','admin'].includes(targetRole))return answer({error:'Revisa el correo y el permiso.'},400);
  const adminHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  const admin=async(path:string,method:string,data?:unknown)=>{const response=await fetch(url+'/auth/v1/'+path,{method,headers:adminHeaders,body:data===undefined?undefined:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.msg||result.message||'No se pudo preparar el acceso.');return result};
  let exists=false;for(let n=1;n<=20;n++){const result=await admin('admin/users?page='+n+'&per_page=1000','GET');const users=result.users||[];if(users.some((u:{email?:string})=>u.email?.toLowerCase()===email)){exists=true;break}if(users.length<1000)break}
  if(!exists)await admin('admin/users','POST',{email,email_confirm:true,app_metadata:{farmanexo_provisioned:true}});
  const memberResponse=await fetch(url+'/rest/v1/rpc/farmanexo_manage_member',{method:'POST',headers:userHeaders,body:JSON.stringify({p_email:email,p_role:targetRole})});if(!memberResponse.ok){const e=await memberResponse.json();return answer({error:e.message||'No se pudo actualizar el permiso.'},400)}
  const generated=await admin('admin/generate_link','POST',{type:'magiclink',email});if(!generated.hashed_token)throw Error('Supabase no devolvió un enlace válido.');
  return answer({email,role:targetRole,link:page+'#team_token_hash='+encodeURIComponent(generated.hashed_token),one_time:true});
 }catch(e){return answer({error:e instanceof Error?e.message:'No se pudo crear el acceso.'},400)}
});
