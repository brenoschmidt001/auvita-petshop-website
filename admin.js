import {SUPABASE_URL,SUPABASE_ANON_KEY,CONFIGURED} from './supabase-config.js';
const $=id=>document.getElementById(id),status=msg=>$('status').textContent=msg;let db,products=[],editing=null,photoObjectUrl=null,removeExistingPhoto=false;
const BUCKET='product-images';
if(!CONFIGURED){status('Configure supabase-config.js antes de usar o painel.');$('login-form').querySelector('button').disabled=true}else{const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');db=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);init()}
async function init(){const {data:{session}}=await db.auth.getSession();await showSession(session);db.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>showSession(session),0)})}
async function showSession(session){$('login').hidden=!!session;$('dashboard').hidden=!session;if(!session){status('Entre com a conta autorizada.');return}const {data,error}=await db.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();if(error||!data){status('Esta conta não tem permissão de administrador.');$('dashboard').hidden=true;return}status('Conectado como '+session.user.email);$('dashboard').hidden=false;await refresh()}
$('login-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);status('Entrando...');const {error}=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)status('Não foi possível entrar: '+error.message)};
$('logout').onclick=async()=>{await db.auth.signOut();location.reload()};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function refresh(){const [p,s]=await Promise.all([db.from('products').select('*').order('sort_order'),db.from('store_settings').select('*').eq('id',1).maybeSingle()]);if(p.error||s.error){status('Erro ao carregar dados: '+(p.error||s.error).message);return}products=p.data||[];$('list').innerHTML=products.map((p,i)=>`<div class="item">${p.image?`<img src="${esc(p.image)}" alt="">`:'<div style="width:70px;height:70px;background:#edf4f0;border-radius:10px"></div>'}<div class="grow"><strong>${esc(p.name)}</strong><div class="muted">${esc(p.price||'Preço sob consulta')} · ${p.active?'Visível':'Oculto'}</div></div><div><button data-action="edit" data-i="${i}" class="secondary">Editar</button><button data-action="toggle" data-i="${i}" class="secondary">${p.active?'Ocultar':'Exibir'}</button><button data-action="delete" data-i="${i}" class="danger">Excluir</button></div></div>`).join('')||'<p>Nenhum produto cadastrado.</p>';const store=s.data||{};for(const key of ['whatsapp','hours','announcement'])$('store-form').elements[key].value=store[key]||''}
$('list').onclick=async e=>{const b=e.target.closest('button[data-action]');if(!b)return;const p=products[+b.dataset.i];if(b.dataset.action==='edit')return edit(p);if(b.dataset.action==='delete'&&!confirm('Excluir este produto?'))return;const res=b.dataset.action==='delete'?await db.from('products').delete().eq('id',p.id):await db.from('products').update({active:!p.active}).eq('id',p.id);if(res.error)status(res.error.message);else{if(b.dataset.action==='delete'&&p.image)await removeOldStorageImage(p.image);await refresh()}};
function updatePreview(src){const preview=$('photo-preview');preview.hidden=!src;if(src)preview.src=src;else preview.removeAttribute('src')}
function clearObjectUrl(){if(photoObjectUrl){URL.revokeObjectURL(photoObjectUrl);photoObjectUrl=null}}
function edit(p){
 editing=p?.id||null;removeExistingPhoto=false;clearObjectUrl();$('photo-file').value='';
 $('editor').hidden=false;$('editor-title').textContent=p?'Editar produto':'Novo produto';
 const f=$('product-form');for(const k of ['name','price','image','description','sort_order'])f.elements[k].value=p?.[k]??(k==='sort_order'?products.length:'');
 f.elements.active.value=String(p?.active??true);updatePreview(p?.image||'');$('editor').scrollIntoView({behavior:'smooth'});
}
$('photo-file').onchange=e=>{
 clearObjectUrl();const file=e.target.files?.[0];if(!file){updatePreview(removeExistingPhoto?'':$('image-url').value);return}
 if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024){status('Escolha uma imagem JPG, PNG, WebP ou GIF com até 5 MB.');e.target.value='';updatePreview(removeExistingPhoto?'':$('image-url').value);return}
 removeExistingPhoto=false;photoObjectUrl=URL.createObjectURL(file);updatePreview(photoObjectUrl);
};
$('remove-photo').onclick=()=>{clearObjectUrl();$('photo-file').value='';$('image-url').value='';removeExistingPhoto=true;updatePreview('')};
$('new').onclick=()=>edit(null);
$('cancel').onclick=()=>{$('editor').hidden=true;clearObjectUrl()};
function storedPath(url){
 try{const u=new URL(url);const marker='/storage/v1/object/public/'+BUCKET+'/';
 if(u.origin!==new URL(SUPABASE_URL).origin||!u.pathname.startsWith(marker))return null;
 return decodeURIComponent(u.pathname.slice(marker.length));}catch{return null}
}
async function removeOldStorageImage(url){const path=storedPath(url);if(path){const {error}=await db.storage.from(BUCKET).remove([path]);if(error)console.warn('Foto antiga não removida:',error.message)}}
$('product-form').onsubmit=async e=>{
 e.preventDefault();const btn=e.submitter||e.target.querySelector('button:not([type])');btn.disabled=true;
 const f=new FormData(e.target),file=$('photo-file').files?.[0],old=editing?products.find(p=>p.id===editing):null;
 const payload={name:String(f.get('name')).trim(),price:String(f.get('price')).trim(),image:String(f.get('image')).trim(),description:String(f.get('description')).trim(),active:f.get('active')==='true',sort_order:Number(f.get('sort_order'))||0};
 let uploadedPath=null;
 try{
  if(file){
   if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)||file.size>5*1024*1024)throw new Error('A imagem precisa ser JPG, PNG, WebP ou GIF e ter até 5 MB.');
   status('Enviando foto...');const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
   uploadedPath=`${crypto.randomUUID()}.${ext}`;
   const {error:uploadError}=await db.storage.from(BUCKET).upload(uploadedPath,file,{contentType:file.type,upsert:false});
   if(uploadError)throw new Error('Falha ao enviar a foto: '+uploadError.message);
   payload.image=db.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
  }
  status('Salvando produto...');const r=editing?await db.from('products').update(payload).eq('id',editing):await db.from('products').insert(payload);
  if(r.error){if(uploadedPath)await db.storage.from(BUCKET).remove([uploadedPath]);throw new Error('Erro ao salvar: '+r.error.message)}
  if(old?.image&&old.image!==payload.image)await removeOldStorageImage(old.image);
  $('editor').hidden=true;clearObjectUrl();status('Produto salvo com sucesso!');await refresh();
 }catch(err){status(err.message||'Não foi possível salvar o produto.')}finally{btn.disabled=false}
};
$('store-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);const payload={id:1,whatsapp:String(f.get('whatsapp')).replace(/\D/g,''),hours:String(f.get('hours')),announcement:String(f.get('announcement'))};const {error}=await db.from('store_settings').upsert(payload);status(error?'Erro ao salvar: '+error.message:'Informações da loja salvas no banco de dados.')};

// Serviços gerenciados no Supabase (mesma autenticação dos produtos).
let services=[],editingService=null;
async function refreshServices(){
 const {data,error}=await db.from('services').select('*').order('sort_order');
 if(error){$('service-list').textContent='Não foi possível carregar serviços: '+error.message;return}
 services=data||[];
 $('service-list').innerHTML=services.map((s,i)=>`<div class="item"><div class="grow"><strong>${esc(s.name)}</strong><div class="muted">${s.active?'Visível':'Oculto'}</div></div><div><button type="button" class="secondary" data-action="edit" data-i="${i}">Editar</button><button type="button" class="secondary" data-action="toggle" data-i="${i}">${s.active?'Ocultar':'Exibir'}</button><button type="button" class="danger" data-action="delete" data-i="${i}">Excluir</button></div></div>`).join('')||'<p>Nenhum serviço cadastrado.</p>';
}
function editService(s){editingService=s?.id||null;const f=$('service-form');f.reset();for(const k of ['name','subtitle','description','sort_order'])f.elements[k].value=s?.[k]??(k==='sort_order'?services.length:'');f.elements.bullets.value=(s?.bullets||[]).join('\n');f.elements.featured.checked=!!s?.featured;f.elements.active.value=String(s?.active??true);$('service-editor-title').textContent=s?'Editar serviço':'Novo serviço';$('service-editor').hidden=false;$('service-editor').scrollIntoView({behavior:'smooth'});}
$('service-new').onclick=()=>editService(null);
$('service-cancel').onclick=()=>{$('service-editor').hidden=true};
$('service-list').onclick=async e=>{const b=e.target.closest('button[data-action]');if(!b)return;const s=services[+b.dataset.i];if(b.dataset.action==='edit')return editService(s);if(b.dataset.action==='delete'&&!confirm('Excluir este serviço?'))return;const {error}=b.dataset.action==='delete'?await db.from('services').delete().eq('id',s.id):await db.from('services').update({active:!s.active}).eq('id',s.id);status(error?'Erro: '+error.message:'Serviço atualizado!');if(!error)await refreshServices();};
$('service-form').onsubmit=async e=>{e.preventDefault();const btn=e.submitter;btn.disabled=true;const f=new FormData(e.target);const payload={name:String(f.get('name')).trim(),subtitle:String(f.get('subtitle')||''),description:String(f.get('description')||''),bullets:String(f.get('bullets')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean),sort_order:Number(f.get('sort_order'))||0,featured:f.get('featured')==='on',active:f.get('active')==='true',prices:services.find(x=>x.id===editingService)?.prices||{}};const {error}=editingService?await db.from('services').update(payload).eq('id',editingService):await db.from('services').insert(payload);status(error?'Erro ao salvar serviço: '+error.message:'Serviço salvo com sucesso!');if(!error){$('service-editor').hidden=true;await refreshServices()}btn.disabled=false;};
const oldRefresh=refresh;
refresh=async function(){await oldRefresh();await refreshServices()};


// Conteúdo dinâmico do site, gerenciado por área.
let contentRows=[],editingContent=null;
async function loadContent(){const section=$('content-section').value;const {data,error}=await db.from('site_content').select('*').eq('section',section).order('sort_order');if(error){$('content-list').textContent='Configure a tabela site_content (veja CONFIGURAR-PAINEL.sql): '+error.message;return}contentRows=data||[];$('content-list').innerHTML=contentRows.map((x,i)=>`<div class="item">${x.image?`<img src="${esc(x.image)}" alt="">`:''}<div class="grow"><strong>${esc(x.title)}</strong><div class="muted">${x.active?'Visível':'Oculto'} · Ordem ${x.sort_order}</div></div><div><button class="secondary" data-action="edit" data-i="${i}">Editar</button><button class="secondary" data-action="toggle" data-i="${i}">${x.active?'Ocultar':'Exibir'}</button><button class="danger" data-action="delete" data-i="${i}">Excluir</button></div></div>`).join('')||'<p>Nenhum item cadastrado. O conteúdo atual permanece no site até você cadastrar itens nesta área.</p>'}
$('content-section').onchange=loadContent;
function editContent(x){editingContent=x?.id||null;const f=$('content-form');f.reset();for(const k of ['title','body','image','sort_order'])f.elements[k].value=x?.[k]??'';f.elements.active.value=String(x?.active??true);$('content-editor-title').textContent=x?'Editar conteúdo':'Novo conteúdo';$('content-editor').hidden=false;$('content-editor').scrollIntoView({behavior:'smooth'})}
$('content-new').onclick=()=>editContent(null);$('content-cancel').onclick=()=>{$('content-editor').hidden=true};
$('content-list').onclick=async e=>{const b=e.target.closest('button[data-action]');if(!b)return;const x=contentRows[+b.dataset.i];if(b.dataset.action==='edit')return editContent(x);if(b.dataset.action==='delete'&&!confirm('Excluir este conteúdo?'))return;const {error}=b.dataset.action==='delete'?await db.from('site_content').delete().eq('id',x.id):await db.from('site_content').update({active:!x.active}).eq('id',x.id);status(error?error.message:'Conteúdo atualizado.');if(!error)await loadContent()};
$('content-form').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),payload={section:$('content-section').value,title:String(f.get('title')).trim(),body:String(f.get('body')||''),image:String(f.get('image')||''),sort_order:Number(f.get('sort_order'))||0,active:f.get('active')==='true'};const {error}=editingContent?await db.from('site_content').update(payload).eq('id',editingContent):await db.from('site_content').insert(payload);status(error?'Erro: '+error.message:'Conteúdo salvo!');if(!error){$('content-editor').hidden=true;await loadContent()}};
const oldRefreshContent=refresh;refresh=async function(){await oldRefreshContent();await loadContent()};
