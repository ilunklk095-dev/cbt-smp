import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { auth, db } from './firebase-config.js';
import { $, escapeHtml, modal, closeModal, toast, formatDateTime } from './utils.js';

let state = { subjects:[], subject:null, questions:[], attempt:null, answers:{}, flags:{}, index:0, timer:null, saveTimer:null, violations:0, submitting:false };
let currentProfile = null;

export function studentNav(){ return [{id:'student-home',label:'Ujian Saya',icon:'⌂'}]; }

export async function renderStudentHome(container, profile){
  currentProfile = profile;
  container.innerHTML = `<div class="section-head"><div><h3>Daftar Mata Pelajaran</h3><p>Pilih mata pelajaran yang akan dikerjakan.</p></div></div><div id="studentSubjects" class="subject-grid"></div>`;
  const q = query(collection(db,'subjects'), where('active','==',true));
  const snap = await getDocs(q);
  state.subjects = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const root = $('#studentSubjects');
  if(!state.subjects.length){ root.innerHTML = `<div class="card empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><h3>Belum ada ujian aktif</h3><p>Silakan menunggu administrator mengaktifkan mata pelajaran.</p></div>`; return; }
  root.innerHTML = state.subjects.map(s => {
    const status = getScheduleStatus(s);
    const disabled = status.code !== 'open';
    return `<article class="card subject-card"><span class="subject-code">${escapeHtml(s.code||'MAPEL')}</span><h3>${escapeHtml(s.name)}</h3><p>${status.text}</p><div class="subject-meta"><span class="badge badge-indigo">⏱ ${Number(s.durationMinutes||60)} menit</span><span class="badge ${disabled?'badge-amber':'badge-green'}">${disabled?'Terjadwal':'Tersedia'}</span></div><div class="subject-actions"><small class="muted">${s.scheduleStart?formatDateTime(s.scheduleStart):'Tanpa batas jadwal'}</small><button class="btn btn-primary" data-start-subject="${s.id}" ${disabled?'disabled':''}>Pilih</button></div></article>`;
  }).join('');
root.querySelectorAll('[data-start-subject]').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = 'Memuat...';

      await openIdentityForm(btn.dataset.startSubject);

      btn.textContent = oldText;
      btn.disabled = false;
    } catch (error) {
      console.error('Gagal membuka ujian:', error);

      toast(
        'Gagal membuka ujian: ' + (error.message || 'Terjadi kesalahan'),
        'error',
        5000
      );

      btn.textContent = 'Pilih';
      btn.disabled = false;
    }
  });
});

function getScheduleStatus(s){
  const now=Date.now(); const start=s.scheduleStart?new Date(s.scheduleStart).getTime():0; const end=s.scheduleEnd?new Date(s.scheduleEnd).getTime():Infinity;
  if(start && now<start) return {code:'early',text:`Ujian dibuka ${formatDateTime(s.scheduleStart)}`};
  if(end!==Infinity && now>end) return {code:'ended',text:`Jadwal berakhir ${formatDateTime(s.scheduleEnd)}`};
  return {code:'open',text:s.scheduleEnd?`Tersedia sampai ${formatDateTime(s.scheduleEnd)}`:'Ujian sedang tersedia'};
}

async function openIdentityForm(subjectId){
  const subject = state.subjects.find(x=>x.id===subjectId); if(!subject)return;
  const attemptId=`${auth.currentUser.uid}_${subjectId}`;
  const old = await getDoc(doc(db,'attempts',attemptId));
  if(old.exists() && old.data().status==='submitted') { showExistingScore(old.data(), subject); return; }
  const prev=old.exists()?old.data():{};
  modal({title:`Mulai ${subject.name}`,subtitle:'Lengkapi data diri dan token ujian.',body:`
    <div class="form-grid">
      <label class="field span-2"><span>Nama Siswa</span><input id="idName" value="${escapeHtml(prev.studentName||currentProfile.displayName||'')}" required></label>
      <label class="field"><span>Tempat Lahir</span><input id="idBirthPlace" value="${escapeHtml(prev.birthPlace||'')}" required></label>
      <label class="field"><span>Tanggal Lahir</span><input id="idBirthDate" type="date" value="${escapeHtml(prev.birthDate||'')}" required></label>
      <label class="field"><span>Sesi Ujian</span><select id="idSession"><option>Sesi 1</option><option>Sesi 2</option><option>Sesi 3</option><option>Sesi 4</option></select></label>
      <label class="field"><span>Token Ujian</span><input id="idToken" autocomplete="off" placeholder="Masukkan token" required></label>
    </div>
    <div class="callout warn">Saat menekan <b>Mulai Ujian</b>, aplikasi akan meminta mode layar penuh. Berpindah tab/aplikasi akan dicatat sebagai pelanggaran.</div>`,footer:`<button class="btn btn-outline" data-close-start>Batal</button><button id="confirmStartBtn" class="btn btn-primary">Mulai Ujian</button>`});
  $('[data-close-start]')?.addEventListener('click',closeModal);
  $('#confirmStartBtn')?.addEventListener('click',()=>prepareExam(subject, old.exists()?old.data():null));
}

async function prepareExam(subject, oldAttempt){
  const name=$('#idName').value.trim(), birthPlace=$('#idBirthPlace').value.trim(), birthDate=$('#idBirthDate').value, session=$('#idSession').value, token=$('#idToken').value.trim();
  if(!name||!birthPlace||!birthDate||!token) return toast('Lengkapi seluruh data diri dan token.','warn');
  if(token !== String(subject.token||'')) return toast('Token ujian tidak sesuai.','error');
  const status=getScheduleStatus(subject); if(status.code!=='open') return toast(status.text,'warn');
  const qSnap = await getDocs(collection(db,'subjects',subject.id,'questions'));
  let questions=qSnap.docs.map(d=>({id:d.id,...d.data()}));
  if(!questions.length) return toast('Soal belum tersedia. Hubungi admin.','warn');
  questions.sort((a,b)=>(a.order||0)-(b.order||0));
  if(subject.randomizeQuestions) questions = [...questions].sort(()=>Math.random()-.5);
  const attemptId=`${auth.currentUser.uid}_${subject.id}`;
  let attempt=oldAttempt;
  if(!attempt){
    const payload={studentUid:auth.currentUser.uid,username:currentProfile.username||'',studentName:name,birthPlace,birthDate,session,subjectId:subject.id,subjectName:subject.name,status:'ongoing',answers:{},flags:{},violations:0,startedAt:serverTimestamp(),clientStartedAt:new Date().toISOString(),updatedAt:serverTimestamp()};
    await setDoc(doc(db,'attempts',attemptId),payload);
    const reread=await getDoc(doc(db,'attempts',attemptId)); attempt=reread.data();
  } else {
    await updateDoc(doc(db,'attempts',attemptId),{studentName:name,birthPlace,birthDate,session,updatedAt:serverTimestamp()});
  }
  state={...state,subject,questions,attempt:{id:attemptId,...attempt},answers:attempt.answers||{},flags:attempt.flags||{},index:0,violations:Number(attempt.violations||0),submitting:false};
  closeModal(); await enterExam();
}

async function enterExam(){
  $('#appView').classList.add('hidden'); $('#examView').classList.remove('hidden'); document.body.style.overflow='hidden';
  $('#examSubjectName').textContent=state.subject.name; $('#examStudentName').textContent=state.attempt.studentName;
  try{ await document.documentElement.requestFullscreen?.(); }catch{}
  bindExamEvents(); renderQuestion(); startTimer();
  document.addEventListener('visibilitychange',handleVisibility);
  window.addEventListener('beforeunload',beforeUnload);
}
function bindExamEvents(){
  $('#prevQuestionBtn').onclick=()=>{if(state.index>0){state.index--;renderQuestion();}};
  $('#nextQuestionBtn').onclick=()=>{if(state.index<state.questions.length-1){state.index++;renderQuestion();}else confirmSubmit();};
  $('#submitExamTopBtn').onclick=confirmSubmit;
  $('#flagBtn').onclick=toggleFlag;
  $('#openMapBtn').onclick=()=>$('.question-map-panel').classList.add('open');
  $('#closeMapBtn').onclick=()=>$('.question-map-panel').classList.remove('open');
}
function renderQuestion(){
  const q=state.questions[state.index]; const answer=state.answers[q.id];
  $('#questionNumber').textContent=`Soal ${state.index+1} dari ${state.questions.length}`; $('#questionText').textContent=q.question||'';
  $('#optionsList').innerHTML=(q.options||[]).map((opt,i)=>`<button class="option-btn ${Number(answer)===i?'selected':''}" data-option="${i}"><span class="option-key">${String.fromCharCode(65+i)}</span><span>${escapeHtml(opt)}</span></button>`).join('');
  $('#optionsList').querySelectorAll('[data-option]').forEach(btn=>btn.addEventListener('click',()=>selectAnswer(q.id,Number(btn.dataset.option))));
  $('#flagBtn').textContent=state.flags[q.id]?'★ Ditandai':'☆ Ragu-ragu'; $('#flagBtn').className=`btn ${state.flags[q.id]?'btn-danger':'btn-soft'}`;
  $('#prevQuestionBtn').disabled=state.index===0; $('#nextQuestionBtn').textContent=state.index===state.questions.length-1?'Tinjau & Selesai':'Berikutnya →'; renderMap(); updateProgress();
}
function selectAnswer(qid,index){ state.answers[qid]=index; scheduleSave(); renderQuestion(); }
function toggleFlag(){ const q=state.questions[state.index]; state.flags[q.id]=!state.flags[q.id]; scheduleSave(); renderQuestion(); }
function renderMap(){
  $('#questionMap').innerHTML=state.questions.map((q,i)=>{let cls='';if(state.answers[q.id]!==undefined)cls+=' answered';if(state.flags[q.id])cls+=' flagged';if(i===state.index)cls+=' active';return `<button class="qnum${cls}" data-qindex="${i}">${i+1}</button>`}).join('');
  $('#questionMap').querySelectorAll('[data-qindex]').forEach(b=>b.addEventListener('click',()=>{state.index=Number(b.dataset.qindex);renderQuestion();$('.question-map-panel').classList.remove('open')}));
}
function updateProgress(){ const n=Object.keys(state.answers).length; $('#examProgressText').textContent=`${n}/${state.questions.length}`; }
function scheduleSave(){ clearTimeout(state.saveTimer); state.saveTimer=setTimeout(saveAttempt,550); }
async function saveAttempt(){ if(!state.attempt?.id||state.submitting)return; try{await updateDoc(doc(db,'attempts',state.attempt.id),{answers:state.answers,flags:state.flags,violations:state.violations,updatedAt:serverTimestamp()});}catch(e){console.error(e);} }
function startTimer(){
  clearInterval(state.timer); const started = state.attempt.startedAt?.toDate ? state.attempt.startedAt.toDate().getTime() : new Date(state.attempt.clientStartedAt||Date.now()).getTime(); const duration=Number(state.subject.durationMinutes||60)*60000;
  const tick=()=>{const left=Math.max(0,duration-(Date.now()-started)); const s=Math.floor(left/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; $('#examTimer').textContent=[h,m,sec].map(x=>String(x).padStart(2,'0')).join(':'); if(left<=0){clearInterval(state.timer);submitExam(true);}}; tick(); state.timer=setInterval(tick,1000);
}
function handleVisibility(){ if(document.hidden&&!state.submitting){state.violations++; saveAttempt(); toast(`Peringatan: keluar dari halaman ujian (${state.violations}/${state.subject.maxWarnings||3}).`,'warn',4500); if(state.violations>=Number(state.subject.maxWarnings||3)) submitExam(true); } }
function beforeUnload(e){ if(!state.submitting){e.preventDefault();e.returnValue='';} }
function confirmSubmit(){
  const answered=Object.keys(state.answers).length, total=state.questions.length;
  modal({title:'Selesaikan ujian?',subtitle:`${answered} dari ${total} soal sudah dijawab.`,body:`<div class="callout ${answered<total?'warn':''}">${answered<total?`Masih ada <b>${total-answered}</b> soal yang belum dijawab. Anda tetap dapat mengakhiri ujian.`:'Semua soal sudah dijawab. Pastikan pilihan Anda sudah benar.'}</div>`,footer:`<button class="btn btn-outline" data-cancel-submit>Kembali</button><button id="finalSubmitBtn" class="btn btn-primary">Ya, Kumpulkan</button>`});
  $('[data-cancel-submit]').onclick=closeModal; $('#finalSubmitBtn').onclick=()=>submitExam(false);
}
async function submitExam(auto=false){
  if(state.submitting)return; state.submitting=true; closeModal(); clearInterval(state.timer); clearTimeout(state.saveTimer);
  let earned=0,max=0,correct=0;
  state.questions.forEach(q=>{const pts=Number(q.points||1);max+=pts;if(Number(state.answers[q.id])===Number(q.correctIndex)){earned+=pts;correct++;}});
  const score=max?Math.round((earned/max)*100):0;
  try{await updateDoc(doc(db,'attempts',state.attempt.id),{answers:state.answers,flags:state.flags,violations:state.violations,status:'submitted',score,correctCount:correct,totalQuestions:state.questions.length,earnedPoints:earned,maxPoints:max,submittedAt:serverTimestamp(),autoSubmitted:auto,updatedAt:serverTimestamp()});}catch(e){state.submitting=false;toast('Gagal menyimpan nilai. Periksa koneksi.','error');return;}
  cleanupExam(); showScore({score,correctCount:correct,totalQuestions:state.questions.length,violations:state.violations,autoSubmitted:auto},state.subject);
}
function cleanupExam(){document.removeEventListener('visibilitychange',handleVisibility);window.removeEventListener('beforeunload',beforeUnload);document.exitFullscreen?.().catch(()=>{});$('#examView').classList.add('hidden');$('#appView').classList.remove('hidden');document.body.style.overflow='';}
function showScore(data,subject){
  modal({title:'Ujian selesai',subtitle:subject.name,body:`<div class="score-hero"><div class="score-circle" style="--score:${Number(data.score||0)}"><strong>${Number(data.score||0)}</strong></div><h3>Nilai Anda</h3><p class="muted">Jawaban telah berhasil disimpan.</p></div><div class="score-details"><div><b>${data.correctCount||0}/${data.totalQuestions||0}</b><small>Jawaban benar</small></div><div><b>${data.violations||0}</b><small>Pelanggaran</small></div><div><b>${data.autoSubmitted?'Ya':'Tidak'}</b><small>Auto submit</small></div></div>`,footer:`<button id="scoreDoneBtn" class="btn btn-primary">Kembali ke Daftar Ujian</button>`});
  $('#scoreDoneBtn').onclick=()=>{closeModal();location.hash='#student-home';location.reload();};
}
function showExistingScore(data,subject){ showScore(data,subject); }
