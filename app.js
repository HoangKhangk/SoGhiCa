import {STORAGE_KEY,defaults,money,hoursText,localDate,duration,normalizeTimeInput,timeMinutes,endTime,basePay,totalPay,validateShift,validateData,summarize,shiftsInMonth,makeCSV,demoShifts} from './core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const storageKey = `${STORAGE_KEY}:${new URL('.', location.href).pathname}`;
let data = defaults();
let storageBroken = false;
let month = localDate().slice(0,7);
let job = 'cafe';
let filter = 'all';
let editingId = null;
let demo = false;
let minutes = 240;
let dirty = false;
let deferredInstall = null;
let waitingWorker = null;
let toastTimeout;

function toast(message, error = false) {
  clearTimeout(toastTimeout);
  $('#toast').textContent=message;
  $('#toast').classList.toggle('error',error);
  $('#toast').hidden=false;
  toastTimeout=setTimeout(()=>$('#toast').hidden=true,error?7000:4200);
}
function showStorageError(message) {
  storageBroken=true;
  $('#storage-warning').textContent=message;
  $('#storage-warning').hidden=false;
}
function readData() {
  const raw=localStorage.getItem(storageKey);
  return raw===null?defaults():validateData(JSON.parse(raw));
}
try { data=readData(); } catch {
  showStorageError('Không đọc được dữ liệu đã lưu. Sổ cũ vẫn được giữ nguyên. Vào Góc cá nhân để tải dữ liệu hiện có hoặc nhập lại bản sao lưu.');
}
function persist(change, recovery=false) {
  if (storageBroken&&!recovery) throw new Error('Chưa thể lưu. Hãy kiểm tra quyền lưu dữ liệu của trình duyệt hoặc nhập bản sao lưu trong Góc cá nhân.');
  let next;
  try {
    const current=recovery?data:readData();
    next=validateData(change(current));
    localStorage.setItem(storageKey,JSON.stringify(next));
  } catch(error) {
    if (error instanceof SyntaxError) throw new Error('Dữ liệu hiện có không đọc được. Hãy tải bản sao lưu trước khi tiếp tục.');
    if (error.name==='QuotaExceededError'||error.name==='SecurityError') throw new Error('Thiết bị chưa lưu được dữ liệu. Hãy kiểm tra dung lượng và quyền lưu của trình duyệt. Nội dung vừa nhập vẫn được giữ lại.');
    throw error;
  }
  data=next;
  storageBroken=false;
  $('#storage-warning').hidden=true;
  render();
}
const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const escape = value => String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function currentShifts() { return shiftsInMonth(demo?demoShifts(month):data.shifts,month); }
function visibleShifts() { return currentShifts().filter(s=>filter==='all'||s.job===filter); }
function setMonth(value) {
  if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(value)) return;
  month=value; render();
}
function moveMonth(offset) {
  const [year,m]=month.split('-').map(Number);
  const date=new Date(year,m-1+offset,1);
  setMonth(localDate(date).slice(0,7));
}
function render() {
  const [year,m]=month.split('-');
  $('#month-title').textContent=`Tháng ${Number(m)} / ${year}`;
  $('#month-input').value=month;
  $('#previous-month').disabled=month==='2000-01';
  $('#next-month').disabled=month==='2100-12';
  $('#income-month').textContent=`THÁNG ${Number(m)}`;
  const summary=summarize(currentShifts());
  $('#total-income').textContent=money(summary.income);
  $('#total-hours').textContent=hoursText(summary.minutes);
  $('#total-days').textContent=summary.dates.size;
  $('#profile-name').textContent=data.profile.name;
  $('#profile-subtitle').textContent=data.profile.subtitle||'Chăm chỉ mỗi ngày';
  $('#profile-avatar').textContent=data.profile.name.trim().split(/\s+/).slice(-2).map(s=>Array.from(s)[0]).join('').toLocaleUpperCase('vi');
  $('#cafe-label').textContent=`Quán Cafe (${compactRate(data.jobs.cafe.rate)}/h)`;
  $('#tutor-label').textContent=`Gia sư (${compactRate(data.jobs.tutor.rate)}/h)`;
  $('#demo-notice').hidden=!demo;
  $$('.journal-filters button').forEach(button=>{const selected=button.dataset.filter===filter;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  const shifts=visibleShifts();
  $('#journal-count').textContent=shifts.length?`${shifts.length} ca làm · Tháng ${Number(m)}/${year}`:'';
  $('#export-csv').disabled=!shifts.length;
  if (!shifts.length) {
    const isFiltered=filter!=='all';
    $('#shift-list').innerHTML=`<div class="empty-state"><div class="empty-icon">${icon('book')}</div><h3>${isFiltered?'Chưa có ca cho công việc này':'Mỗi ngày làm, một dòng ghi nhớ'}</h3><p>${isFiltered?'Chọn “Tất cả” để xem các công việc còn lại.':`Tháng ${Number(m)} chưa có ca nào. Ghi ca đầu tiên để bắt đầu theo dõi thu nhập của bạn nhé.`}</p><button type="button" class="text-button" id="empty-action">${isFiltered?'Xem tất cả công việc':'Xem thử với dữ liệu mẫu'}</button></div>`;
    $('#empty-action').addEventListener('click',()=>{if(isFiltered){filter='all';render();}else{showDemo();}});
    return;
  }
  $('#shift-list').innerHTML=shifts.map(shift=>{
    const date=new Date(`${shift.date}T12:00:00`);
    const weekday=date.getDay()===0?'CN':`T${date.getDay()+1}`;
    const overnight=timeMinutes(shift.start)+shift.minutes>=1440;
    const period=timeMinutes(shift.start)<720?'Ca sáng':timeMinutes(shift.start)<1080?'Ca chiều':'Ca tối';
    const description=shift.tip?`Lương ${money(basePay(shift))}đ + Tip ${money(shift.tip)}đ`:`${money(shift.rate)}đ / giờ`;
    return `<article class="shift-card" data-id="${escape(shift.id)}"><div class="date-tile" aria-label="${escape(shift.date)}"><span>${weekday}</span><strong>${Number(shift.date.slice(-2))}</strong></div><div class="shift-details"><div class="shift-topline"><h3>${escape(shift.workplace)}</h3><span class="time-tag">${shift.start} – ${shift.end}${overnight?' (+1 ngày)':''} (${hoursText(shift.minutes)} tiếng)</span></div><p class="shift-description">${icon('clock')}<span>${period} · ${description}</span></p></div><div class="shift-money"><strong>${money(totalPay(shift))}₫</strong><p class="${shift.tip?'has-tip':''}">${shift.tip?`<span>✦</span> +${compactRate(shift.tip)} tiền tip`:shift.job==='tutor'?'Dạy kèm 1–1':period}</p></div><div class="shift-actions"><button type="button" class="icon-button edit-shift" aria-label="Sửa ca ngày ${shift.date}" ${demo?'disabled title="Dữ liệu mẫu chỉ để xem"':''}>${icon('edit')}</button><button type="button" class="icon-button delete-shift" aria-label="Xóa ca ngày ${shift.date}" ${demo?'disabled title="Dữ liệu mẫu chỉ để xem"':''}>${icon('trash')}</button></div></article>`;
  }).join('');
}
function compactRate(value) { return value>=1000&&value%1000===0?`${money(value/1000)}k`:`${money(value)}đ`; }
function selectJob(id,fill=true) {
  job=id;
  $$('#job-picker button').forEach(button=>{const selected=button.dataset.job===job;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  if(fill){$('#workplace').value=data.jobs[job].name;$('#hourly-rate').value=data.jobs[job].rate;}
  updateEstimate();
}
function updateEstimate() {
  const rate=Number($('#hourly-rate').value), tip=Number($('#shift-tip').value);
  const start=normalizeTimeInput($('#start-time').value), end=normalizeTimeInput($('#end-time').value);
  const valid=Number.isInteger(minutes)&&minutes>0&&minutes<=1440&&Number.isFinite(rate)&&rate>=0&&Number.isFinite(tip)&&tip>=0&&start!==null&&end!==null&&endTime(start,minutes)===end;
  const hours=valid?hoursText(minutes):'—';
  $('#duration-label').textContent=`${hours} giờ`;
  $('#auto-description').textContent=`Tự động tính: ${hours} tiếng`;
  let nextDay=false;
  try {nextDay=valid&&timeMinutes(start)+minutes>=1440;}catch{}
  $('#time-description').textContent=`Từ ${start||'—'} đến ${end||'—'}${nextDay?' (hôm sau)':''}`;
  $('#estimate-formula').textContent=valid?`(${hours}h × ${money(rate)}đ${tip?` + ${money(tip)}đ tip`:''})`:'Nhập đủ giờ làm và đơn giá';
  $('#estimated-pay').textContent=valid?`${money(Math.round(minutes*rate/60)+tip)}₫`:'—';
  $$('.hour-presets button').forEach(button=>{const selected=minutes===Number(button.dataset.hours)*60;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
}
function syncTimes() {
  try {minutes=duration(normalizeTimeInput($('#start-time').value),normalizeTimeInput($('#end-time').value));}catch{minutes=0;}
  $('#manual-hours').value=minutes?Number((minutes/60).toFixed(6)):'';
  updateEstimate();
}
function setHours(hours,normalize=true) {
  minutes=Math.round(Number(hours)*60);
  try {if(minutes>=1&&minutes<=1440) $('#end-time').value=endTime(normalizeTimeInput($('#start-time').value),minutes);}catch{}
  if(normalize) $('#manual-hours').value=Number((minutes/60).toFixed(6));
  updateEstimate();
}
function resetForm(keepDate=true) {
  const date=$('#shift-date').value;
  $('#shift-form').reset();
  $('#shift-date').value=keepDate&&date?date:localDate();
  editingId=null;minutes=240;dirty=false;
  $('#form-title').textContent='Ghi nhanh ca làm';
  $('#save-label').textContent='Lưu ngày làm này';
  $('#cancel-edit').hidden=true;
  $('#form-error').hidden=true;
  selectJob(job);
}
function showDemo() {demo=true;filter='all';render();$('#journal-title').scrollIntoView({behavior:'smooth',block:'center'});}
function download(content,filename,type) {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
async function confirmAction(title,message,label='Xác nhận',danger=false) {
  $('#confirm-title').textContent=title;$('#confirm-message').textContent=message;$('#confirm-accept').textContent=label;
  $('#confirm-accept').className=danger?'danger-button':'primary-button';
  const dialog=$('#confirm-dialog');dialog.returnValue='cancel';dialog.showModal();$('#confirm-cancel').focus();
  return new Promise(resolve=>dialog.addEventListener('close',()=>resolve(dialog.returnValue==='accept'),{once:true}));
}
function openSettings() {
  $('#setting-name').value=data.profile.name;$('#setting-subtitle').value=data.profile.subtitle;
  for(const id of ['cafe','tutor']){$(`#setting-${id}-name`).value=data.jobs[id].name;$(`#setting-${id}-rate`).value=data.jobs[id].rate;}
  $('#settings-error').hidden=true;$('#settings-dialog').showModal();
}
$('#previous-month').addEventListener('click',()=>moveMonth(-1));
$('#next-month').addEventListener('click',()=>moveMonth(1));
$('#month-input').addEventListener('change',event=>setMonth(event.target.value));
$('#today-button').addEventListener('click',()=>{$('#shift-date').value=localDate();dirty=true;});
$('#exit-demo').addEventListener('click',()=>{demo=false;render();});
$('#job-picker').addEventListener('click',event=>{const button=event.target.closest('[data-job]');if(button){selectJob(button.dataset.job);dirty=true;}});
$('.hour-presets').addEventListener('click',event=>{const button=event.target.closest('[data-hours]');if(button){setHours(Number(button.dataset.hours));dirty=true;}});
for(const id of ['start-time','end-time']) {
  const input=$(`#${id}`);
  input.addEventListener('input',syncTimes);
  input.addEventListener('blur',()=>{
    const normalized=normalizeTimeInput(input.value);
    if(normalized!==null)input.value=normalized;
    // Formatting alone must preserve a manually entered or saved 24-hour shift.
    updateEstimate();
  });
}
$('#manual-hours').addEventListener('input',event=>setHours(event.target.value,false));
for(const id of ['hourly-rate','shift-tip']) $(`#${id}`).addEventListener('input',updateEstimate);
$('#shift-form').addEventListener('input',()=>{dirty=true;$('#form-error').hidden=true;});
$('#shift-form').addEventListener('submit',event=>{
  event.preventDefault();
  try {
    const wasEditing=Boolean(editingId);
    for(const id of ['start-time','end-time']) {
      const normalized=normalizeTimeInput($(`#${id}`).value);
      if(normalized===null)throw new Error('Nhập giờ từ 00:00 đến 23:59, ví dụ 8:30 hoặc 1830.');
      $(`#${id}`).value=normalized;
    }
    const shift=validateShift({id:editingId||(globalThis.crypto?.randomUUID?.()??`shift-${Date.now()}-${Math.random().toString(36).slice(2,10)}`),date:$('#shift-date').value,job,workplace:$('#workplace').value,start:$('#start-time').value,end:$('#end-time').value,minutes,rate:Number($('#hourly-rate').value),tip:Number($('#shift-tip').value)});
    persist(current=>{
      if(editingId&&!current.shifts.some(s=>s.id===editingId)) throw new Error('Ca này đã bị xóa ở cửa sổ khác. Hủy chỉnh sửa rồi tạo ca mới.');
      const shifts=editingId?current.shifts.map(s=>s.id===editingId?shift:s):[...current.shifts,shift];
      return {...current,shifts};
    });
    demo=false;month=shift.date.slice(0,7);filter='all';resetForm();render();
    toast(wasEditing?'Đã cập nhật ca làm.':'Đã lưu ca làm. Thêm một ngày chăm chỉ!');
    navigator.storage?.persist?.().catch(()=>{});
  }catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;}
});
$('#cancel-edit').addEventListener('click',async()=>{
  if(dirty&&!await confirmAction('Hủy thay đổi?','Những thay đổi chưa lưu của ca này sẽ được bỏ qua.','Hủy thay đổi'))return;
  resetForm();
});
$('#shift-list').addEventListener('click',async event=>{
  const button=event.target.closest('.edit-shift,.delete-shift');
  if(!button||demo)return;
  const id=button.closest('[data-id]').dataset.id;
  const shift=data.shifts.find(s=>s.id===id);if(!shift)return;
  if(button.classList.contains('delete-shift')){
    const date=shift.date.split('-').reverse().join('/');
    if(!await confirmAction('Xóa ca làm này?',`Ca ${shift.workplace} ngày ${date}, tổng ${money(totalPay(shift))}đ, sẽ được xóa khỏi sổ.`,'Xóa ca làm',true))return;
    try{persist(current=>({...current,shifts:current.shifts.filter(s=>s.id!==id)}));if(editingId===id)resetForm();toast('Đã xóa ca làm.');}catch(error){toast(error.message,true);}return;
  }
  if(dirty&&!await confirmAction('Chuyển sang sửa ca?','Nội dung đang nhập chưa được lưu. Tiếp tục để mở ca đã chọn.','Mở ca đã chọn'))return;
  editingId=id;selectJob(shift.job,false);minutes=shift.minutes;
  $('#shift-date').value=shift.date;$('#workplace').value=shift.workplace;$('#start-time').value=shift.start;$('#end-time').value=shift.end;$('#manual-hours').value=Number((minutes/60).toFixed(6));$('#hourly-rate').value=shift.rate;$('#shift-tip').value=shift.tip;
  $('#form-title').textContent='Chỉnh sửa ca làm';$('#save-label').textContent='Lưu thay đổi';$('#cancel-edit').hidden=false;$('#form-error').hidden=true;dirty=false;updateEstimate();
  $('#form-heading').scrollIntoView({behavior:'smooth',block:'start'});$('#workplace').focus({preventScroll:true});
});
$('.journal-filters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(button){filter=button.dataset.filter;render();}});
$('#export-csv').addEventListener('click',()=>download(makeCSV(visibleShifts()),`so-ghi-ca-${month}${demo?'-mau':''}.csv`,'text/csv;charset=utf-8'));
$('#open-settings').addEventListener('click',openSettings);
$('#backup-shortcut').addEventListener('click',()=>{openSettings();$('.backup-section').scrollIntoView({block:'nearest'});});
$$('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close('cancel')));
$('#confirm-cancel').addEventListener('click',()=>$('#confirm-dialog').close('cancel'));
$('#confirm-accept').addEventListener('click',()=>$('#confirm-dialog').close('accept'));
$('#settings-form').addEventListener('submit',event=>{
  event.preventDefault();
  try {
    persist(current=>({...current,profile:{name:$('#setting-name').value,subtitle:$('#setting-subtitle').value},jobs:{cafe:{name:$('#setting-cafe-name').value,rate:Number($('#setting-cafe-rate').value)},tutor:{name:$('#setting-tutor-name').value,rate:Number($('#setting-tutor-rate').value)}}}));
    if(!dirty&&!editingId)selectJob(job);
    $('#settings-dialog').close();toast('Đã lưu góc cá nhân của bạn.');
  }catch(error){$('#settings-error').textContent=error.message;$('#settings-error').hidden=false;}
});
$('#export-backup').addEventListener('click',()=>{
  try {
    const raw=storageBroken?localStorage.getItem(storageKey):JSON.stringify({...readData(),exportedAt:new Date().toISOString()},null,2);
    if(!raw)throw new Error('Chưa có dữ liệu đã lưu để xuất.');
    download(raw,`so-ghi-ca-${storageBroken?'khoi-phuc-':''}${localDate()}.json`,'application/json');
    toast('Đã chuẩn bị bản sao lưu. Hãy lưu tệp vào nơi an toàn.');
  }catch(error){toast(error.message,true);}
});
$('#import-backup').addEventListener('click',()=>$('#backup-file').click());
$('#backup-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try {
    if(file.size>10*1024*1024)throw new Error('Bản sao lưu quá lớn. Vui lòng chọn tệp nhỏ hơn 10 MB.');
    let imported;try{imported=validateData(JSON.parse(await file.text()));}catch{throw new Error('Tệp không hợp lệ hoặc bị hỏng. Dữ liệu hiện tại chưa thay đổi.');}
    $('#settings-dialog').close();
    if(!await confirmAction('Khôi phục bản sao lưu?',`Tệp có ${imported.shifts.length} ca làm của ${imported.profile.name}. Nhập tệp sẽ thay thế toàn bộ ca và cài đặt hiện tại${dirty?', đồng thời bỏ nội dung chưa lưu':''}. Hãy tải bản sao lưu hiện tại trước nếu cần giữ lại.`,'Khôi phục'))return;
    persist(()=>imported,true);demo=false;filter='all';resetForm(false);render();toast(`Đã khôi phục ${imported.shifts.length} ca làm.`);
  }catch(error){toast(error.message,true);}
});
$('#show-demo').addEventListener('click',()=>{$('#settings-dialog').close();showDemo();});
window.addEventListener('storage',event=>{
  if(event.key!==storageKey&&event.key!==null)return;
  try{data=readData();storageBroken=false;$('#storage-warning').hidden=true;render();}catch{showStorageError('Dữ liệu đã đổi ở cửa sổ khác nhưng không thể đọc được. Hãy kiểm tra bản sao lưu trước khi tiếp tục.');}
});
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});

$('#open-install').addEventListener('click',()=>$('#install-dialog').showModal());
const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
$('#installed-message').hidden=!standalone;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;$('#native-install').hidden=false;});
$('#native-install').addEventListener('click',async()=>{
  if(!deferredInstall)return;
  try{await deferredInstall.prompt();await deferredInstall.userChoice;}catch{toast('Hãy dùng menu trình duyệt để thêm ứng dụng vào màn hình chính.');}
  deferredInstall=null;$('#native-install').hidden=true;
});
window.addEventListener('appinstalled',()=>{deferredInstall=null;$('#native-install').hidden=true;$('#installed-message').hidden=false;toast('Đã cài Sổ Ghi Ca lên màn hình chính.');});
function updateOfflineStatus(ready=false) {
  $('#local-status').innerHTML=icon('check')+(navigator.onLine?'Dữ liệu lưu trên thiết bị này':'Đang ngoại tuyến · Vẫn ghi ca bình thường');
  if(ready)$('#offline-status').textContent='Đã sẵn sàng dùng ngoại tuyến. Bạn có thể ghi ca ngay cả khi không có mạng.';
}
window.addEventListener('online',()=>updateOfflineStatus());window.addEventListener('offline',()=>updateOfflineStatus());
$('#dismiss-update').addEventListener('click',()=>$('#update-notice').hidden=true);
$('#apply-update').addEventListener('click',async()=>{
  if(dirty&&!await confirmAction('Cập nhật ứng dụng?','Ca đang nhập chưa được lưu. Cập nhật sẽ tải lại trang và bỏ phần đang nhập. Bạn có thể hủy để lưu trước.','Cập nhật'))return;
  dirty=false;waitingWorker?.postMessage({type:'SKIP_WAITING'});
});
if('serviceWorker' in navigator&&window.isSecureContext){
  window.addEventListener('load',async()=>{
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});
      const showUpdate=()=>{waitingWorker=registration.waiting;if(waitingWorker)$('#update-notice').hidden=false;};
      showUpdate();
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'){if(navigator.serviceWorker.controller)showUpdate();else updateOfflineStatus(true);}});
      });
      await navigator.serviceWorker.ready;updateOfflineStatus(true);
    }catch{$('#offline-status').textContent='Chưa tải đủ ứng dụng để dùng ngoại tuyến. Hãy mở lại khi có mạng; ca đã lưu vẫn ở trên thiết bị.';}
  });
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(waitingWorker&&!refreshing){
      if(dirty){$('#update-notice').hidden=true;toast('Ứng dụng đã cập nhật ở cửa sổ khác. Hãy lưu ca đang nhập rồi mở lại sổ.');return;}
      refreshing=true;location.reload();
    }
  });
}else{$('#offline-status').textContent='Cần mở sổ qua đường dẫn HTTPS (ví dụ GitHub Pages) để cài đặt và dùng ngoại tuyến.';}

// Optional browser agent access: use the same read-only summary as the visible page.
if(document.modelContext?.registerTool){
  try{Promise.resolve(document.modelContext.registerTool({name:'read_shift_summary',description:'Read the currently displayed month and its shift totals. Demo state is explicitly included.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(!input||typeof input!=='object'||Object.keys(input).length)throw new Error('Expected an empty object.');const s=summarize(currentShifts());return {month,demo,shiftCount:currentShifts().length,minutes:s.minutes,days:s.dates.size,incomeVND:s.income};}})).catch(()=>{});}catch{}
}
resetForm(false);render();updateOfflineStatus();
