# Sistem Monitoring Palet Kayu Export PT SJA

Aplikasi web modern berbasis **React 19 + TypeScript + Vite + Tailwind CSS** untuk pemantauan inventaris stok palet kayu ekspor lintas plant PT SJA (*Sepanjang, Semarang, Sukodono, Karawang*), terintegrasi dengan PO Procurement, penerimaan kedatangan (Inbound), pencatatan pengeluaran (Outbound), dan analitik grafik Pareto.

---

## 🚀 Panduan Upload & Hosting Menggunakan GitHub Desktop (Tanpa Terminal)

Anda **TIDAK PERLU mengetik perintah terminal/command prompt (`git init`, `git add`, dll.)**. Semuanya bisa dilakukan hanya dengan klik tombol di aplikasi **GitHub Desktop** / **GitHub Desktop Portable**.

### A. Jika Baru Pertama Kali Upload Proyek:

1. **Buka GitHub Desktop** di komputer Anda dan pastikan sudah Sign In ke akun GitHub Anda.
2. Klik menu **File** (di pojok kiri atas) > pilih **Add Local Repository...** (atau tekan shortcut `Ctrl + O`).
3. Klik tombol **Choose...** lalu pilih folder proyek ini yang ada di komputer Anda.
4. Jika muncul tulisan: *"This directory does not appear to be a Git repository"*, klik link bertuliskan **create a repository**.
5. Pada kotak dialog yang muncul:
   - **Name**: otomatis terisi nama folder (misal: `monitoring-stok-palet`).
   - Biarkan opsi lainnya default, lalu klik tombol biru **Create Repository**.
6. Di pojok kiri bawah, di kolom **Summary**, ketik pesan:
   `Inisialisasi sistem monitoring palet kayu export`
7. Klik tombol biru **Commit to main**.
8. Terakhir, di bar bagian atas aplikasi, klik tombol **Publish repository**:
   - Jika ingin bisa diakses online gratis via GitHub Pages, pastikan centang *"Keep this code private"* **dihilangkan** (uncheck agar Public).
   - Klik **Publish repository**. Folder proyek Anda sudah terupload ke GitHub!

---

### B. Jika Mengupload Revisi / Pembaruan File Terbaru:

Setiap kali Anda mengganti atau menambahkan file baru di folder proyek Anda di komputer:
1. **Buka GitHub Desktop** dan pilih repository ini di pojok kiri atas (*Current Repository*).
2. GitHub Desktop akan secara otomatis mendeteksi semua file yang telah diubah di panel sebelah kiri (**Changes**).
3. Di pojok kiri bawah, di kotak **Summary**, ketik keterangan update Anda, contohnya:
   `Update revisi logo Kapal Api dan penamaan Palet`
4. Klik tombol biru **Commit to main**.
5. Di bar bagian atas, tombol akan berubah menjadi **Push origin** (dengan tanda panah ke atas). Klik tombol **Push origin**.
6. Selesai! Semua perubahan langsung terkirim dan terupdate di GitHub Anda.

---

### C. Mengaktifkan Hosting Website Gratis (GitHub Pages)

Agar aplikasi bisa dibuka langsung lewat link browser di HP atau laptop rekan kerja:
1. Buka repository Anda di browser di [GitHub.com](https://github.com).
2. Klik tab menu **Settings** (ikon roda gigi di bagian atas).
3. Di bilah menu sebelah kiri, klik **Pages**.
4. Pada bagian **Build and deployment** > menu pilihan **Source**, ubah dari *Deploy from a branch* menjadi **GitHub Actions**.
5. Selesai! GitHub Actions yang sudah terpasang di repository ini (`.github/workflows/deploy.yml`) akan otomatis mem-build dan menerbitkan website Anda.
6. Link website Anda akan muncul di bagian atas halaman Pages (misal: `https://USERNAME.github.io/monitoring-stok-palet/`).

---

## 💻 Menjalankan di Komputer Lokal (Localhost)

1. Pastikan sudah terinstal **Node.js** (versi 18 ke atas) dan **npm**.
2. Clone repository:
   ```bash
   git clone https://github.com/USERNAME_ANDA/monitoring-stok-palet.git
   cd monitoring-stok-palet
   ```
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan development server:
   ```bash
   npm run dev
   ```
5. Buka browser pada alamat [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun & Hak Akses Pengguna

| Username | Password | Role | Lingkup Lokasi Plant |
|---|---|---|---|
| `admin` | `Admin123` | **Administrator** | Semua Plant (Full Hak Akses & Reset Data) |
| `purc_karawang` | `Karawang123` | **Purchasing** | SJA KARAWANG |
| `purc_sepanjang` | `Sepanjang123` | **Purchasing** | SJA SEPANJANG |
| `purc_sukodono` | `Sukodono123` | **Purchasing** | SJA SUKODONO |
| `purc_semarang` | `Semarang123` | **Purchasing** | SJA SEMARANG |
| *(Tamu/Guest)* | *-* | **Read-Only** | Dashboard publik (Form input terkunci) |

*Tersedia tombol **Akses Cepat (Quick Login)** di jendela modal Login untuk pengujian instan.*

---

## 🛠️ Fitur Utama Sistem

- **Multi-Plant Realtime Monitoring**: Melacak pergerakan palet di 4 plant SJA.
- **Grafik Pareto (Chart.js)**: Distribusi aktivitas kedatangan & pengeluaran palet serta persentase kumulatif antar plant.
- **Master PO Procurement**: Manajemen PO supplier, validasi nomor unik, dan deteksi outstanding.
- **Inbound Tracking**: Penerimaan palet terhubung PO dengan deteksi pengiriman parsial / selesai otomatis.
- **Outbound Tracking**: Pengeluaran berbasis stok aktual per batch atau opsi pengeluaran massal (*Keluarkan Semua Batch*).
- **Penyimpanan Lokal & Cloud-Ready**: Otomatis tersimpan di browser (`localStorage`) dan mendukung **Backup / Restore file JSON**.
