import { adminOperationsService as admin } from '../../services/admin-operations-service.js';
import { authService } from '../../services/auth-service.js';
import { renderEmailTemplateManager } from './email-templates.js';

const view=document.body.dataset.adminView??'dashboard';
const operationalRouteViews=new Set(['feedback','reports','system','security']);
const root=document.querySelector('[data-admin-root]');
const navigationGroups=[
  ['Overview',[['Dashboard','/admin/','dashboard'],['Feedback','/admin/feedback/','feedback'],['Reports','/admin/reports/','reports']]],
  ['Customer operations',[['Users','/admin/users/','users'],['Kartu','/admin/cards/','cards'],['Subscriptions','/admin/subscriptions/','subscriptions'],['Usage','/admin/usage/','usage']]],
  ['Content & communication',[['Landing page','/admin/landing-content/','landing-content'],['Mail outbox','/admin/mail/','mail'],['Template email','/admin/mail/templates/','email-templates']]],
  ['Service operations',[['Resume Services','/admin/resume-services/','resume-services'],['CV Specialists','/admin/cv-specialists/','cv-specialists']]],
  ['Governance',[['Interventions','/admin/interventions/','interventions'],['Settings','/admin/settings/','settings'],['System','/admin/system/','system'],['Security','/admin/security/','security']]],
];
const viewTitles={dashboard:'Command center',feedback:'Feedback inbox',reports:'Reports',system:'System health',security:'Security operations',cards:'Kartu','card-detail':'Detail kartu'};
const header=document.createElement('header'),nav=document.createElement('nav'),title=document.createElement('h1'),content=document.createElement('section'),status=document.createElement('p');
header.className='dashboard-panel p-6';nav.className='admin-navigation mt-5';nav.setAttribute('aria-label','Navigasi Super Admin');title.className='text-3xl font-black';title.textContent=viewTitles[view]??view.replaceAll('-',' ');
for(const[groupLabel,links]of navigationGroups){
  const group=document.createElement('section'),heading=document.createElement('h2'),items=document.createElement('div');
  group.className='admin-navigation__group';heading.className='admin-navigation__label';heading.textContent=groupLabel;items.className='admin-navigation__links';
  for(const[label,href,key]of links){const link=document.createElement('a');link.className='dashboard-action fdn-nav-link';link.href=href;if(new URL(href,location.href).pathname===location.pathname)link.setAttribute('aria-current','page');link.textContent=label;if(key==='feedback'){const badge=document.createElement('span');badge.className='admin-feedback-badge';badge.dataset.feedbackBadge='';badge.hidden=true;link.append(' ',badge);}items.append(link);}
  group.append(heading,items);nav.append(group);
}
const logout=document.createElement('button');logout.type='button';logout.className='dashboard-action';logout.textContent='Logout admin';logout.dataset.logout='';
logout.addEventListener('click',async()=>{if(logout.disabled)return;logout.disabled=true;status.textContent='Keluar dari Super Admin...';try{await authService.logout();location.replace('/login/');}catch(error){if(error?.status===401){location.replace('/login/');return;}status.textContent=errorMessage(error);logout.disabled=false;}});nav.append(logout);
header.append(title,nav);content.className='dashboard-panel mt-6 overflow-x-auto p-5';status.className='mt-4 text-slate-300';status.setAttribute('aria-live','polite');status.textContent='Memuat data terotorisasi…';root.append(header,content,status);

load();

async function load(){
  try{
    const {user:actor}=await authService.current();
    const roles=Array.isArray(actor.roles)?actor.roles:[actor.role];
    if(!roles.includes('super_admin')){location.replace(roles.includes('cv_specialist')?'/specialist/':'/app/');return;}
    if(view==='dashboard'){const statistics=await admin.statistics();updateFeedbackBadge(statistics.newFeedback);return renderDashboard(statistics);}
    updateFeedbackBadge().catch(()=>{});
    if(view==='feedback')return renderFeedback();
    if(view==='reports')return renderReports();
    if(view==='system')return renderSystem(await admin.system());
    if(view==='security')return renderSecurity(await admin.security());
    if(view==='users')return renderRows(await admin.users());
    if(view==='cards')return renderCards(new URLSearchParams(location.search).get('q')??'');
    if(view==='card-detail')return renderCard(await admin.card(new URLSearchParams(location.search).get('id')??''));
    if(view==='subscriptions')return renderRows(await admin.subscriptions());
    if(view==='usage')return renderRows(await admin.usage());
    if(view==='interventions')return renderRows(await admin.interventions());
    if(view==='settings')return renderRows(await admin.settings());
    if(view==='mail')return renderMail(await admin.mailOutbox());
    if(view==='email-templates')return renderEmailTemplateManager({content,status});
    if(view==='cv-specialists')return renderRows(await admin.cvSpecialists());
    if(view==='user-detail')return renderUser(await admin.user(new URLSearchParams(location.search).get('id')??''));
  }catch(error){handleError(error);}
}

async function renderCards(initialQuery){
  const form=document.createElement('form'),input=document.createElement('input'),submit=document.createElement('button'),hint=document.createElement('p'),list=document.createElement('div');
  form.className='flex flex-wrap gap-3';input.type='search';input.name='q';input.value=initialQuery;input.placeholder='Cari nama, email, URL, atau public ID';input.className='min-w-0 flex-1 rounded border border-white/20 px-3 py-3';submit.type='submit';submit.className='dashboard-action';submit.textContent='Cari';hint.className='mt-3 text-sm text-slate-300';hint.textContent='Menampilkan data kontak untuk operasional Super Admin. Aksi relasi dicatat pada audit log.';list.className='mt-5 overflow-x-auto';form.append(input,submit);content.replaceChildren(form,hint,list);
  const draw=async(query)=>{setLoading(list,'Memuat kartu...');const rows=await admin.cards(query);list.replaceChildren(cardTable(rows));status.textContent=`${rows.length} kartu ditampilkan.`;};
  form.addEventListener('submit',async(event)=>{event.preventDefault();const query=input.value.trim();history.replaceState(null,'',`${location.pathname}${query?`?q=${encodeURIComponent(query)}`:''}`);try{await draw(query);}catch(error){handleError(error);}});
  await draw(initialQuery);
}

function cardTable(rows){
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),head=document.createElement('tr');table.className='min-w-full text-left text-sm';
  for(const label of['Kartu','Kontak','Pemilik akun','Paket','Status','Dibuat']){const th=document.createElement('th');th.className='px-2 py-3 text-slate-400';th.textContent=label;head.append(th);}thead.append(head);
  for(const row of rows){const line=document.createElement('tr');line.className='border-t border-white/10';const detail=document.createElement('a');detail.className='text-cyan-300 hover:underline';detail.href=`/admin/cards/detail/?id=${encodeURIComponent(row.publicId)}`;detail.textContent=row.slug;const cardCell=cell(detail);cardCell.append(document.createElement('br'),plain(String(row.publicId).slice(0,8)));line.append(cardCell,cell(`${row.fullName??'—'} · ${row.contactEmail??'—'}`),cell(row.ownerEmail??'Belum terhubung'),cell(row.planCode),cell(row.status),cell(format(row.createdAt)));tbody.append(line);}
  table.append(thead,tbody);return table;
}

function renderCard(data){
  const wrapper=document.createElement('div');wrapper.className='grid gap-5 lg:grid-cols-2';
  wrapper.append(objectPanel('Data kartu & kontak',data.card));
  wrapper.append(objectPanel('Pemilik akun',data.owner??{status:'Belum terhubung'}));
  const actions=document.createElement('section');actions.className='rounded-2xl border border-white/10 p-5';const heading=document.createElement('h2');heading.className='text-xl font-black';heading.textContent='Aksi relasi terkontrol';const note=document.createElement('p');note.className='mt-2 text-sm text-slate-300';note.textContent='Hubungkan hanya ke akun aktif-terverifikasi dengan email yang persis sama. Semua aksi memerlukan alasan dan dicatat.';const preview=document.createElement('a');preview.className='dashboard-action mt-4 inline-block';preview.href=`/${encodeURIComponent(data.card.slug)}`;preview.target='_blank';preview.rel='noopener';preview.textContent='Buka kartu publik';const form=document.createElement('form');form.className='mt-4';const select=document.createElement('select');select.name='action';for(const value of['CONNECT_MATCHING_VERIFIED_ACCOUNT','RELEASE_CARD']){const option=document.createElement('option');option.value=value;option.textContent=value==='CONNECT_MATCHING_VERIFIED_ACCOUNT'?'Hubungkan ke akun email terverifikasi':'Lepaskan dari akun';select.append(option);}if(data.owner)select.value='RELEASE_CARD';const reason=document.createElement('textarea');reason.name='reason';reason.required=true;reason.minLength=10;reason.maxLength=1000;reason.placeholder='Alasan wajib (minimal 10 karakter)';const submit=document.createElement('button');submit.type='submit';submit.className='dashboard-action';submit.textContent='Konfirmasi aksi';for(const field of[select,reason,submit])field.classList.add('mt-3','block','w-full');form.append(select,reason,submit);actions.append(heading,note,preview,form);wrapper.append(actions,rowsPanel('Audit kartu',data.audit??[]));content.replaceChildren(wrapper);status.textContent='Data kontak hanya tersedia bagi Super Admin. Edit konten tetap melalui workspace pemilik.';
  const releaseWarning=document.createElement('p');releaseWarning.className='admin-release-warning';releaseWarning.textContent='PERINGATAN: RELEASE_CARD akan melepaskan kartu dari akun sampai kartu dihubungkan kembali.';form.insertBefore(releaseWarning,reason);
  const syncReleaseWarning=()=>{releaseWarning.hidden=select.value!=='RELEASE_CARD';};select.addEventListener('change',syncReleaseWarning);syncReleaseWarning();
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();
    if(submit.disabled)return;
    const values=new FormData(form),action=String(values.get('action')),reasonText=String(values.get('reason')).trim();
    if(reasonText.length<10){status.textContent='Alasan minimal 10 karakter.';return;}
    const confirmation=action==='RELEASE_CARD'
      ? 'PERINGATAN: kartu akan dilepaskan dari akun sampai dihubungkan kembali. Lanjutkan RELEASE_CARD?'
      : 'Hubungkan kartu ke akun terverifikasi dengan email yang sama?';
    if(!window.confirm(confirmation))return;
    submit.disabled=true;select.disabled=true;reason.disabled=true;
    try{await admin.interveneCard(data.card.publicId,{action,reason:reasonText,confirm:true});status.textContent='Aksi berhasil dicatat.';await load();}
    catch(error){handleError(error);}
    finally{submit.disabled=false;select.disabled=false;reason.disabled=false;}
  });
}

function cell(value){const td=document.createElement('td');td.className='px-2 py-3 align-top break-words';if(value instanceof Node)td.append(value);else td.textContent=String(value);return td;}
function plain(value){const node=document.createElement('span');node.className='text-slate-400';node.textContent=value;return node;}

function renderMail(rows){
  if(!rows.length){content.textContent='Belum ada mail job.';status.textContent='0 item.';return;}
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),head=document.createElement('tr');
  for(const label of['Recipient','Template','Status','Attempts','Available','Error','Action']){const th=document.createElement('th');th.className='px-2 py-3 text-left text-slate-400';th.textContent=label;head.append(th);}thead.append(head);
  for(const item of rows){const line=document.createElement('tr');line.className='border-t border-white/10';const values=[item.maskedRecipient,item.templateKey,item.status,`${item.attempts}/${item.maxAttempts}`,format(item.availableAt),item.lastErrorMessage??'—'];for(const value of values){const td=document.createElement('td');td.className='px-2 py-3 align-top break-words';td.textContent=String(value);line.append(td);}const action=document.createElement('td');action.className='px-2 py-3 align-top';if(item.status==='failed'){const retry=document.createElement('button');retry.type='button';retry.className='dashboard-action';retry.textContent='Retry';retry.addEventListener('click',()=>retryMail(item,retry));action.append(retry);}else action.textContent='—';line.append(action);tbody.append(line);}
  table.className='min-w-full text-sm';table.append(thead,tbody);content.replaceChildren(table);status.textContent=`${rows.length} mail job tersanitasi. Data sensitif dan secret tidak ditampilkan.`;
}

async function retryMail(item,button){
  const reason=window.prompt('Alasan retry mail (minimal 10 karakter):','Retry after verified delivery incident');
  if(!reason||reason.trim().length<10){status.textContent='Retry dibatalkan: alasan minimal 10 karakter.';return;}
  if(!window.confirm(`Antrekan ulang mail ${item.publicId.slice(0,8)} dan catat immutable audit event?`))return;
  button.disabled=true;
  try{await admin.retryMail(item.publicId,{reason:reason.trim(),confirm:true});status.textContent='Mail job berhasil dimasukkan kembali ke antrean.';return load();}
  catch(error){handleError(error);button.disabled=false;}
}

function renderRows(rows){
  if(!rows.length){content.textContent='Belum ada data.';status.textContent='0 item.';return;}
  const table=document.createElement('table'),thead=document.createElement('thead'),tbody=document.createElement('tbody'),headers=Object.keys(rows[0]).filter(isSafeAdminField),tr=document.createElement('tr');
  table.className='min-w-full text-left text-sm';for(const key of headers){const th=document.createElement('th');th.className='px-2 py-3 text-slate-400';th.textContent=key;tr.append(th);}thead.append(tr);
  for(const row of rows){const line=document.createElement('tr');line.className='border-t border-white/10';for(const key of headers){const td=document.createElement('td');td.className='px-2 py-3 align-top break-words';if(key==='publicId'&&['users','cv-specialists'].includes(view)){const link=document.createElement('a');link.className='text-cyan-300 hover:underline';link.href=`/admin/${view==='users'?'users':'cv-specialists'}/detail/?id=${encodeURIComponent(row[key])}`;link.textContent=String(row[key]).slice(0,8);td.append(link);}else td.textContent=format(row[key]);line.append(td);}tbody.append(line);}
  table.append(thead,tbody);content.replaceChildren(table);status.textContent=`${rows.length} item ditampilkan.`;
}

function renderUser(data){
  const wrapper=document.createElement('div');wrapper.className='grid gap-5 lg:grid-cols-2';
  wrapper.append(objectPanel('Identity & verification',data.identity));
  for(const key of['subscriptions','payments','usage','resume','security','audit'])wrapper.append(rowsPanel(key,data[key]));
  const form=document.createElement('form');form.className='rounded-2xl border border-white/10 p-5';form.dataset.intervention='';
  const formTitle=document.createElement('h2');formTitle.className='text-xl font-black';formTitle.textContent='Controlled intervention';
  const action=document.createElement('select');action.name='action';for(const value of['SUSPEND_USER','ACTIVATE_USER','GRANT_ROLE','EXTEND_SUBSCRIPTION','RESET_RESUME_ENTITLEMENT']){const option=document.createElement('option');option.value=value;option.textContent=value;action.append(option);}
  const role=document.createElement('select');role.name='roleCode';for(const [value,label] of [['','Pilih role jika diperlukan'],['member','Member'],['cv_specialist','CV Specialist'],['resume_service_admin','Resume Service Admin'],['super_admin','Super Admin']]){const option=document.createElement('option');option.value=value;option.textContent=label;role.append(option);}
  const days=document.createElement('input');days.name='days';days.type='number';days.min='1';days.max='3650';days.placeholder='days jika diperlukan';
  const reason=document.createElement('textarea');reason.name='reason';reason.required=true;reason.minLength=10;reason.maxLength=1000;reason.placeholder='Alasan wajib (min. 10 karakter)';
  const submit=document.createElement('button');submit.type='submit';submit.className='dashboard-action';submit.textContent='Confirm intervention';
  for(const field of[action,role,days,reason,submit])field.classList.add('mt-3','block','w-full');
  form.append(formTitle,action,role,days,reason,submit);wrapper.append(form);content.replaceChildren(wrapper);status.textContent='Detail terotorisasi. Semua intervensi memerlukan recent authentication, CSRF, konfirmasi, dan alasan.';
  form.addEventListener('submit',async(event)=>{event.preventDefault();if(!window.confirm('Terapkan intervensi terkontrol dan tulis immutable audit event?'))return;const values=new FormData(form);submit.disabled=true;try{await admin.interveneUser(data.identity.publicId,{action:String(values.get('action')),reason:String(values.get('reason')),confirm:true,...(values.get('roleCode')?{roleCode:String(values.get('roleCode'))}:{}),...(values.get('days')?{days:Number(values.get('days'))}:{})});status.textContent='Intervensi berhasil dicatat.';}catch(error){handleError(error);}finally{submit.disabled=false;}});
}

function objectPanel(label,data){
  const panel=document.createElement('section'),heading=document.createElement('h2'),list=document.createElement('dl');panel.className='rounded-2xl border border-white/10 p-5';heading.className='text-xl font-black';heading.textContent=label;list.className='mt-3 space-y-2';
  for(const[key,value]of Object.entries(data)){if(!isSafeAdminField(key))continue;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.className='text-slate-400';dt.textContent=key;dd.textContent=format(value);row.append(dt,dd);list.append(row);}panel.append(heading,list);return panel;
}

function rowsPanel(label,rows){
  const panel=document.createElement('section'),heading=document.createElement('h2'),list=document.createElement('ul');panel.className='rounded-2xl border border-white/10 p-5';heading.className='text-xl font-black';heading.textContent=label;
  for(const row of rows){const item=document.createElement('li');item.className='mt-3 border-t border-white/10 pt-3 text-sm break-words';item.textContent=Object.entries(row).filter(([key])=>isSafeAdminField(key)).map(([key,value])=>`${key}: ${format(value)}`).join(' · ');list.append(item);}if(!rows.length){const empty=document.createElement('li');empty.className='mt-3';empty.textContent='Belum ada data.';list.append(empty);}panel.append(heading,list);return panel;
}

function format(value){
  if(value===null||value===undefined)return'—';
  if(typeof value==='object')return'Data terstruktur disembunyikan.';
  return String(value);
}

const forbiddenAdminFields=new Set(['id','internalId','internalNotes','storagePath','pastedResumeText','passwordHash','tokenHash','secret']);
function isSafeAdminField(key){
  if(['publicId','userPublicId','requestId','correlationId'].includes(key))return true;
  if(/(?:^id$|Id$|_id$)/.test(key))return false;
  return !forbiddenAdminFields.has(key)&&!/(?:token|hash|secret|password|credential|private.*path|storage.*path)/i.test(key);
}

function renderDashboard(data){
  const fragment=document.createDocumentFragment();
  const quickLinks=[['Feedback','/admin/feedback/'],['Mail Outbox','/admin/mail/'],['Resume Services','/admin/resume-services/'],['Users','/admin/users/'],['Kartu','/admin/cards/']];
  const quick=document.createElement('nav');quick.className='admin-quick-links';quick.setAttribute('aria-label','Akses cepat');
  for(const[label,href]of quickLinks){const link=document.createElement('a');link.className='dashboard-action';link.href=href;link.textContent=label;quick.append(link);}
  fragment.append(quick);
  const sections=[
    ['Perlu tindakan',[['Feedback baru','newFeedback'],['Email gagal','failedEmail'],['Mail queue','mailQueue'],['Subscription segera berakhir','expiringSubscriptions'],['User ditangguhkan','suspendedUsers'],['Resume belum ditugaskan','unassignedResumeRequests'],['Quality review queue','qualityReviewQueue'],['SLA jatuh tempo <24 jam','slaDueWithin24Hours'],['SLA terlewati','slaBreached']]],
    ['User dan subscription',[['Total user','totalUsers'],['User aktif','activeUsers'],['User terverifikasi','verifiedUsers'],['User belum terverifikasi','unverifiedUsers'],['Subscription aktif','activeSubscriptions']]],
    ['Kartu dan tier',[['Starter','starterUsers'],['Basic','basicUsers'],['Pro','proUsers']]],
    ['Resume Service',[['Request aktif','activeResumeRequests'],['Request baru','newResumeRequests'],['Menunggu informasi','waitingForInformation'],['Dalam pengerjaan','inProgressResumeRequests'],['Selesai hari ini','completedToday']]],
    ['Mail dan feedback',[['Mail queue','mailQueue'],['Email gagal','failedEmail'],['Feedback baru','newFeedback'],['Feedback ditinjau','feedbackInReview'],['Umur feedback baru tertua (jam)','oldestNewFeedbackHours']]],
  ];
  for(const[label,items]of sections)fragment.append(metricSection(label,items.map(([name,key])=>[name,data[key]])));
  content.replaceChildren(fragment);
  status.textContent='Command center memakai statistik operasional teragregasi; tidak ada secret atau isi resume yang ditampilkan.';
}

function metricSection(label,items){
  const section=document.createElement('section'),heading=document.createElement('h2'),grid=document.createElement('div');
  section.className='admin-metric-section';heading.className='text-xl font-black';heading.textContent=label;grid.className='admin-metric-grid';
  for(const[name,value]of items){const card=document.createElement('article'),caption=document.createElement('p'),number=document.createElement('p');card.className='admin-metric-card';caption.textContent=name;number.textContent=format(value);number.className='admin-metric-card__value';card.append(caption,number);grid.append(card);}
  section.append(heading,grid);return section;
}

async function updateFeedbackBadge(count){
  const value=count??(await admin.statistics()).newFeedback;
  const badge=document.querySelector('[data-feedback-badge]');
  if(!badge)return;
  badge.textContent=String(Number(value)||0);
  badge.hidden=!(Number(value)>0);
  badge.setAttribute('aria-label',`${badge.textContent} feedback baru`);
}

function feedbackFilters(){
  const params=new URLSearchParams(location.search);
  const page=Math.max(1,Number.parseInt(params.get('page')??'1',10)||1);
  const requestedLimit=Number.parseInt(params.get('limit')??'25',10)||25;
  return {
    page,
    limit:[25,50,100].includes(requestedLimit)?requestedLimit:25,
    status:params.get('status')??'new',
    search:(params.get('search')??'').slice(0,200),
    from:params.get('from')??'',
    to:params.get('to')??'',
  };
}

async function renderFeedback(){
  const filters=feedbackFilters(),filterForm=feedbackFilterForm(filters),results=document.createElement('div');
  results.className='admin-feedback-results';content.replaceChildren(filterForm,results);setLoading(results,'Memuat feedback...');
  try{
    const {items,meta}=await admin.feedback(filters);
    const list=document.createElement('div');list.className='admin-feedback-grid';
    if(items.length===0)list.append(emptyState('Belum ada feedback untuk filter ini.'));
    else for(const item of items)list.append(feedbackCard(item));
    results.replaceChildren(list,feedbackPagination(filters,meta));
    status.textContent=`${meta.total??items.length} feedback ditemukan. Halaman ${meta.page??filters.page} dari ${Math.max(1,meta.pages??1)}.`;
  }catch(error){results.replaceChildren(errorState(error));handleError(error,{render:false,announce:false});}
}

function feedbackFilterForm(filters){
  const form=document.createElement('form');form.className='admin-filter-form';form.method='get';
  form.append(labeledInput('Pencarian','search','search',filters.search,'Pesan, email, atau public ID'));
  const statusField=document.createElement('label'),statusLabel=document.createElement('span'),select=document.createElement('select');
  statusLabel.textContent='Status';select.name='status';
  for(const[value,label]of [['','Semua'],['new','Baru'],['in_review','Ditinjau'],['planned','Direncanakan'],['resolved','Selesai'],['dismissed','Ditolak']]){const option=document.createElement('option');option.value=value;option.textContent=label;option.selected=filters.status===value;select.append(option);}
  statusField.append(statusLabel,select);form.append(statusField,labeledInput('Dari','from','date',filters.from),labeledInput('Sampai','to','date',filters.to));
  const limitField=document.createElement('label'),limitLabel=document.createElement('span'),limit=document.createElement('select');limitLabel.textContent='Per halaman';limit.name='limit';
  for(const value of[25,50,100]){const option=document.createElement('option');option.value=String(value);option.textContent=String(value);option.selected=filters.limit===value;limit.append(option);}limitField.append(limitLabel,limit);form.append(limitField);
  const submit=document.createElement('button');submit.className='dashboard-action';submit.type='submit';submit.textContent='Terapkan filter';form.append(submit);
  form.addEventListener('submit',event=>{event.preventDefault();const params=new URLSearchParams(new FormData(form));params.set('page','1');for(const[key,value]of[...params])if(value==='')params.delete(key);location.assign(`${location.pathname}?${params}`);});
  return form;
}

function labeledInput(labelText,name,type,value,placeholder=''){
  const field=document.createElement('label'),label=document.createElement('span'),input=document.createElement('input');label.textContent=labelText;input.name=name;input.type=type;input.value=value;input.placeholder=placeholder;field.append(label,input);return field;
}

function feedbackCard(item){
  const card=document.createElement('article'),top=document.createElement('div'),identity=document.createElement('p'),badge=document.createElement('span'),message=document.createElement('p'),time=document.createElement('p'),form=document.createElement('form');
  card.className='admin-feedback-card';top.className='admin-feedback-card__top';identity.textContent=item.email??'Email tidak tersedia';badge.className='admin-status-badge';badge.textContent=item.status??'new';message.className='admin-feedback-card__message';message.textContent=item.message??'';time.className='admin-feedback-card__time';time.textContent=`Dikirim ${formatDateTime(item.submittedAt)} · Diperbarui ${formatDateTime(item.updatedAt)}`;top.append(identity,badge);
  form.className='admin-feedback-action';const select=document.createElement('select');select.name='status';
  for(const value of['new','in_review','planned','resolved','dismissed']){const option=document.createElement('option');option.value=value;option.textContent=value.replace('_',' ');option.selected=item.status===value;select.append(option);}
  const reason=document.createElement('textarea');reason.name='reason';reason.required=true;reason.minLength=10;reason.maxLength=1000;reason.placeholder='Alasan perubahan status (minimal 10 karakter)';
  const submit=document.createElement('button');submit.type='submit';submit.className='dashboard-action';submit.textContent='Ubah status';form.append(select,reason,submit);
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(submit.disabled)return;
    const reasonText=reason.value.trim(),nextStatus=select.value;
    if(reasonText.length<10){status.textContent='Alasan perubahan status minimal 10 karakter.';return;}
    if(!window.confirm(`Ubah status feedback menjadi ${nextStatus} dan catat alasan ini?`))return;
    submit.disabled=true;select.disabled=true;reason.disabled=true;
    try{await admin.updateFeedbackStatus(item.publicId,{status:nextStatus,reason:reasonText,confirm:true});status.textContent='Status feedback berhasil diperbarui.';await renderFeedback();await updateFeedbackBadge();}
    catch(error){handleError(error);}
    finally{submit.disabled=false;select.disabled=false;reason.disabled=false;}
  });
  card.append(top,message,time,form);return card;
}

function feedbackPagination(filters,meta){
  const nav=document.createElement('nav'),summary=document.createElement('span');nav.className='admin-pagination';nav.setAttribute('aria-label','Pagination feedback');
  const page=Math.max(1,Number(meta.page)||filters.page),pages=Math.max(1,Number(meta.pages)||1);summary.textContent=`Halaman ${page} dari ${pages}`;
  nav.append(pageLink('Sebelumnya',page-1,page<=1),summary,pageLink('Berikutnya',page+1,page>=pages));return nav;
}

function pageLink(label,page,disabled){
  const link=document.createElement('a');link.className='dashboard-action';link.textContent=label;
  if(disabled){link.setAttribute('aria-disabled','true');link.removeAttribute('href');return link;}
  const params=new URLSearchParams(location.search);params.set('page',String(page));link.href=`${location.pathname}?${params}`;return link;
}

function formatDateTime(value){
  if(!value)return'—';const date=new Date(value);if(Number.isNaN(date.getTime()))return'—';
  return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(date);
}

async function renderReports(){
  const allowed=[7,30,90,365],params=new URLSearchParams(location.search),requested=Number(params.get('days')??30),days=allowed.includes(requested)?requested:30;
  const form=document.createElement('form'),label=document.createElement('label'),caption=document.createElement('span'),select=document.createElement('select'),submit=document.createElement('button'),results=document.createElement('div');
  form.className='admin-report-period';caption.textContent='Periode laporan';select.name='days';
  for(const value of allowed){const option=document.createElement('option');option.value=String(value);option.textContent=`${value} hari`;option.selected=value===days;select.append(option);}
  submit.type='submit';submit.className='dashboard-action';submit.textContent='Tampilkan';label.append(caption,select);form.append(label,submit);content.replaceChildren(form,results);setLoading(results,'Memuat reports...');
  form.addEventListener('submit',event=>{event.preventDefault();location.assign(`${location.pathname}?days=${encodeURIComponent(select.value)}`);});
  try{const data=await admin.reports(days);results.replaceChildren(
    seriesPanel('Registrasi user',data.userRegistrations,['date','count']),
    seriesPanel('Feedback per status',data.feedbackByStatus,['status','count']),
    seriesPanel('Subscription per tier',data.subscriptionsByTier,['tier','count']),
    seriesPanel('Mail per status',data.mailByStatus,['status','count']),
    seriesPanel('Resume per status',data.resumeByStatus,['status','count']),
  );status.textContent=`Laporan agregat ${days} hari.`;}catch(error){results.replaceChildren(errorState(error));handleError(error,{render:false,announce:false});}
}

function seriesPanel(label,rows,keys){
  const section=document.createElement('section'),heading=document.createElement('h2'),list=document.createElement('dl');section.className='admin-series-panel';heading.className='text-xl font-black';heading.textContent=label;
  if(!Array.isArray(rows)||rows.length===0)return emptySection(section,heading,'Belum ada data pada periode ini.');
  for(const row of rows){const line=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');line.className='admin-series-row';term.textContent=format(row[keys[0]]);value.textContent=format(row[keys[1]]);line.append(term,value);list.append(line);}section.append(heading,list);return section;
}

function renderSystem(data){
  const fields=[['Database',data.database],['Latency database (ms)',data.databaseLatencyMs],['Mail queued',data.queuedMail],['Mail processing',data.processingMail],['Mail gagal',data.failedMail],['Resume aktif',data.activeResumeRequests],['Feedback terbuka',data.openFeedback],['Runtime',data.runtimeVersion]];
  content.replaceChildren(metricSection('System health',fields));status.textContent=`Snapshot sistem: ${formatDateTime(data.generatedAt)}.`;
}

function renderSecurity(data){
  const summary=data.summary??{},fragment=document.createDocumentFragment();
  fragment.append(metricSection('Ringkasan keamanan',[
    ['Session aktif',summary.activeSessions],['Session dicabut 24 jam',summary.revokedSessions24Hours],['Rate-limit bucket aktif',summary.activeRateLimitBuckets],['Reset password tertunda',summary.pendingPasswordResets],['OTP tertunda',summary.pendingOtps],['User belum terverifikasi',summary.unverifiedUsers],['User ditangguhkan',summary.suspendedUsers],
  ]));
  fragment.append(securityRateLimits(data.rateLimits??[]),securityEvents(data.events??[]));content.replaceChildren(fragment);status.textContent='Event keamanan tersanitasi; token, hash, internal ID, dan private path tidak dirender.';
}

function securityRateLimits(rows){
  const section=document.createElement('section'),heading=document.createElement('h2');section.className='admin-series-panel';heading.className='text-xl font-black';heading.textContent='Ringkasan rate limit';
  if(!rows.length)return emptySection(section,heading,'Tidak ada bucket aktif.');
  const list=document.createElement('dl');for(const row of rows){const line=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');line.className='admin-series-row';term.textContent=String(row.action??'unknown');value.textContent=`${format(row.buckets)} bucket · ${format(row.hits)} hit · terakhir ${formatDateTime(row.latestAt)}`;line.append(term,value);list.append(line);}section.append(heading,list);return section;
}

function securityEvents(rows){
  const section=document.createElement('section'),heading=document.createElement('h2'),list=document.createElement('ul');section.className='admin-series-panel';heading.className='text-xl font-black';heading.textContent='Security events terbaru';
  if(!rows.length)return emptySection(section,heading,'Belum ada event.');
  for(const row of rows){const item=document.createElement('li');item.className='admin-security-event';item.textContent=`${row.event??'Event'} · ${row.actorEmail??'aktor tersanitasi'} · ${formatDateTime(row.createdAt)}`;list.append(item);}section.append(heading,list);return section;
}

function setLoading(target,message){
  const state=document.createElement('p');state.className='admin-state';state.dataset.state='loading';state.textContent=message;target.replaceChildren(state);
}

function emptyState(message){
  const state=document.createElement('p');state.className='admin-state';state.dataset.state='empty';state.textContent=message;return state;
}

function errorState(error){
  const state=document.createElement('div'),heading=document.createElement('h2'),message=document.createElement('p');state.className='admin-state admin-state--error';state.dataset.state='error';state.setAttribute('role','alert');heading.textContent='Data tidak dapat dimuat';message.textContent=errorMessage(error);state.append(heading,message);return state;
}

function emptySection(section,heading,message){
  section.append(heading,emptyState(message));return section;
}

const errorMessages={
  CSRF_INVALID:'Sesi keamanan tidak sinkron. Muat ulang halaman, lalu coba kembali.',
  FEEDBACK_STATUS_UNCHANGED:'Status feedback tidak berubah. Pilih status lain.',
  CARD_ALREADY_CONNECTED:'Kartu sudah terhubung ke akun.',
  CARD_NOT_CONNECTED:'Kartu belum terhubung ke akun.',
  MATCHING_VERIFIED_ACCOUNT_NOT_FOUND:'Akun terverifikasi dengan email yang sama tidak ditemukan.',
  PLAN_LIMIT_REACHED:'Batas kartu pada paket akun tujuan sudah tercapai.',
};

function errorMessage(error){
  if(errorMessages[error?.code])return errorMessages[error.code];
  if(error?.status===404&&operationalRouteViews.has(view))return'Endpoint operasional belum tersedia pada backend production. Pastikan backend sudah diperbarui dan aplikasi Node.js telah direstart.';
  if(error?.status===404)return'Data admin yang diminta tidak ditemukan.';
  if(error?.status===403)return'Akun ini tidak memiliki izin untuk operasi tersebut.';
  if(error?.status===409)return'Konflik data terdeteksi. Muat ulang dan periksa status terbaru.';
  if(error?.status===422)return'Data tidak valid. Periksa field dan alasan yang diisi.';
  if((error?.status??0)>=500)return'Layanan admin sedang bermasalah. Coba kembali beberapa saat lagi.';
  return error?.message??'Permintaan tidak dapat diproses.';
}

function handleError(error,{render=true,announce=true}={}){
  if(error.status===401){location.replace('/login/');return;}
  if(error?.status===403&&error?.code==='RECENT_AUTH_REQUIRED'){
    const wrapper=document.createElement('div'),message=document.createElement('p'),link=document.createElement('a');wrapper.className='admin-state admin-state--error';message.textContent='Autentikasi terbaru diperlukan untuk operasi sensitif ini. Silakan login ulang.';link.className='dashboard-action';link.textContent='Login ulang';link.href=`/login/?returnTo=${encodeURIComponent(location.pathname+location.search)}`;wrapper.append(message,link);if(render)content.replaceChildren(wrapper);status.textContent='RECENT_AUTH_REQUIRED: login ulang diperlukan.';return;
  }
  if(announce)status.textContent=errorMessage(error);
  if(render)content.replaceChildren(errorState(error));
}
