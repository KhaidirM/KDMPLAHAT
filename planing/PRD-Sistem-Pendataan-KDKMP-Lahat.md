# Product Requirements Document
## Sistem Pendataan KDKMP Kabupaten Lahat

| Atribut | Nilai |
|---|---|
| Status | Draft kebutuhan produk untuk ditinjau |
| Versi | 1.0 |
| Tanggal penyusunan | 15 November 2026 |
| Pemilik produk | Belum ditetapkan dalam dokumen sumber |
| Cakupan rilis awal | Ringkasan dan Pendataan Pra-Verval, fokus Sarpras dan kesiapan operasional |
| Platform yang direncanakan | Aplikasi web, Netlify, Supabase |

## 1. Ringkasan produk

Sistem Pendataan KDKMP Kabupaten Lahat adalah aplikasi web untuk mencatat keadaan faktual sarana, prasarana, dan kesiapan operasional pada 377 Koperasi Desa/Kelurahan Merah Putih (KDKMP). Aplikasi membandingkan kondisi lapangan dengan target atau spesifikasi katalog, membantu pengguna menyelesaikan pendataan, dan memberi PMO gambaran lintas koperasi mengenai item yang perlu ditindaklanjuti.

Data aplikasi menjadi sumber utama. Spreadsheet hanya digunakan untuk melihat dan mengolah hasil ekspor. Aplikasi harus membedakan kelengkapan pendataan dari kesesuaian terhadap target, menjaga isian saat koneksi bermasalah, dan tidak menganggap kolom kosong sebagai penghalang penyimpanan. Dokumen ini menggabungkan rancangan utama dengan keputusan tambahan yang telah disetujui; jika berbeda, keputusan tambahan menjadi ketentuan.

## 2. Latar belakang dan masalah

Pendataan dilakukan beberapa peran dan dapat berlangsung di lapangan dengan koneksi internet tidak stabil. Proses membutuhkan urutan item dan istilah yang konsisten, pencatatan jumlah aktual serta kondisi, dan perbandingan terhadap target. Tanpa pemisahan antara data kosong, belum diperiksa, tidak tersedia, dan sesuai, ringkasan dapat menyesatkan. Isian juga berisiko hilang atau tertimpa jika penyimpanan, pergantian halaman, dan pengeditan bersama tidak ditangani dengan baik.

Sistem harus memudahkan pengisian satu form, mempertahankan data sampai server mengonfirmasi penyimpanan, dan menyajikan angka yang dapat ditelusuri ke data aktual.

## 3. Tujuan dan indikator keberhasilan

### 3.1 Tujuan

1. Memudahkan pendataan lapangan dengan urutan katalog Form B yang konsisten.
2. Mencatat keberadaan, kondisi, jumlah aktual, jumlah rusak, tipe, detail khusus, dan catatan sesuai kebutuhan item.
3. Menampilkan progres kelengkapan dan kesesuaian sebagai ukuran terpisah.
4. Menyediakan ringkasan lintas koperasi bagi PMO, termasuk daftar masalah prioritas.
5. Mencegah kehilangan data ketika koneksi terputus atau pengguna berpindah menu.
6. Menjaga akses dan perubahan data sesuai peran serta mencatat aktivitas penting.
7. Memungkinkan ekspor data yang sedang ditampilkan ke Excel dengan catatan integritas.

### 3.2 Indikator keberhasilan produk

- Seluruh koperasi dalam indeks berjumlah 377 dan dapat ditemukan melalui pencarian/filter wilayah.
- Setiap tampilan progres menunjukkan pembilang dan penyebut yang jelas serta menggunakan data aktual.
- Isian kosong tidak menghalangi Save; kuantitas mustahil ditolak di browser dan database.
- Kegagalan koneksi tidak menghapus draft lokal; draft hanya dihapus setelah server mengonfirmasi penyimpanan.
- Pengiriman ulang tidak membuat duplikasi, dan versi server yang lebih baru tidak tertimpa diam-diam.
- Pengguna hanya dapat menyimpan data yang diizinkan perannya.
- Setiap ekspor dan perubahan relevan tercatat di log server.

Target numerik seperti waktu respons, tingkat keberhasilan Save, dan ketersediaan layanan belum ditentukan dan perlu disepakati sebelum produksi.

## 4. Pengguna dan hak akses

| Peran | Melihat data | Mengisi/mengubah | Ekspor | Keterangan |
|---|---|---|---|---|
| PMO | Seluruh koperasi | Ya, sebagai pengisi biasa | Ya | Dapat memilih koperasi dan memantau masalah lintas wilayah. Alasan koreksi tidak wajib pada tahap ini. |
| Manager | Seluruh koperasi | Hanya koperasi terkait NIK login | Ya | Tidak dapat menyimpan data koperasi lain. |
| Pengurus | Seluruh koperasi | Hanya koperasi terkait NIK login | Ya | Tidak dapat menyimpan data koperasi lain. |
| Guest | Data yang diizinkan | Tidak | Ya | Hanya melihat. |

Role dan status login harus terlihat pada setiap halaman. NIK koperasi diperlakukan sebagai teks. Jika pengguna tidak mengetahui NIK, alur bantu memungkinkan pemilihan desa, kecamatan, lalu koperasi/NIK. Login mengikuti mekanisme pilihan role dan PIN per role pada rancangan. Nilai PIN aktual tidak dicantumkan dalam dokumen, frontend, atau repositori. Penguatan mekanisme PIN dan pembatasan percobaan dicatat sebagai tindak lanjut, tetapi otorisasi database tetap wajib membatasi akses seperlunya.

### 4.1 Aturan otorisasi

- Hak lihat dan tulis diperiksa pada operasi data, bukan hanya melalui penyembunyian tombol.
- Manager/Pengurus tidak dapat menulis untuk koperasi selain yang terkait dengan sesi login.
- Guest tidak memiliki hak tulis.
- PMO dapat menulis pada semua koperasi, sebagai pengisi biasa.
- Ekspor tersedia untuk semua peran sesuai ketentuan.
- Log tidak ditampilkan di aplikasi bagi peran mana pun; pemilik proyek meninjaunya melalui Supabase.

## 5. Cakupan produk

### 5.1 Termasuk dalam rilis awal

- Landing/login dengan pilihan koperasi, peran, dan PIN.
- Menu Ringkasan.
- Menu Pendataan Pra-Verval, mencakup Sarpras dan kesiapan operasional yang terdapat dalam form/katalog.
- Daftar koperasi, pencarian, dan filter kecamatan.
- Pendataan kelompok, item, sub-item, tipe/varian, kuantitas, serta detail item.
- Penyimpanan satu form utuh, draft lokal, indikator perubahan, pemulihan saat online, dan deteksi konflik.
- Ringkasan progres dan pusat perhatian PMO.
- Tampilan spesifikasi dan gambar melalui tombol mata.
- Ekspor Excel sesuai tampilan/filter dengan persetujuan catatan integritas.
- Log aktivitas server yang tidak dapat diubah melalui aplikasi.
- Navigasi modular tanpa refresh penuh jika memungkinkan.

### 5.2 Tidak termasuk atau ditunda

- Status workflow `draft`, `submitted`, `reviewed`, beserta penguncian edit.
- Katalog Sarpras berversi di database; katalog tahap awal berasal dari file proyek.
- Pengunggahan foto bukti aktif. Ikon lampiran boleh tampil nonaktif “Segera hadir”; saklar fitur mati dan tidak ada unggahan.
- Integrasi lampiran ke Google Drive.
- Modul Bangunan dan Administrasi terpisah; materi terkait sementara berada di Sarpras.
- Supabase Auth, PHP Native, hosting PHP, atau penyimpanan foto di Supabase Storage.
- Guest sebagai pengisi.
- Alasan koreksi wajib PMO dan riwayat perubahan yang tampil per koperasi/item.
- Perubahan struktur data induk koperasi, Manager, dan Pengurus.

## 6. Navigasi dan modul

1. **Ringkasan** — progres, agregasi wilayah, dan pusat perhatian PMO.
2. **Pendataan Pra-Verval / Sarpras** — form per koperasi dengan kelompok dan item katalog.
3. **Koperasi** — daftar, pencarian, filter kecamatan, tombol Detail yang sementara nonaktif/abu-abu.
4. **Pengaturan** — preferensi efek suara (default mati) dan preferensi antarmuka yang disepakati.

Aplikasi bersifat modular. Menu dapat ditambahkan atau dilepas sesuai kebutuhan. Perpindahan menu mempertahankan isian belum disimpan. Animasi halus dan tidak mencolok digunakan jika mendukung responsivitas serta aksesibilitas.

## 7. Persyaratan fungsional

### 7.1 Login dan konteks koperasi

- Pengguna memasukkan/memilih NIK sebagai teks, memilih role, lalu memasukkan PIN role.
- PMO dapat memilih koperasi melalui pemilih koperasi.
- Manager/Pengurus melihat semua koperasi tetapi hanya dapat mengisi koperasi milik NIK saat login.
- Setelah login, role dan koperasi aktif terlihat.
- Jika NIK tidak diketahui, tersedia pencarian berjenjang desa, kecamatan, koperasi.
- Pesan gagal login tidak membocorkan PIN atau informasi rahasia.

### 7.2 Daftar koperasi

- Menampilkan nama koperasi, NIK, desa, dan kecamatan.
- Mendukung pencarian teks dan filter kecamatan.
- Tombol Detail tampak nonaktif/abu-abu sampai profil koperasi masuk cakupan.
- Indeks KDKMP dan data Manager/Pengurus yang tersedia dipertahankan tanpa perubahan struktur.
- Identitas utama adalah NIK; variasi penulisan nama tidak boleh menghasilkan rekaman koperasi baru.

### 7.3 Form Sarpras

- Bagian atas menampilkan nama koperasi, NIK, desa, dan kecamatan.
- Kelompok, item, sub-item, urutan, label, rencana, tipe, gambar, dan spesifikasi bersumber dari katalog pemilik proyek.
- Katalog Form B yang tersedia mencatat 70 baris isian. Rincian item dan ID stabil mengikuti `LIST-SARPRAS-POIN-B.md`; spesifikasi mengikuti `LIST-SPEK-SARPRAS-POIN-B.md`; aset gambar mengikuti `LIST-ASET-GAMBAR-SARPRAS-POIN-B.md` setelah pencocokan final.
- Item baru ditambahkan sebagai entri katalog, bukan kolom atau tabel khusus item.
- Penilaian awal kelompok: `ada`, `tidak_ada`, `custom`, atau kosong. Status kosong tidak disamakan dengan Tidak Ada. Perilaku Custom perlu mengikuti keputusan form yang disetujui.
- Penilaian kelompok dapat membantu mengisi item turunan. Perubahan kelompok tidak boleh diam-diam menimpa rincian item yang sudah ada.
- Filter: semua item, hanya Tidak Ada, atau hanya belum dinilai.
- Kelompok dapat diciutkan/diperluas; progres tampil per item, kelompok, dan keseluruhan.

### 7.4 Data item dan validasi

Field umum:

- Keberadaan: `ada`, `tidak_ada`, atau kosong/belum diisi.
- Kondisi bila Ada: `baik`, `belum_dicek`, `rusak`, atau kosong.
- Jumlah aktual: bilangan bulat tidak negatif atau kosong bila belum dicatat/tidak relevan.
- Jumlah rusak: bilangan bulat tidak negatif, tidak melebihi jumlah aktual, diisi bila relevan.
- Tipe/varian dari katalog.
- Catatan teks maksimum 1.000 karakter.
- Detail khusus berupa data terstruktur sesuai jenis item.

Aturan:

- Kolom kosong tidak pernah memblokir Save. Pengingat kelengkapan tetap ditampilkan.
- Tolak angka negatif, pecahan untuk jumlah, jumlah rusak melebihi aktual, dan nilai mustahil lainnya.
- Catatan untuk kondisi Rusak ditandai wajib sebagai pengingat, bukan penghalang Save. Aturan khusus sumber air Tidak Ada juga menandai catatan wajib.
- Jumlah rencana ditentukan katalog dan tidak dapat diubah pengguna, termasuk PMO.
- Kondisi item adalah satu pilihan. Jika sebagian unit berbeda, rincian ditulis di Catatan; tidak ada kolom tambahan jumlah berdasarkan kondisi.
- Jika jumlah aktual lebih dari satu, tampilkan petunjuk untuk menjelaskan variasi kondisi pada Catatan.
- Jika keberadaan Tidak Ada, kontrol kondisi disembunyikan; catatan opsional kecuali aturan khusus menyatakan lain.

### 7.5 Detail kesiapan operasional

Field khas disimpan di satu kolom JSON terstruktur. Rincian minimum:

- **Sumber air:** keberadaan; jenis (sumur bor, sumur warga, sumur desa, PAM desa, PAMSIMAS, aliran sungai, lainnya); status rencana permanen/sementara; status terpasang/terhubung. Jika Tidak Ada, rencana jenis sumber air opsional dan catatan ditandai wajib sebagai pengingat.
- **Pompa air:** keberadaan dan jumlah aktual; jumlah rencana tidak ditampilkan. Kondisi berfungsi/belum dicek/rusak; catatan ditandai wajib bila rusak.
- **Keran air:** jumlah rencana 3; keberadaan, jumlah aktual bila dibutuhkan, teraliri/tidak, kondisi, dan catatan yang selalu tersedia serta ditandai wajib bila rusak.
- **Wastafel dan WC:** wastafel klinik/gudang mengikuti mekanisme umum. WC mencatat jongkok/bukan, bidet/jet washer bila relevan, dan koneksi septic tank. WC tidak dinilai berdasarkan aliran air. Septic tank dinilai Ada/Tidak Ada.
- **Instalasi air:** catatan umum opsional.
- **Instalasi listrik:** keberadaan, kelayakan, SLO, sumber listrik, MCB, daya VA, lokasi sumber/instalasi (dalam/luar gudang utama), keberadaan dan lokasi panel. Daftar nominal daya perlu disahkan.
- **Lampu:** keberadaan, jumlah, aliran listrik, dan saklar sebagaimana tipe item; rencana jumlah dari katalog.

### 7.6 Gambar dan spesifikasi

- Tombol mata selalu terlihat desktop/mobile.
- Gambar penuh hanya dimuat saat tombol mata diklik; thumbnail tidak digunakan.
- Detail tampil dalam pop-up yang dapat digulir. Menutupnya mengembalikan fokus dan posisi daftar.
- Varian default katalog menentukan gambar/spesifikasi awal; pilihan tipe mengubah keduanya.
- Jika gambar tidak tersedia, tombol mata nonaktif dengan keterangan “Gambar belum tersedia”; spesifikasi tetap dapat dibuka bila tersedia.
- Jika gambar gagal dimuat, tampil pesan yang dapat ditutup.
- Gambar tidak diregangkan; tersedia zoom manual dan gestur pinch di mobile.
- Dalam teks spesifikasi: `[Judul]` menjadi judul seksi, `Label: nilai` menjadi baris tabel, selebihnya paragraf biasa. Teks sumber tidak diubah.
- Spesifikasi dan catatan ditampilkan sebagai teks, bukan HTML.
- Aset disimpan di hosting, bukan database. Daftar saat ini menyebut 177 aset dan perlu dicocokkan dengan berkas fisik sebelum rilis.

### 7.7 Save, draft lokal, dan sinkronisasi

- Satu Save mengirim seluruh perubahan pada satu form secara utuh. Operasi atomik: jika gagal, tidak ada penyimpanan parsial.
- Pengiriman ke server dilakukan setelah tombol Save ditekan, bukan autosave.
- Draft lokal memuat NIK, jenis form, waktu perubahan, dan penanda draft; PIN/rahasia tidak pernah disimpan.
- Antarmuka membedakan “tersimpan di perangkat” dan “tersimpan di server”.
- Draft dihapus hanya setelah server mengonfirmasi sukses.
- Ketika offline, perubahan tetap tersedia lokal; saat online kembali, pengguna dapat mengirim ulang tanpa duplikasi.
- Kegagalan menampilkan status gagal dan mempertahankan draft.
- Tombol Save mengambang dan tombol di akhir form menunjukkan jumlah perubahan belum disimpan serta waktu simpan terakhir.
- Peringatkan pengguna sebelum meninggalkan halaman jika ada perubahan belum tersimpan.
- Perpindahan tab/menu tidak menghapus isian.
- Setelah Save, tampil konfirmasi berhasil/gagal dan ringkasan kondisi form.
- Setiap form membawa nomor versi. Jika versi server lebih baru, hentikan penimpaan dan tawarkan pemuatan data terbaru atau peninjauan/perbandingan.
- Idempotency key atau mekanisme setara mencegah pengiriman ulang menghasilkan duplikasi.

### 7.8 Indikator dan progres

| Warna/status | Makna |
|---|---|
| Netral | Belum ada isian |
| Merah | Tidak Ada atau seluruh item turunan Tidak Ada |
| Kuning | Belum lengkap, termasuk Rusak dan Belum Dicek |
| Hijau | Siap tanpa kendala; kondisi baik/berfungsi yang memenuhi kriteria |

Warna selalu didampingi ikon dan teks. Rusak dan Belum Dicek memakai kuning dengan ikon berbeda. Status dapat dibaca teknologi bantu dan kontrol dapat digunakan dengan keyboard.

Ringkasan menampilkan:

- **Kelengkapan:** item yang memiliki isian relevan / seluruh item katalog berlaku, misalnya “12 dari 40”. Item belum dinilai tetap masuk penyebut.
- **Kesesuaian:** item hijau / item yang sudah dinilai, dengan pembilang/penyebut jelas. Item belum dinilai tidak dihitung sesuai.
- Jumlah siap, Tidak Ada, Rusak, dan Belum Dicek.
- Progres per kelompok dan keseluruhan.

Definisi operasional “sudah diisi/dinilai” harus konsisten untuk field kondisional. Semua angka berasal dari data aktual tersimpan; jangan tampilkan data contoh sebagai fakta.

### 7.9 Ringkasan dan pemantauan PMO

- Agregasi per koperasi, desa, kecamatan, dan seluruh kabupaten.
- Pusat perhatian PMO memuat item Tidak Ada, Rusak, Belum Dicek, dan jumlah aktual di bawah rencana.
- Filter minimum: kecamatan, desa, status, kelompok/item, dan pencarian koperasi.
- Item belum dinilai tampil terpisah dan tidak dihitung sesuai.
- Ringkasan koperasi menampilkan progres dan waktu simpan terakhir. Jumlah perubahan belum tersimpan hanya tersedia pada perangkat/sesi terkait.
- Grafik/perbandingan dapat memakai dimensi dan rentang waktu yang didukung data. Jangan tampilkan tren waktu sebelum tersedia riwayat/snapshot memadai.
- Definisi data yang disetujui untuk publikasi/perbandingan perlu ditetapkan sebelum fitur perbandingan penuh.

### 7.10 Ekspor

- Ekspor Excel mengikuti tampilan dan filter aktif.
- Sebelum ekspor tampil catatan/perjanjian integritas dan persetujuan pengguna; redaksi final ditentukan pemilik produk.
- Aktivitas ekspor mencatat waktu, role, NIK jika relevan, filter, dan konteks.
- Ekspor tersedia untuk semua role sesuai keputusan dan tidak mengubah data sumber.

### 7.11 Log aktivitas

- Mencatat waktu server, role, NIK koperasi, aktivitas, entitas/bagian, kunci data, dan nilai sebelum/sesudah untuk perubahan.
- Aktivitas minimum: input, edit, hapus, ekspor, dan aktivitas lain yang ditentukan.
- Karena PIN digunakan bersama per role, log menyimpan role dan NIK, bukan nama orang.
- Log hanya dapat ditambah melalui aplikasi, tidak dapat diedit/dihapus dari aplikasi.
- Tidak ada halaman log/riwayat dalam aplikasi untuk role mana pun; pemilik proyek meninjau melalui Supabase.

### 7.12 Efek suara dan interaksi

- Efek suara lembut tersedia tetapi default mati.
- Jika diaktifkan, volume awal 40%; suara hanya diputar setelah interaksi pengguna.
- Suara dapat dipakai untuk klik, buka grup, Save berhasil, peringatan, dan Save gagal.
- Suara bukan satu-satunya penanda; teks/ikon tetap tersedia.
- Animasi halus dan tidak mencolok; alur tetap dapat digunakan dengan keyboard.

## 8. Persyaratan data dan arsitektur

### 8.1 Prinsip

- Supabase menjadi basis data; hosting yang direncanakan Netlify.
- Data induk `index KDKMP`, Manager, dan Pengurus tetap sebagaimana tersedia.
- NIK koperasi selalu bertipe teks.
- Satu tabel generik untuk isian seluruh item, satu baris per koperasi dan item; tidak ada kolom/tabel per item.
- Katalog terpisah dari hasil pendataan. Pada tahap awal katalog masih berasal dari file, belum menjadi tabel berversi.
- Detail item khusus disimpan sebagai JSON terstruktur.
- Penyimpanan satu form menggunakan transaksi/batch atomik.
- Perkiraan sekitar 26.000 baris (377 koperasi x sekitar 70 item); jumlah final dikonfirmasi dari katalog aktif.

### 8.2 Entitas usulan

Skema ini rancangan untuk ditinjau, bukan migrasi yang sudah dijalankan.

| Tabel | Fungsi dan kolom inti |
|---|---|
| `index KDKMP` (sudah ada) | NIK, nama koperasi, desa, kecamatan; struktur tidak diubah. |
| Data Manager/Pengurus (sudah ada) | Mengikuti skema saat ini. |
| `sarpras_kelompok` | `kelompok_id` (kunci teks), `nama_kelompok`, `urutan`. |
| `sarpras_katalog` | `item_id` stabil, `induk_item_id`, `kelompok_id`, `nama_item`, `urutan`, `jumlah_rencana`, `daftar_tipe`, `spesifikasi`, `gambar`, `aktif`. Master katalog berversi ditunda. |
| `sarpras_isian_kelompok` | Satu baris per NIK dan kelompok: `nik_koperasi`, `kelompok_id`, `penilaian_awal`, `diubah_pada`. |
| `sarpras_isian` | Satu baris per NIK dan item; kolom rinci berikut. Kombinasi NIK+item unik. |
| `log_aktivitas` | Log append-only sebagaimana bagian 7.11. |
| `akses_pin` (bila dipakai) | Role dan hash PIN, bukan PIN teks asli; rancangan enforcement perlu disetujui. |

Kolom inti `sarpras_isian`:

| Kolom | Ketentuan |
|---|---|
| `id` | Kunci baris. |
| `nik_koperasi` | Teks, relasi ke indeks koperasi. |
| `item_id` | Teks, relasi ke katalog. |
| `tipe_dipilih` | Teks atau kosong. |
| `keberadaan` | `ada`, `tidak_ada`, atau null. |
| `kondisi` | `baik`, `belum_dicek`, `rusak`, atau null; disembunyikan jika tidak ada. |
| `jumlah_aktual` | Bilangan bulat >= 0 atau null. |
| `jumlah_rusak` | Bilangan bulat >= 0 atau null; tidak melebihi aktual. |
| `catatan` | Teks <= 1.000 karakter. |
| `detail` | JSON field khusus item. |
| `lampiran` | JSON kosong; fitur belum aktif. |
| `versi` | Naik setiap simpan untuk deteksi konflik. |
| `dibuat_pada`, `diubah_pada` | Waktu dari server. |
| `diubah_oleh_role`, `diubah_oleh_nik` | Role dan NIK; tanpa nama orang. |

Database menolak nilai mustahil tetapi menerima kolom kosong. Unique key dan operasi idempoten mencegah duplikasi.

### 8.3 Keamanan database dan hosting

- Audit Supabase: RLS aktif, kebijakan spesifik per role, grant seperlunya.
- Jangan mencabut izin massal sebelum alur aplikasi diuji.
- Kunci `service_role` tidak boleh berada di frontend, variabel Netlify yang terkirim ke browser, atau repositori.
- Perubahan database ditinjau pemilik proyek, didahului pencadangan, memiliki prosedur pembatalan, dan menjaga data induk.
- Teks spesifikasi/catatan dirender sebagai teks biasa.
- Terapkan header keamanan melalui konfigurasi Netlify.
- Draft lokal tidak boleh menyimpan PIN atau data autentikasi rahasia.
- Mekanisme verifikasi PIN, pembatasan percobaan salah, dan akses langsung ke tabel PIN harus diputuskan sebelum produksi.

## 9. Kebutuhan nonfungsional

### 9.1 Keandalan dan integritas

- Save atomik dan idempoten.
- Koneksi terputus tidak menghilangkan draft lokal.
- Konflik mendeteksi versi server yang lebih baru.
- Ringkasan dan ekspor menggunakan data tersimpan.
- Waktu audit berasal dari server.

### 9.2 Kinerja dan perangkat

- Antarmuka berfungsi di desktop dan perangkat mobile.
- Gambar besar dimuat hanya saat diminta.
- Form panjang mendukung filter dan collapse kelompok.
- Target kinerja jaringan lambat dan ukuran payload perlu ditentukan sebelum produksi.

### 9.3 Aksesibilitas dan kegunaan

- Status disampaikan lewat ikon/teks selain warna.
- Tombol, filter, modal, dropdown, dan Save dapat digunakan dengan keyboard.
- Modal gambar mengembalikan fokus dan posisi daftar.
- Status penyimpanan dan perubahan belum tersimpan mudah terlihat.
- Efek suara default mati dan bukan satu-satunya informasi.

### 9.4 Privasi dan keamanan

- Hak akses diuji di database/API.
- Rahasia tidak dikirim ke browser atau disimpan dalam draft.
- Log mencatat role dan konteks koperasi tanpa mengklaim identitas personal.
- Input teks diamankan saat dirender.
- Retensi, pemulihan, dan redaksi integritas ekspor perlu disahkan.

## 10. Alur utama pengguna

### 10.1 Mengisi form

1. Pengguna masuk dengan role dan PIN.
2. Pengguna memilih koperasi yang berhak diakses.
3. Aplikasi memuat data tersimpan dan katalog.
4. Pengguna membuka kelompok dan mengisi status awal/item.
5. Aplikasi menandai isian yang belum lengkap dan memperbarui progres lokal.
6. Pengguna menekan Save.
7. Server memvalidasi nilai, versi, dan kewenangan, lalu menyimpan form secara atomik.
8. Jika sukses, status menjadi “tersimpan di server”, log dicatat, dan draft lokal dibersihkan.
9. Jika gagal/offline, draft dipertahankan, status gagal terlihat, dan pengguna dapat mengirim ulang.

### 10.2 Pemantauan PMO

1. PMO membuka Ringkasan.
2. PMO memilih wilayah atau status.
3. Aplikasi menampilkan progres koperasi dan item Tidak Ada, Rusak, Belum Dicek, atau di bawah target.
4. PMO membuka koperasi dan mengoreksi data sebagai pengisi biasa.
5. Perubahan disimpan melalui Save dan dicatat di log.

### 10.3 Ekspor

1. Pengguna memilih tampilan/filter.
2. Pengguna menekan Ekspor.
3. Aplikasi menampilkan catatan integritas dan meminta persetujuan.
4. Aplikasi membuat Excel sesuai data/filter dan mencatat ekspor.

## 11. Kriteria penerimaan

### Akses dan data

- Manager/Pengurus melihat koperasi lain tetapi hanya menyimpan untuk NIK login.
- Guest tidak dapat menulis melalui UI maupun permintaan langsung.
- Memodifikasi NIK pada permintaan tidak memberikan akses lintas koperasi.
- NIK teks tidak berubah menjadi angka atau notasi ilmiah.

### Validasi dan Save

- Kolom kosong menampilkan pengingat tetapi tidak menghalangi Save.
- Jumlah negatif, pecahan, atau jumlah rusak melebihi aktual ditolak.
- Kegagalan proses tidak menghasilkan simpanan sebagian.
- Pengiriman ulang tidak membuat duplikasi.
- Draft hanya dihapus setelah konfirmasi server.
- Offline-online mempertahankan draft dan memungkinkan kirim ulang.
- Versi server yang lebih baru memicu resolusi konflik dan tidak tertimpa otomatis.

### Status dan media

- Kelengkapan dan kesesuaian memiliki pembilang/penyebut masing-masing.
- Rusak dan Belum Dicek tidak pernah dihitung hijau/sesuai.
- Belum dinilai tampil sebagai kategori tersendiri.
- Tombol mata terlihat di desktop/mobile dan thumbnail tidak digunakan.
- Gambar hanya dimuat setelah interaksi; varian mengubah gambar/spesifikasi; ketiadaan gambar ditangani.
- Teks spesifikasi/catatan tidak dieksekusi sebagai HTML.

### Ringkasan, ekspor, log, antarmuka

- Filter wilayah/status mengubah daftar yang ditampilkan.
- Item di bawah rencana masuk pusat perhatian PMO.
- Ekspor mengikuti filter, meminta persetujuan, dan tercatat.
- Log tidak dapat diedit/dihapus melalui aplikasi dan tidak tampil di UI role mana pun.
- Perubahan bertahan saat pindah menu; peringatan muncul sebelum meninggalkan halaman.
- Status memiliki teks/ikon, kontrol utama bekerja dengan keyboard, suara default mati.
- Modal ditutup dan mengembalikan fokus/posisi sebelumnya.

## 12. Risiko, ketergantungan, dan mitigasi

| Risiko/ketergantungan | Dampak | Mitigasi/tindak lanjut |
|---|---|---|
| Hitungan katalog historis berbeda | Form/progres tidak konsisten | File daftar/spec pemilik proyek menjadi acuan; rekonsiliasi kelompok, item, sub-item, dan baris form sebelum finalisasi. Daftar Form B menyebut 70 baris. |
| Aset disebut 176 atau 177 | Gambar hilang/salah pasangan | Cocokkan daftar nama dengan direktori fisik dan katalog; daftar saat ini mencatat 177. |
| Data Manager/Pengurus kosong/meragukan | Hak akses atau konteks salah | Audit sumber: 23 koperasi tanpa baris Pengurus dan 265 tanpa baris Manager; ketiadaan belum membuktikan data salah. Verifikasi catatan Jadian Lama, Padang Bindu, dan Cecar sebelum koreksi. |
| RLS/grant Supabase terlalu luas | Akses/perubahan tidak sah | Audit least privilege dan uji akses lintas koperasi sebelum produksi. |
| Koneksi lapangan terputus | Data hilang/duplikat | Draft lokal, status sinkronisasi, idempotensi, Save atomik, dan uji offline-online. |
| Edit bersamaan | Data tertimpa | Versioning dan resolusi konflik. |
| Spesifikasi placeholder/prototipe | Dianggap standar final | Pertahankan metadata status sumber dan minta validasi pemilik produk sebelum dianggap final. |
| PIN bersama | Sulit mengenali orang | Log role dan NIK saja; putuskan penguatan PIN/pembatasan percobaan. |
| Kinerja/retensi belum ditentukan | Kesiapan produksi tidak terukur | Tetapkan SLA, retensi, backup, pemulihan, dan pemilik operasional sebelum go-live. |

## 13. Rencana rilis dan kesiapan produksi

### Tahap 1 — Fondasi

- Validasi daftar koperasi, role, dan NIK.
- Finalisasi katalog Form B dan field kesiapan operasional.
- Tinjau skema tambahan, RLS, grant, log, migrasi, dan rollback.
- Siapkan lingkungan uji terpisah dari produksi.

### Tahap 2 — Pendataan

- Login dan hak akses.
- Form Sarpras/kesiapan operasional, indikator, Save atomik, draft lokal, idempotensi, konflik versi.
- Tampilan spesifikasi/gambar tanpa thumbnail.

### Tahap 3 — Ringkasan dan ekspor

- Agregasi wilayah dan pusat perhatian PMO.
- Ekspor Excel dengan persetujuan dan log.
- Pengujian aksesibilitas, mobile, koneksi lambat, dan integritas data.

### Gate sebelum produksi

- Backup dan uji pemulihan berhasil.
- RLS, izin database, dan header Netlify ditinjau serta diuji.
- Pemantauan galat dan pemilik operasional tersedia.
- Prosedur rollback diuji.
- Uji penerimaan oleh PMO dan perwakilan Manager/Pengurus/Guest.
- Pelatihan PMO disiapkan.
- Keputusan terbuka yang berdampak pada data/keamanan telah disetujui.

## 14. Skenario verifikasi minimum

1. Akses lintas koperasi, termasuk manipulasi NIK pada permintaan langsung.
2. Guest mencoba menyimpan melalui UI dan jalur data.
3. Kuantitas negatif, pecahan, serta jumlah rusak lebih besar dari aktual.
4. Save gagal di tengah proses; pastikan tidak ada simpanan parsial.
5. Offline, lanjut mengisi, tutup/buka halaman, online kembali, lalu kirim ulang.
6. Kirim ulang tidak membuat baris ganda.
7. PMO dan Pengurus mengedit item sama; versi baru tidak tertimpa.
8. Pindah menu dengan perubahan belum disimpan dan peringatan meninggalkan halaman.
9. Mobile dengan koneksi lambat, modal gambar, zoom, dan tombol mata.
10. Keyboard/pembaca layar untuk filter, status, modal, dan Save.
11. Hitungan progres untuk belum dinilai, tidak ada, rusak, belum dicek, dan hijau.
12. Ekspor mengikuti filter dan tercatat.
13. Log append-only dan waktu server.
14. Karakter HTML pada spesifikasi/catatan tampil sebagai teks.
15. Backup, pemulihan, dan rollback skema/rilis.

## 15. Keputusan dan hal terbuka

### 15.1 Keputusan yang berlaku

- Rancangan utama menjadi acuan; catatan tambahan melengkapi/mengubah bagian yang berbeda secara eksplisit.
- Save tidak diblokir oleh kolom kosong; nilai mustahil ditolak.
- Jumlah rencana ditetapkan katalog.
- Kondisi satu pilihan per item; perbedaan sebagian dijelaskan pada Catatan.
- Makna warna lama dipertahankan dengan ikon/teks. Rusak dan Belum Dicek menggunakan kuning dengan ikon berbeda sebagai penerapan yang direkomendasikan.
- Tombol mata selalu tampak, tanpa thumbnail.
- Ekspor terbuka bagi semua role.
- Log mencatat role dan NIK saja, tidak ditampilkan di aplikasi.
- Foto bukti belum aktif; ikon lampiran nonaktif dan Google Drive ditunda.
- Status submitted/reviewed tidak digunakan.
- PMO mengoreksi sebagai pengisi biasa; alasan koreksi wajib ditunda.
- Katalog berversi di database ditunda; katalog awal bersumber dari file.

### 15.2 Perlu keputusan sebelum implementasi/rilis

1. Konfirmasi indikator kuning dengan ikon pembeda untuk Rusak dan Belum Dicek.
2. Konfirmasi log tidak ditampilkan bagi role mana pun, termasuk PMO.
3. Rekonsiliasi kelompok/kategori/item/sub-item berdasarkan katalog resmi; daftar Form B saat ini mencatat 70 baris, dan angka historis lain perlu dicocokkan.
4. Validasi 177 aset gambar terhadap direktori dan katalog.
5. Tetapkan perilaku `custom`/null dan propagasi status kelompok terhadap isian yang sudah ada.
6. Tetapkan definisi final kelengkapan untuk field kondisional dan penyebut per koperasi.
7. Tetapkan pilihan daya listrik dan rincian instalasi listrik yang belum lengkap.
8. Tetapkan redaksi integritas ekspor dan data yang disetujui untuk publikasi/perbandingan.
9. Putuskan enforcement PIN yang aman, termasuk hash, pembatasan percobaan, dan penggunaan fungsi server bila diperlukan.
10. Untuk aktivasi lampiran mendatang, putuskan batas ukuran/format, peran pengunggah, dan struktur folder Drive.
11. Tetapkan target kinerja, retensi data/log, jadwal backup/pemulihan, dan pemilik pemantauan.
12. Verifikasi data induk yang kosong/duplikat/diragukan terhadap sumber resmi sebelum diperbarui.

## 16. Acuan dokumen proyek

- `Rancangan_Aplikasi_KDKMP_Lahat_Tersusun.docx` — rancangan utama alur, role, menu, Sarpras, dan konteks koperasi.
- `Catatan_Tambahan_KDKMP_Lahat_dari_Versi_GPT (1).docx` — keputusan tambahan, Save, ringkasan, keamanan, log, dan skema usulan.
- `LIST-SARPRAS-POIN-B.md` — item Form B dan ID katalog.
- `LIST-SPEK-SARPRAS-POIN-B.md` — spesifikasi dan varian; status sumber dipertahankan.
- `LIST-ASET-GAMBAR-SARPRAS-POIN-B.md` — pemetaan gambar per item.
