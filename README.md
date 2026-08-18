# CBT Modern — HTML/CSS/JavaScript + Firebase + GitHub Pages

Aplikasi ujian online statis yang dapat di-host di GitHub Pages. Firebase dipakai untuk Authentication dan Cloud Firestore.

## Fitur Siswa
- Login dengan username + password (di belakang layar username diubah menjadi `username@cbt.local` untuk Firebase Auth).
- Daftar mata pelajaran aktif.
- Validasi jadwal dan token ujian.
- Data diri: Nama, Tempat Lahir, Tanggal Lahir, Sesi, Token.
- Ujian fullscreen, timer, navigasi nomor soal, tandai ragu-ragu, autosave jawaban.
- Deteksi perpindahan tab/aplikasi dan auto-submit setelah batas peringatan.
- Nilai otomatis setelah dikumpulkan.
- Satu attempt per siswa per mata pelajaran; admin dapat menghapus attempt di Firestore bila ingin mengizinkan ujian ulang.

## Fitur Admin
- Dashboard ringkas.
- CRUD mata pelajaran.
- Token per mata pelajaran.
- Jadwal mulai/selesai, durasi, acak soal, batas peringatan.
- CRUD bank soal pilihan ganda.
- Import soal Excel (.xlsx/.xls) dan Word (.docx).
- Buat username/password siswa.
- Daftar nilai dan export CSV.
- Pengaturan nama sekolah, judul ujian, dan KKM.

## Struktur Folder
```
cbt-modern/
├── .nojekyll
├── index.html
├── firestore.rules
├── README.md
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── auth.js
    ├── admin.js
    ├── student.js
    ├── utils.js
    └── firebase-config.js
```

## 1. Buat Project Firebase
1. Buka Firebase Console lalu buat project baru.
2. Tambahkan **Web App**.
3. Salin konfigurasi Firebase Web.
4. Buka `js/firebase-config.js` dan ganti semua nilai `GANTI_...` dengan config project Anda.

Contoh bentuk config:
```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "nama-project.firebaseapp.com",
  projectId: "nama-project",
  storageBucket: "nama-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

## 2. Aktifkan Firebase Authentication
1. Firebase Console → **Authentication** → **Sign-in method**.
2. Aktifkan **Email/Password**.
3. Jangan membuat akun siswa dari halaman Sign Up publik; aplikasi ini tidak menyediakan halaman sign-up.

## 3. Buat Cloud Firestore
1. Firebase Console → **Firestore Database** → Create database.
2. Pilih region terdekat.
3. Setelah database jadi, buka tab **Rules**.
4. Salin seluruh isi file `firestore.rules` ke Rules lalu klik **Publish**.

Jangan biarkan database dalam Test Mode untuk penggunaan nyata.

## 4. Buat Akun Admin Pertama (WAJIB MANUAL SEKALI)
Karena aplikasi di GitHub Pages tidak memiliki server/Admin SDK, admin pertama dibuat melalui Firebase Console.

Misal Anda ingin login admin dengan:
- Username: `admin`
- Password: `Admin12345`

Lakukan:
1. Firebase Console → Authentication → Users → Add user.
2. Email isi: `admin@cbt.local`
3. Password isi: `Admin12345`
4. Setelah dibuat, salin **UID** admin.
5. Firestore Database → Start collection → Collection ID: `users`.
6. Document ID: tempel UID admin tadi.
7. Tambahkan field:
   - `username` (string): `admin`
   - `displayName` (string): `Administrator`
   - `role` (string): `admin`
   - `active` (boolean): `true`
8. Save.

Sekarang admin dapat login di aplikasi dengan username `admin`, bukan email.

## 5. Upload ke GitHub
1. Buat repository baru, misalnya `cbt-modern`.
2. Upload **isi folder** `cbt-modern` ke root repository. Pastikan `index.html` berada di root, bukan terbungkus folder ganda.
3. Repository → Settings → Pages.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Branch: `main` dan folder: `/(root)` → Save.
6. Setelah aktif, URL biasanya berbentuk:
   `https://USERNAME-GITHUB.github.io/cbt-modern/`

File `.nojekyll` tetap letakkan di root sejajar dengan `index.html`.

## 6. Tambahkan Domain GitHub Pages ke Firebase Auth
Buka Firebase Console → Authentication → Settings → Authorized domains.
Tambahkan domain GitHub Pages Anda, contohnya:
`USERNAME-GITHUB.github.io`

Masukkan domain saja, tanpa `https://` dan tanpa `/cbt-modern/`.

## 7. Login Admin dan Konfigurasi
1. Buka URL GitHub Pages.
2. Login admin.
3. Buka **Pengaturan** → isi nama sekolah.
4. Buka **Mata Pelajaran** → tambah mapel, token, jadwal, durasi.
5. Buka **Bank Soal** → pilih mapel → tambah soal manual atau import file.
6. Buka **Akun Siswa** → buat username/password.
7. Berikan username/password + token mapel kepada siswa.

## Format Import Excel
Baris pertama wajib menggunakan header berikut:

| question | option_a | option_b | option_c | option_d | correct | points | explanation |
|---|---|---|---|---|---|---|---|
| 2 + 2 = ... | 2 | 3 | 4 | 5 | C | 1 | 2 + 2 = 4 |

`correct` harus A, B, C, atau D.

Aplikasi juga menyediakan tombol **Unduh Template CSV** pada dialog Import. CSV tersebut dapat dibuka di Excel lalu disimpan menjadi `.xlsx`.

## Format Import Word (.docx)
Gunakan format teks seperti ini, lalu simpan sebagai DOCX:
```
SOAL: 2 + 2 = ...
A. 2
B. 3
C. 4
D. 5
JAWABAN: C
POIN: 1
PEMBAHASAN: 2 + 2 = 4
---
SOAL: Ibu kota Indonesia adalah ...
A. Bandung
B. Jakarta
C. Surabaya
D. Medan
JAWABAN: B
POIN: 1
```

## Catatan Penting Keamanan
Versi ini sengaja dibuat agar bisa berjalan **100% dari GitHub Pages tanpa server**. Karena penilaian dilakukan di browser siswa, `correctIndex` tersimpan pada dokumen soal yang dapat dibaca akun siswa. Siswa biasa tidak melihat kunci di antarmuka, tetapi pengguna yang sangat teknis dapat mencoba memeriksa lalu lintas data/browser developer tools.

Untuk ujian bernilai tinggi/anti-cheat serius, pindahkan kunci jawaban dan proses penilaian ke backend tepercaya seperti Firebase Cloud Functions / server Admin SDK. GitHub Pages tetap dapat digunakan untuk frontend.

Fullscreen juga bukan pengunci perangkat; browser tetap mengizinkan pengguna keluar fullscreen. Aplikasi hanya dapat mendeteksi sebagian perpindahan tab/aplikasi melalui Visibility API dan mencatat pelanggaran.

## Jika Login Gagal
Periksa satu per satu:
1. `firebase-config.js` sudah benar.
2. Authentication → Email/Password sudah Enabled.
3. Untuk admin username `admin`, email Auth harus `admin@cbt.local`.
4. UID akun Auth harus sama dengan Document ID pada `users/{UID}`.
5. Field `role` admin harus persis `admin`.
6. Domain `USERNAME.github.io` sudah ada di Authorized domains.
7. Firestore Rules sudah dipublish.
8. Buka DevTools → Console untuk melihat error bila masih gagal.
