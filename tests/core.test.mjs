import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,duration,normalizeTimeInput,endTime,afterMidnightMinutes,lateBonusPay,totalPay,validateShift,validateData,summarize,moveMonthKey,payrollMonthForDate,payrollPeriod,shiftsInMonth,makeCSV,validDate,demoShifts} from '../core.js';
const shift={id:'test-1',date:'2026-10-06',job:'cafe',workplace:'Quán Cafe',start:'22:00',end:'02:30',minutes:270,rate:25000,tip:30000};
test('typed hours normalize without accepting incomplete or impossible times',()=>{
  for(const [input,expected] of [['8','08:00'],['18','18:00'],['830','08:30'],['1830','18:30'],['8:30','08:30'],['00:00','00:00'],['2359','23:59'],[' 9:30 ','09:30']])assert.equal(normalizeTimeInput(input),expected);
  for(const input of ['',null,'9:','8:3','24','24:00','2360','25:30','-1','9pm','12:30x'])assert.equal(normalizeTimeInput(input),null);
  assert.equal(duration(normalizeTimeInput('2330'),normalizeTimeInput('100')),90);
  assert.equal(endTime(normalizeTimeInput('9:30'),1440),'09:30');
  assert.throws(()=>validateShift({...shift,start:'2200'}),'Saved and imported time values remain strict');
});
test('overnight shifts receive a 50% bonus for the portion after midnight',()=>{
  assert.equal(duration('22:00','02:30'),270);assert.equal(endTime('22:00',270),'02:30');
  assert.equal(afterMidnightMinutes(shift),150);assert.equal(lateBonusPay(shift),31250);assert.equal(totalPay(shift),173750);
  const fifteenMinutes={...shift,start:'23:30',end:'00:15',minutes:45,tip:0};
  assert.equal(afterMidnightMinutes(fifteenMinutes),15);assert.equal(lateBonusPay(fifteenMinutes),3125);assert.equal(totalPay(fifteenMinutes),21875);
  assert.equal(afterMidnightMinutes({...shift,start:'14:00',end:'18:00',minutes:240}),0);
  assert.equal(totalPay({...shift,minutes:1,tip:0}),417);assert.equal(duration('14:00','14:00'),0);assert.equal(endTime('14:00',1440),'14:00');
});
test('real calendar dates and time bounds are enforced',()=>{assert.equal(validDate('2024-02-29'),true);assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2026-02-31'),false);assert.equal(validDate('2026-13-01'),false);assert.throws(()=>duration('25:00','00:00'));assert.throws(()=>validateShift({...shift,minutes:0}));assert.throws(()=>validateShift({...shift,minutes:300}));assert.throws(()=>validateShift({...shift,rate:-1}));assert.throws(()=>validateShift({...shift,tip:0.5}));assert.throws(()=>validateShift({...shift,date:'2026-02-30'}));});
test('payroll month closes on the 25th and starts on the previous month 26th',()=>{
  assert.deepEqual(payrollPeriod('2026-10'),{start:'2026-09-26',end:'2026-10-25'});
  assert.equal(payrollMonthForDate('2026-10-25'),'2026-10');
  assert.equal(payrollMonthForDate('2026-10-26'),'2026-11');
  assert.equal(payrollMonthForDate('2026-12-31'),'2027-01');
  assert.equal(moveMonthKey('2026-01',-1),'2025-12');
  const entries=[shift,{...shift,id:'test-2',start:'14:00',end:'18:30'},{...shift,id:'test-3',date:'2026-09-25'},{...shift,id:'test-4',date:'2026-09-26'},{...shift,id:'test-5',date:'2026-10-25'},{...shift,id:'test-6',date:'2026-10-26'}];
  const monthly=shiftsInMonth(entries,'2026-10');const summary=summarize(monthly);
  assert.deepEqual(monthly.map(s=>s.id),['test-5','test-1','test-2','test-4']);
  assert.equal(summary.dates.size,3);assert.equal(summary.minutes,1080);assert.equal(summary.income,663750);
});
test('backup validation rejects incomplete, duplicate and unsafe values',()=>{const data={...defaults(),shifts:[shift]};assert.deepEqual(validateData(data),data);assert.throws(()=>validateData({...data,version:2}));assert.throws(()=>validateData({...data,shifts:[shift,shift]}));assert.throws(()=>validateData({...data,profile:null}));assert.throws(()=>validateData({...data,shifts:[{...shift,rate:Infinity}]}));assert.throws(()=>validateData({...data,shifts:[{...shift,id:'<script>'}]}));assert.equal(validateData({...data,shifts:[{...shift,workplace:'<script>alert(1)</script>'}]}).shifts.length,1);});
test('CSV includes midnight bonus, preserves Vietnamese, and neutralizes formulas',()=>{const csv=makeCSV([{...shift,workplace:'=SUM(1,2)'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"Phụ cấp sau 0h 50% (VND)"'));assert.ok(csv.includes('"31250"'));assert.ok(csv.includes('"173750"'));assert.ok(makeCSV([{...shift,workplace:'Quán "A", B'}]).includes('"Quán ""A"", B"'));});
test('demo totals are derived from four actual rows, independent of user data',()=>{const entries=demoShifts('2026-10');const summary=summarize(entries);assert.equal(summary.income,690000);assert.equal(summary.minutes,1020);assert.equal(summary.dates.size,4);assert.equal(defaults().shifts.length,0);entries.forEach(validateShift);});
