export const STORAGE_KEY = 'soghica.data.v1';
export const MAX_MONEY = 1_000_000_000;
export const defaults = () => ({version:1, profile:{name:'Bạn', subtitle:'Chăm chỉ mỗi ngày'}, jobs:{cafe:{name:'Quán The Coffee House', rate:25000}, tutor:{name:'Gia sư Tiếng Anh IELTS', rate:120000}}, shifts:[]});
export const number = new Intl.NumberFormat('vi-VN', {maximumFractionDigits:2});
export const money = value => new Intl.NumberFormat('vi-VN', {maximumFractionDigits:0}).format(value);
export const hoursText = minutes => number.format(minutes / 60);
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function validDate(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$|^2100-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}
export function normalizeTimeInput(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  let hours, minutes;
  if (/^\d{1,2}$/.test(text)) { hours = Number(text); minutes = 0; }
  else if (/^\d{3,4}$/.test(text)) { hours = Number(text.slice(0,-2)); minutes = Number(text.slice(-2)); }
  else {
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    hours = Number(match[1]); minutes = Number(match[2]);
  }
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}
export function timeMinutes(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Vui lòng nhập giờ hợp lệ.');
  const [h,m] = time.split(':').map(Number); return h*60+m;
}
export function duration(start,end) { return (timeMinutes(end)-timeMinutes(start)+1440)%1440; }
export function endTime(start, minutes) { const total=(timeMinutes(start)+minutes)%1440; return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`; }
export const basePay = shift => Math.round(shift.minutes * shift.rate / 60);
export function afterMidnightMinutes(shift) {
  const start=timeMinutes(shift.start), end=start+shift.minutes;
  // Count the 00:00–06:00 night window on the starting day and, for an
  // overnight shift, on the following day as well.
  const overlap=(from,to)=>Math.max(0,Math.min(end,to)-Math.max(start,from));
  return overlap(0,360)+overlap(1440,1800);
}
export const lateBonusPay = shift => Math.round(afterMidnightMinutes(shift)*shift.rate/120);
export const totalPay = shift => basePay(shift)+lateBonusPay(shift)+shift.tip;
export function validateShift(input) {
  if (!input || typeof input !== 'object') throw new Error('Ca làm không hợp lệ.');
  if (typeof input.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.id)) throw new Error('Mã ca làm không hợp lệ.');
  if (!validDate(input.date)) throw new Error('Chọn ngày làm hợp lệ từ năm 2000 đến 2100.');
  if (!['cafe','tutor'].includes(input.job)) throw new Error('Chọn công việc cho ca làm.');
  if (typeof input.workplace !== 'string' || !input.workplace.trim() || input.workplace.length>80) throw new Error('Tên nơi làm việc cần có từ 1 đến 80 ký tự.');
  timeMinutes(input.start); timeMinutes(input.end);
  if (!Number.isInteger(input.minutes) || input.minutes<1 || input.minutes>1440) throw new Error('Số giờ làm phải từ 1 phút đến 24 giờ.');
  if (endTime(input.start,input.minutes)!==input.end) throw new Error('Số giờ làm không khớp giờ bắt đầu và kết thúc.');
  for (const key of ['rate','tip']) if (!Number.isSafeInteger(input[key]) || input[key]<0 || input[key]>MAX_MONEY) throw new Error('Lương và tip phải là số tiền nguyên từ 0 đến 1 tỷ đồng.');
  return {id:input.id,date:input.date,job:input.job,workplace:input.workplace.trim(),start:input.start,end:input.end,minutes:input.minutes,rate:input.rate,tip:input.tip};
}
export function validateData(input) {
  if (!input || input.version!==1 || !Array.isArray(input.shifts) || input.shifts.length>30000) throw new Error('Tệp không phải bản sao lưu Sổ Ghi Ca phiên bản được hỗ trợ.');
  if (!input.profile || typeof input.profile.name!=='string' || !input.profile.name.trim() || input.profile.name.length>40 || typeof input.profile.subtitle!=='string' || input.profile.subtitle.length>60) throw new Error('Thông tin cá nhân trong bản sao lưu không hợp lệ.');
  const data=defaults(); data.profile={name:input.profile.name.trim(),subtitle:input.profile.subtitle.trim()};
  for (const id of ['cafe','tutor']) {
    const job=input.jobs?.[id];
    if (!job || typeof job.name!=='string' || !job.name.trim() || job.name.length>80 || !Number.isSafeInteger(job.rate) || job.rate<0 || job.rate>MAX_MONEY) throw new Error('Thông tin công việc trong bản sao lưu không hợp lệ.');
    data.jobs[id]={name:job.name.trim(),rate:job.rate};
  }
  data.shifts=input.shifts.map(validateShift);
  if (new Set(data.shifts.map(s=>s.id)).size!==data.shifts.length) throw new Error('Bản sao lưu có mã ca làm trùng nhau.');
  return data;
}
export function summarize(shifts) { return shifts.reduce((sum,s)=>{sum.income+=totalPay(s);sum.minutes+=s.minutes;sum.dates.add(s.date);return sum;},{income:0,minutes:0,dates:new Set()}); }
export function moveMonthKey(month, offset) {
  const [year,value] = month.split('-').map(Number);
  const date = new Date(year,value-1+offset,1,12);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
}
export function payrollMonthForDate(date) { return Number(date.slice(-2))>=26?moveMonthKey(date.slice(0,7),1):date.slice(0,7); }
export function payrollPeriod(month) { return {start:`${moveMonthKey(month,-1)}-26`,end:`${month}-25`}; }
export function shiftsInMonth(shifts,month) {
  const {start,end}=payrollPeriod(month);
  return shifts.filter(s=>s.date>=start&&s.date<=end).sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start)||a.id.localeCompare(b.id));
}
function csvCell(value) { let text=String(value); if (/^[\s]*[=+\-@\t\r]/.test(text)) text="'"+text; return `"${text.replaceAll('"','""')}"`; }
export function makeCSV(shifts) { const rows=[['Ngày làm','Công việc','Nơi làm việc','Giờ bắt đầu','Giờ kết thúc','Số phút','Số giờ','Lương/giờ (VND)','Lương ca (VND)','Phút sau 0h','Phụ cấp sau 0h 50% (VND)','Tip (VND)','Tổng tiền (VND)'],...shifts.map(s=>[s.date,s.job==='cafe'?'Quán Cafe':'Gia sư',s.workplace,s.start,s.end,s.minutes,s.minutes/60,s.rate,basePay(s),afterMidnightMinutes(s),lateBonusPay(s),s.tip,totalPay(s)])]; return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n'); }
export function demoShifts(month) {
  const previous=moveMonthKey(month,-1);
  return [
    {id:'demo-26',date:`${previous}-26`,job:'cafe',workplace:'Quán The Coffee House',start:'14:00',end:'19:00',minutes:300,rate:25000,tip:30000},
    {id:'demo-25',date:`${month}-25`,job:'tutor',workplace:'Gia sư Tiếng Anh IELTS',start:'18:00',end:'20:00',minutes:120,rate:120000,tip:0},
    {id:'demo-23',date:`${month}-23`,job:'cafe',workplace:'Quán The Coffee House',start:'12:30',end:'17:00',minutes:270,rate:25000,tip:0},
    {id:'demo-22',date:`${month}-22`,job:'cafe',workplace:'Quán The Coffee House',start:'17:30',end:'23:00',minutes:330,rate:25000,tip:45000}
  ];
}
