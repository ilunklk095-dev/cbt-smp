import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { db } from './firebase-config.js';
import { $, toast } from './utils.js';
import { loginWithUsername, logout, watchAuth } from './auth.js';
import { studentNav, renderStudentHome } from './student.js';
import { adminNav, renderAdminPage } from './admin.js';

let session={user:null,profile:null};
const meta={
  'student-home':['Ujian Saya','Pilih mata pelajaran dan mulai ujian.'],
  'admin-dashboard':['Dashboard','Ringkasan sistem ujian.'],
  'admin-subjects':['Mata Pelajaran','Token, jadwal, durasi dan pengawasan.'],
  'admin-questions':['Bank Soal','Kelola soal manual atau import.'],
  'admin-students':['Akun Siswa','Buat akun login siswa.'],
  'admin-scores':['Nilai','Pantau hasil ujian siswa.'],
  'admin-settings':['Pengaturan','Identitas aplikasi.']
};

$('#togglePassword').onclick=()=>{const i=$('#loginPassword');i.type=i.type==='password'?'text':'password';};
$('#loginForm').onsubmit=async e=>{e.preventDefault();const btn=$('#loginBtn');btn.disabled=true;btn.textContent='Memeriksa...';try{await loginWithUsername($('#loginUsername').value,$('#loginPassword').value);}catch(err){console.error(err);toast('Username atau password salah.','error');}finally{btn.disabled=false;btn.textContent='Masuk';}};
$('#logoutBtn').onclick=()=>logout();
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');

watchAuth(async(user,profile)=>{
  if(!user){session={user:null,profile:null};$('#loginView').classList.remove('hidden');$('#appView').classList.add('hidden');return;}
  if(!profile){toast('Akun Auth ada, tetapi profil Firestore belum dibuat. Hubungi admin.','error',5000);await logout();return;}
  if(profile.active===false){toast('Akun dinonaktifkan.','error');await logout();return;}
  session={user,profile};$('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
  $('#userName').textContent=profile.displayName||profile.username||'Pengguna';$('#userRole').textContent=profile.role==='admin'?'Administrator':'Siswa';$('#userAvatar').textContent=(profile.displayName||profile.username||'U').charAt(0).toUpperCase();
  await loadBrand(); buildNav(); route(true);
});

async function loadBrand(){try{const s=await getDoc(doc(db,'settings','app'));if(s.exists())$('#sidebarSchoolName').textContent=s.data().schoolName||'CBT Sekolah';}catch{}}
function buildNav(){const nav=session.profile.role==='admin'?adminNav():studentNav();$('#sideNav').innerHTML=nav.map(x=>`<button class="nav-btn" data-page="${x.id}"><span class="nav-icon">${x.icon}</span>${x.label}</button>`).join('');$('#sideNav').querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{location.hash=`#${b.dataset.page}`;$('#sidebar').classList.remove('open');});}
window.addEventListener('hashchange',()=>route());
async function route(initial=false){if(!session.profile)return;let page=location.hash.replace('#','');if(!page||!allowed(page))page=session.profile.role==='admin'?'admin-dashboard':'student-home';if(initial&&location.hash!==`#${page}`)history.replaceState(null,'',`#${page}`);const [t,s]=meta[page]||['Dashboard',''];$('#pageTitle').textContent=t;$('#pageSubtitle').textContent=s;$('#sideNav').querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));const c=$('#pageContent');c.innerHTML='<div class="card empty-state"><div class="empty-icon">◌</div><h3>Memuat...</h3></div>';try{if(session.profile.role==='admin')await renderAdminPage(page,c);else await renderStudentHome(c,session.profile);}catch(e){console.error(e);c.innerHTML=`<div class="card empty-state"><div class="empty-icon">!</div><h3>Gagal memuat halaman</h3><p>${e.message}</p></div>`;toast('Terjadi kesalahan saat memuat data.','error');}}
function allowed(page){return session.profile.role==='admin'?page.startsWith('admin-'):page==='student-home';}
setInterval(()=>{$('#clockText').textContent=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());},1000);
