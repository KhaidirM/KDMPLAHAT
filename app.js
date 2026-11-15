/* KDKMP Lahat · client application
 * No third-party runtime dependency. Reference assets stay on hosting;
 * only structured inventory data is sent to Supabase.
 */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value) => new Intl.NumberFormat('id-ID').format(Number(value || 0));
const dateTime = (value) => value ? new Date(value).toLocaleString('id-ID', {dateStyle:'medium',timeStyle:'short'}) : 'Belum ada simpanan';
const cfg = window.KDKMP_SUPABASE;
const role = sessionStorage.getItem('kdmp-role') || '';
const readOnly = role === 'guest';
const state = {
  live:false, error:'', catalog:[], allItems:[], coops:[], dashboard:null,
  activeNik:sessionStorage.getItem('kdmp-active-nik') || sessionStorage.getItem('kdmp-nik') || '',
  activeCoop:null, form:{items:{},groups:{},versions:{},groupVersions:{}},
  page:location.hash.slice(1) || 'summary', district:'all', village:'all',
  coopSearch:'', coopDistrict:'all', coopStatus:'all', coopPageSize:20, coopPage:1, summaryStatus:'all', summarySearch:'', itemFilter:'all', itemSearch:'',
  focusReturn:null, saving:false
};
const token = () => sessionStorage.getItem('kdmp-token') || '';
const localKey = (nik) => 'kdmp-draft:' + nik + ':form-b';
const rpc = async (name, body) => {
  if (!cfg?.url || !cfg?.publishableKey) throw new Error('Konfigurasi server belum tersedia.');
  const res = await fetch(cfg.url + '/rest/v1/rpc/' + name, {
    method:'POST', headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},
    body:JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.details || data.hint || 'Permintaan server gagal.';
    if (/sesi berakhir|session expired/i.test(message)) {
      sessionStorage.removeItem('kdmp-token');
      sessionStorage.removeItem('kdmp-role');
      sessionStorage.removeItem('kdmp-nik');
      sessionStorage.removeItem('kdmp-name');
      sessionStorage.removeItem('kdmp-coop-name');
      location.reload();
    }
    throw new Error(message);
  }
  return data;
};
const apiHeaders = () => ({apikey:cfg.publishableKey,'Content-Type':'application/json'});
const toast = (message, tone='') => {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
  node.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('show'), 3300);
};
const roleLabel = ({pmo:'PMO',manager:'Manager',pengurus:'Pengurus',guest:'Tamu'}[role] || 'Pengguna');
const operatorName = sessionStorage.getItem('kdmp-name') || '';
const profileTitle = role==='manager'&&sessionStorage.getItem('kdmp-coop-name') ? 'Manager · KDKMP '+sessionStorage.getItem('kdmp-coop-name') : (operatorName||roleLabel);
const profileSubtitle = role==='manager' ? operatorName : (operatorName&&operatorName!==roleLabel?roleLabel:'');
function shell() {
  $('#app').innerHTML =
    '<header class="appbar"><button class="brand" data-page="summary" aria-label="Buka ringkasan">' +
      '<img src="./assets/logo-kdmp.svg" alt=""><span>KDKMP <i>Lahat</i></span></button>' +
      '<div class="bar-right"><span class="online" id="connection-label">● Menghubungkan…</span>' +
        '<span class="role-pill">' + esc(roleLabel) + '</span><span class="profile-user"><span class="avatar" aria-hidden="true">' + esc((operatorName || roleLabel).slice(0,1)) + '</span>' +
        '<span class="profile-info"><span class="profile-name">' + esc(profileTitle) + '</span>' + (profileSubtitle?'<small class="profile-subtitle">'+esc(profileSubtitle)+'</small>':'') + '</span></span>' +
        '<button class="logout" id="logout">Keluar</button></div></header>' +
    '<div class="layout"><aside class="sidebar" aria-label="Navigasi utama">' +
      '<div class="side-label">Pemantauan</div>' +
      '<button class="nav" data-page="summary"><span class="icon">▦</span>Ringkasan</button>' +
      '<button class="nav" data-page="coops"><span class="icon">⌂</span>Koperasi</button>' +
      '<div class="side-label">Pendataan</div>' +
      '<button class="nav" data-page="sarpras"><span class="icon">☷</span>Pendataan Sarpras</button>' +
      '<button class="nav" data-page="export"><span class="icon">⇩</span>Ekspor Data</button>' +
      '<div class="sidefoot" id="server-status">Menghubungkan ke server…</div></aside>' +
      '<main class="main" id="main"><section id="page-summary" class="page"></section>' +
      '<section id="page-coops" class="page hidden"></section><section id="page-sarpras" class="page hidden"></section>' +
      '<section id="page-export" class="page hidden"></section></main></div>' +
    '<div class="save hidden" id="savebar"><span id="save-label">Draft hanya di perangkat</span>' +
      '<button id="save" type="button">Simpan ke server</button></div>' +
    '<div id="toast" class="toast" role="status" aria-live="polite"></div>';
  $('#logout').addEventListener('click', () => {
    ['kdmp-token','kdmp-role','kdmp-nik','kdmp-name','kdmp-coop-name','kdmp-active-nik'].forEach(k => sessionStorage.removeItem(k));
    location.reload();
  });
}
function percent(n, d) { return d ? Math.round((Number(n || 0) / Number(d)) * 100) : 0; }
function getDraft() {
  if (!state.activeNik) return {items:{},groups:{},updatedAt:null,pending:false};
  try {
    const draft = JSON.parse(localStorage.getItem(localKey(state.activeNik)) || '{}');
    return {items:draft.items || {},groups:draft.groups || {},updatedAt:draft.updatedAt||null,pending:!!draft.pending};
  } catch (_) { return {items:{},groups:{},updatedAt:null,pending:false}; }
}
function setDraft() {
  if (!state.activeNik) return;
  localStorage.setItem(localKey(state.activeNik), JSON.stringify({
    items:state.form.items, groups:state.form.groups, versions:state.form.versions,
    groupVersions:state.form.groupVersions, updatedAt:new Date().toISOString(), pending:true
  }));
  $('#save-label').textContent = 'Draft tersimpan di perangkat · belum dikirim';
  const sync = $('#sync-state');
  if (sync) sync.innerHTML = '<b>● Draft tersimpan di perangkat</b><span>Perubahan akan dikirim setelah tombol Simpan ditekan.</span>';
}
function itemStats(items) {
  const result = {rated:0,ready:0,missing:0,damaged:0,unchecked:0,below:0,unrated:0};
  items.forEach(item => {
    const v = state.form.items[item.id] || {};
    if (v.presence !== 'ada' && v.presence !== 'tidak_ada') { result.unrated++; return; }
    result.rated++;
    if (v.presence === 'tidak_ada') result.missing++;
    if (v.condition === 'rusak' || Number(v.damaged || 0) > 0) result.damaged++;
    if (v.condition === 'belum_dicek') result.unchecked++;
    if (item.target != null && v.presence === 'ada' && v.actual !== '' && Number(v.actual) < Number(item.target)) result.below++;
    const quantityOk = item.target == null || v.actual === '' || Number(v.actual) >= Number(item.target);
    if (v.presence === 'ada' && v.condition === 'baik' && quantityOk && !Number(v.damaged || 0)) result.ready++;
  });
  return result;
}
function coopStats(coop) {
  return {
    rated:Number(coop.items_rated || 0), total:Number(coop.items_total || state.allItems.length),
    ready:Number(coop.items_ready || 0), missing:Number(coop.items_missing || 0),
    damaged:Number(coop.items_damaged || 0), unchecked:Number(coop.items_unchecked || 0),
    below:Number(coop.items_below_plan || 0), last:coop.last_saved_at || null
  };
}
function statusName(coop) {
  const s = coopStats(coop);
  if (!s.rated) return 'Belum mulai';
  if (s.rated >= s.total && s.ready >= s.total && !s.missing && !s.damaged && !s.unchecked && !s.below) return 'Siap';
  if (s.missing || s.damaged || s.unchecked || s.below) return 'Perlu perhatian';
  return 'Berjalan';
}
function coopName(coop) { return coop?.kdkmp ? 'KDKMP ' + coop.kdkmp : 'Koperasi belum dipilih'; }
function currentCoop() {
  state.activeCoop = state.coops.find(x => String(x.nik) === String(state.activeNik)) || state.coops[0] || null;
  if (state.activeCoop) {
    state.activeNik = String(state.activeCoop.nik);
    sessionStorage.setItem('kdmp-active-nik',state.activeNik);
  }
  return state.activeCoop;
}
function field(label,key,value,options,kind='select') {
  let input;
  if (kind === 'number') {
    input = '<input class="input" type="number" min="0" step="1" value="' + esc(value ?? '') +
      '" data-key="' + esc(state.fieldItem) + '" data-field="' + key + '" inputmode="numeric" ' + (canEditActive()?'':'disabled') + '>';
  } else {
    input = '<select class="input" data-key="' + esc(state.fieldItem) + '" data-field="' + key + '">' +
      '<option value="">Pilih…</option>' + options.map(o => '<option value="' + esc(o.value ?? o) + '"' +
      ((value ?? '') === (o.value ?? o) ? ' selected' : '') + '>' + esc(o.label ?? o) + '</option>').join('') + '</select>';
    if(!canEditActive()) input=input.replace('<select class="input"','<select class="input" disabled');
  }
  return '<label class="detail-field"><span>' + label + '</span>' + input + '</label>';
}
function canEditActive(){return role==='pmo'||(['manager','pengurus'].includes(role)&&String(state.activeNik)===String(sessionStorage.getItem('kdmp-nik')));}
function specialFields(item,v) {
  const name=item.name.toLowerCase();
  const old=state.fieldItem;
  state.fieldItem=item.id;
  let fields='';
  if (name.includes('sumber air')) {
    fields += field('Status rencana','status_rencana',v.status_rencana,['Permanen','Sementara']);
    fields += field('Jenis sumber air','jenis_air',v.jenis_air,['Sumur bor','Sumur warga','Sumur desa','PAM desa','PAMSIMAS','Aliran sungai','Lainnya']);
    if(v.presence==='ada')fields += field('Terhubung ke instalasi air','terpasang',v.terpasang,['Ya','Tidak']);
  } else if (name.includes('pompa air')) {
    fields += field('Status fungsi','fungsi_pompa',v.fungsi_pompa,['Berfungsi','Belum dicek','Rusak']);
  } else if (name.includes('keran air')) {
    fields += field('Aliran air','teraliri',v.teraliri,['Teraliri','Tidak teraliri']);
  } else if (name.startsWith('wc ')) {
    fields += field('Tipe WC','tipe_wc',v.tipe_wc,['Jongkok','Duduk']);
    fields += field('Bidet / jet washer','bidet',v.bidet,['Ada','Tidak ada']);
    fields += field('Terhubung septic tank','terhubung_septic',v.terhubung_septic,['Ya','Tidak']);
  } else if (name.includes('instalasi listrik')) {
    fields += field('Kelayakan instalasi','layak',v.layak,['Layak','Tidak layak']);
    fields += field('Sertifikat SLO','slo',v.slo,['Ada','Tidak ada']);
    fields += field('Sumber listrik','sumber_listrik',v.sumber_listrik,['Ada','Tidak ada']);
    fields += field('MCB','mcb',v.mcb,['Ada','Tidak ada']);
    fields += field('Daya terpasang (VA)','daya_va',v.daya_va,['220','450','900','1.300','2.200','3.500','4.400','5.500','6.600','7.700','10.600','11.000','13.200','16.500','23.000','33.000','41.500','53.000','66.000','82.500','105.000','131.000','147.000','164.000','197.000','Di atas 197.000 VA (PLN)']);
    fields += field('Lokasi instalasi','lokasi_instalasi',v.lokasi_instalasi,['Dalam gudang utama','Luar gudang utama']);
    fields += field('Panel listrik','panel',v.panel,['Ada','Tidak ada']);
    fields += field('Lokasi panel','lokasi_panel',v.lokasi_panel,['Dalam gudang utama','Luar gudang utama']);
  } else if (name.includes('lampu')) {
    fields += field('Aliran listrik','teraliri',v.teraliri,['Ya','Tidak']);
    fields += field('Saklar','saklar',v.saklar,['Ada','Tidak ada']);
  }
  if(name.includes('wastafel'))fields += field('Aliran air','teraliri',v.teraliri,['Teraliri','Tidak teraliri']);
  state.fieldItem=old;
  return fields ? '<div class="detail-fields">' + fields + '</div>' : '';
}
function hasSpecs(item) {
  return !!(item.images?.files?.length || item.spec?.default || Object.keys(item.spec?.variants || {}).length);
}
function itemRow(item, number) {
  const v=state.form.items[item.id] || {};
  const hasTypes=(item.types || []).length > 0;
  const editable=canEditActive();
  const conditionDisabled=!editable || v.presence !== 'ada';
  const conditionLabel=item.name.toLowerCase().includes('pompa air')?'Fungsi':'Kondisi';
  const conditionHidden=v.presence==='tidak_ada'?' hidden':'';
  const typeOptions=(item.types || []).map(t => '<option value="' + esc(t) + '"' + (v.type === t?' selected':'') + '>' + esc(t) + '</option>').join('');
  const visibleImage=hasSpecs(item);
  return '<article class="item-card" data-name="' + esc(item.name.toLowerCase()) + '" data-item-id="' + esc(item.id) + '">' +
    '<div class="item-main"><div class="item-info"><span class="item-number">' + number + '</span><div><strong>' + esc(item.name) +
      '</strong><small>Rencana: ' + (item.target == null ? 'Tidak ditentukan' : fmt(item.target)) + (item.target == null ? '' : ' unit') + '</small></div></div>' +
    '<button class="view" type="button" data-media-key="' + esc(item.id) + '" ' + (!visibleImage?'disabled':'') +
      ' aria-label="' + (visibleImage?'Lihat gambar dan spesifikasi ':'Gambar dan spesifikasi belum tersedia untuk ') + esc(item.name) + '" title="' +
      (visibleImage?'Lihat gambar dan spesifikasi':'Gambar dan spesifikasi belum tersedia') + '"><svg class="eye-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg><small>Gambar/spek</small></button>' +
    '<label class="control"><span>Keberadaan</span><select class="input" data-key="' + esc(item.id) + '" data-field="presence" ' + (!editable?'disabled':'') + '>' +
      '<option value="">Belum dinilai</option><option value="ada"' + (v.presence==='ada'?' selected':'') + '>Ada</option>' +
      '<option value="tidak_ada"' + (v.presence==='tidak_ada'?' selected':'') + '>Tidak Ada</option></select></label>' +
    (hasTypes?'<label class="control"><span>Tipe / varian</span><select class="input" data-key="' + esc(item.id) + '" data-field="type" ' + (!editable?'disabled':'') + '><option value="">Pilih tipe</option>' + typeOptions + '</select></label>':'') +
    '<label class="control' + conditionHidden + '" data-condition-control><span>' + conditionLabel + '</span><select class="input" data-key="' + esc(item.id) + '" data-field="condition" ' + (conditionDisabled?'disabled':'') + '>' +
      '<option value="">Belum dinilai</option><option value="baik"' + (v.condition==='baik'?' selected':'') + '>' + (conditionLabel==='Fungsi'?'Berfungsi':'Baik') + '</option>' +
      '<option value="belum_dicek"' + (v.condition==='belum_dicek'?' selected':'') + '>Belum dicek</option>' +
      '<option value="rusak"' + (v.condition==='rusak'?' selected':'') + '>Rusak</option></select></label>' +
    '<label class="control"><span>Jumlah aktual</span><input class="input" type="number" min="0" step="1" inputmode="numeric" value="' + esc(v.actual ?? '') + '" data-key="' + esc(item.id) + '" data-field="actual" ' + (!editable?'disabled':'') + '></label>' +
    (v.condition==='rusak'?'<label class="control"><span>Jumlah rusak</span><input class="input" type="number" min="0" step="1" inputmode="numeric" value="' + esc(v.damaged ?? '') + '" data-key="' + esc(item.id) + '" data-field="damaged" ' + (!editable?'disabled':'') + '></label>':'') + '</div>' +
    specialFields(item,v) +
    '<label class="note-field' + (v.condition==='rusak'?' note-damaged':'') + '"><span>Catatan lapangan' + (v.condition==='rusak'?' · WAJIB':'') + '</span><textarea maxlength="1000" rows="2" data-key="' + esc(item.id) + '" data-field="note" ' + (!editable?'disabled':'') +
      ' placeholder="Tambahkan kondisi, variasi unit, atau temuan lapangan">' + esc(v.note || '') + '</textarea>' +
      '<small class="field-reminder note-hint hidden" data-note-hint></small></label></article>';
}
function groupSection(group,index) {
  const items=group.items;
  const stats=itemStats(items);
  const assessment=state.form.groups[group.id] || '';
  return '<section class="card group collapsed" data-group="' + esc(group.id) + '"><div class="grouphead">' +
    '<button class="group-toggle" type="button" aria-expanded="false" aria-label="Buka ' + esc(group.name) + '"><span class="num">' + String(index+1).padStart(2,'0') + '</span>' +
    '<span class="group-title"><strong>' + esc(group.name) + '</strong><small>' + items.length + ' item · ' + stats.rated + ' sudah dinilai</small></span><span class="group-chevron" aria-hidden="true">⌄</span></button>' +
    '<label class="group-assessment"><span>Status kelompok</span><select class="input" data-group-key="' + esc(group.id) + '" ' + (!canEditActive()?'disabled':'') + '>' +
      '<option value="">Belum dinilai</option><option value="ada"' + (assessment==='ada'?' selected':'') + '>Ada</option>' +
      '<option value="tidak_ada"' + (assessment==='tidak_ada'?' selected':'') + '>Tidak Ada</option>' +
      '<option value="custom"' + (assessment==='custom'?' selected':'') + '>Sebagian / khusus</option></select></label>' +
    '<span class="group-progress">' + stats.rated + '/' + items.length + ' dinilai</span></div>' +
    '<div class="group-items">' + items.map((item,i)=>itemRow(item, item.formNo || (index+1)+'.'+(i+1))).join('') + '</div></section>';
}
function formStatsMarkup(stats) {
  return '<div class="formmetrics">' +
    '<div class="card"><small>Kelengkapan</small><b id="metric-rated">' + stats.rated + ' / ' + state.allItems.length + '</b></div>' +
    '<div class="card"><small>Siap</small><b id="metric-ready">' + stats.ready + '</b></div>' +
    '<div class="card"><small>Perlu perhatian</small><b id="metric-attention">' + (stats.missing+stats.damaged+stats.unchecked+stats.below) + '</b></div>' +
    '<div class="card"><small>Belum dinilai</small><b id="metric-unrated">' + stats.unrated + '</b></div></div>';
}
function summaryPage() {
  const d=state.dashboard;
  if (!d) return errorPanel(state.error || 'Ringkasan sedang dimuat…');
  const coops=filteredSummaryCoops();
  const t=summaryTotals(coops);
  const districts=d.districts || [];
  const priorities=summaryPriorities(coops);
  const rows=coops.slice(0,8).map(coopTableRow).join('');
  const districtRows=districts.filter(x=>state.district==='all'||x.kecamatan===state.district)
    .sort((a,b)=>Number(b.completion_pct||0)-Number(a.completion_pct||0)).slice(0,8).map(x =>
      '<div class="district-row"><span>' + esc(x.kecamatan || 'Belum diketahui') + '</span><div class="track"><i style="width:' + percent(x.items_rated,x.items_total) + '%"></i></div>' +
      '<b>' + percent(x.items_rated,x.items_total) + '%</b><small>' + fmt(x.coops_started) + '/' + fmt(x.coop_count) + ' mulai</small></div>').join('');
  return '<div class="heading"><div><span class="eyebrow">PEMANTAUAN KABUPATEN</span><h1>Ringkasan pendataan</h1><div class="muted">Data dihitung dari isian yang tersimpan di server. Terakhir diperbarui ' + esc(dateTime(d.generated_at)) + '.</div></div>' +
    '<div class="actions"><select class="input" id="summary-district"><option value="all">Semua kecamatan</option>' +
      (d.districts||[]).map(x=>'<option value="' + esc(x.kecamatan) + '"' + (state.district===x.kecamatan?' selected':'') + '>' + esc(x.kecamatan) + '</option>').join('') +
      '</select><select class="input" id="summary-village"><option value="all">Semua desa</option>' +
      [...new Set(state.coops.filter(c=>state.district==='all'||c.kecamatan===state.district).map(c=>c.desa).filter(Boolean))].sort().map(x=>'<option value="' + esc(x) + '"' + (state.village===x?' selected':'') + '>' + esc(x) + '</option>').join('') +
      '</select><select class="input" id="summary-status"><option value="all">Semua status</option>' +
      ['Belum mulai','Berjalan','Perlu perhatian','Siap'].map(x=>'<option value="' + x + '"' + (state.summaryStatus===x?' selected':'') + '>' + x + '</option>').join('') +
      '</select><input class="input summary-search" id="summary-search" type="search" value="' + esc(state.summarySearch) + '" placeholder="Cari koperasi / NIK">' +
      '<button class="btn primary" data-page="export">↓ Ekspor data</button></div></div>' +
    '<div class="card context"><div><strong>Seluruh wilayah kerja</strong><small>' + fmt(t.coop_count) + ' KDKMP · ' + fmt(t.district_count) + ' kecamatan · ' +
      fmt(t.items_total) + ' peluang penilaian item · katalog ' + state.allItems.length + ' item</small></div><span class="chip">' + esc(roleLabel) + '</span></div>' +
    '<div class="metrics">' +
      metric('Kelengkapan pendataan',percent(t.items_rated,t.items_total)+'%',fmt(t.items_rated)+' dari '+fmt(t.items_total)+' item sudah dinilai','blue') +
      metric('Item siap',fmt(t.items_ready),fmt(t.items_scored)+' item sudah dinilai','green') +
      metric('Perlu perhatian',fmt(t.items_attention),fmt(t.coops_attention)+' koperasi memiliki temuan','gold') +
      metric('Belum mulai',fmt(t.coops_not_started),fmt(t.coops_started)+' koperasi sudah memiliki isian','violet') +
    '</div><div class="summary-kpis">' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Komposisi status item</strong><small class="block-muted">Penyebut hanya item yang sudah dinilai</small></div></div><div class="panelbody">' +
        statusBar('Siap',t.items_ready,t.items_scored,'green') + statusBar('Tidak Ada',t.items_missing,t.items_scored,'red') +
        statusBar('Rusak',t.items_damaged,t.items_scored,'gold') + statusBar('Belum dicek',t.items_unchecked,t.items_scored,'violet') +
        '<div class="summary-unrated">Belum dinilai <b>' + fmt(t.items_unrated) + '</b> item</div></div></article>' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Temuan prioritas</strong><small class="block-muted">Jumlah temuan pada isian yang disimpan</small></div>' +
        '<button class="btn small" data-page="coops">Buka daftar koperasi →</button></div><div class="panelbody">' +
        priorityRows(priorities) + '</div></article></div>' +
    '<div class="summary-kpis">' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Progres per kecamatan</strong><small class="block-muted">Kelengkapan item rata-rata</small></div></div>' +
        '<div class="panelbody district-list">' + (districtRows || '<div class="empty">Belum ada data kecamatan.</div>') + '</div></article>' +
      '<article class="card summary-card"><div class="panelhead"><div><strong>Aktivitas pendataan</strong><small class="block-muted">Waktu penyimpanan terbaru yang tercatat</small></div></div>' +
        '<div class="panelbody activity"><div><b>' + fmt(t.coops_started) + '</b><small>Koperasi mulai mengisi</small></div>' +
        '<div><b>' + fmt(t.coops_complete) + '</b><small>Lengkap dinilai</small></div>' +
        '<div><b>' + fmt(t.items_rated) + '</b><small>Item sudah dinilai</small></div>' +
        '<div><b>' + esc(dateTime(t.last_saved_at)) + '</b><small>Simpan terbaru</small></div></div></article></div>' +
    '<section class="card table"><div class="panelhead"><div><strong>Daftar koperasi</strong><small class="block-muted">Menampilkan hingga delapan koperasi sesuai filter ringkasan.</small></div>' +
      '<button class="btn" data-page="coops">Lihat semua koperasi →</button></div><table><thead><tr><th>Koperasi / NIK</th><th>Desa / Kecamatan</th><th>Kelengkapan</th><th>Siap / dinilai</th><th>Temuan</th><th>Status</th><th></th></tr></thead><tbody>' + (rows || '<tr><td colspan="7" class="empty">Tidak ada data pada filter ini.</td></tr>') + '</tbody></table></section>';
}
function metric(title,value,foot,tone) {
  return '<div class="metric metric-' + tone + '"><label>' + title + '</label><b>' + value + '</b><small>' + foot + '</small></div>';
}
function statusBar(label,value,total,tone) {
  return '<div class="barrow"><span>' + label + '</span><div class="track"><i class="fill-' + tone + '" style="width:' + percent(value,total) + '%"></i></div><b>' +
    fmt(value) + ' <small>(' + percent(value,total) + '%)</small></b></div>';
}
function priorityRows(rows) {
  const map={missing:['Tidak Ada','red','×'],damaged:['Rusak','gold','!'],unchecked:['Belum dicek','violet','◷'],below:['Di bawah rencana','blue','↓']};
  return ['missing','damaged','unchecked','below'].map(key => {
    const p=rows.find(x=>x.kind===key) || {count:0,coops:0};
    const x=map[key];
    return '<div class="finding"><span class="ficon tone-' + x[1] + '">' + x[2] + '</span><div><b>' + x[0] + '</b><small>' +
      fmt(p.coops) + ' koperasi terdampak</small></div><span class="count">' + fmt(p.count) + '</span></div>';
  }).join('');
}
function coopTableRow(c) {
  const s=coopStats(c), problems=s.missing+s.damaged+s.unchecked+s.below;
  const status=statusName(c), cls=status==='Siap'?'ok':status==='Belum mulai'?'neutral':'';
  return '<tr><td><b>' + esc(coopName(c)) + '</b><small>NIK ' + esc(c.nik) + '</small></td>' +
    '<td>' + esc(c.desa || '—') + '<small>' + esc(c.kecamatan || '—') + '</small></td>' +
    '<td><div class="cell-progress"><span>' + fmt(s.rated) + ' / ' + fmt(s.total) + '</span><i><b style="width:' + percent(s.rated,s.total) + '%"></b></i></div></td>' +
    '<td>' + fmt(s.ready) + ' / ' + fmt(s.rated) + '</td><td>' + fmt(problems) + '</td>' +
    '<td><span class="status ' + cls + '">' + esc(status) + '</span></td><td><button class="btn small" data-open-coop data-nik="' +
    esc(c.nik) + '">Detail</button></td></tr>';
}
function filteredSummaryCoops() {
  return state.coops.filter(c => (coopName(c)+' '+c.nik+' '+(c.desa||'')+' '+(c.kecamatan||'')).toLowerCase().includes(state.summarySearch.toLowerCase()) &&
    (state.district==='all' || c.kecamatan===state.district) &&
    (state.village==='all' || c.desa===state.village) &&
    (state.summaryStatus==='all' || statusName(c)===state.summaryStatus));
}
function summaryTotals(coops) {
  const totals={coop_count:coops.length,district_count:new Set(coops.map(c=>c.kecamatan).filter(Boolean)).size,
    items_total:0,items_rated:0,items_ready:0,items_missing:0,items_damaged:0,items_unchecked:0,
    items_below_plan:0,coops_not_started:0,coops_started:0,coops_complete:0,coops_attention:0,last_saved_at:null};
  coops.forEach(c=>{
    const s=coopStats(c),problem=s.missing+s.damaged+s.unchecked+s.below;
    totals.items_total+=s.total;totals.items_rated+=s.rated;totals.items_ready+=s.ready;
    totals.items_missing+=s.missing;totals.items_damaged+=s.damaged;totals.items_unchecked+=s.unchecked;
    totals.items_below_plan+=s.below;totals.coops_not_started+=s.rated===0?1:0;
    totals.coops_started+=s.rated>0?1:0;totals.coops_complete+=s.rated>=s.total?1:0;
    totals.coops_attention+=problem>0?1:0;
    if(s.last && (!totals.last_saved_at || s.last>totals.last_saved_at))totals.last_saved_at=s.last;
  });
  totals.items_scored=totals.items_rated;totals.items_unrated=Math.max(0,totals.items_total-totals.items_rated);
  totals.items_attention=totals.items_missing+totals.items_damaged+totals.items_unchecked+totals.items_below_plan;
  return totals;
}
function summaryPriorities(coops) {
  return [['missing','missing'],['damaged','damaged'],['unchecked','unchecked'],['below','below']].map(([kind,key])=>
    ({kind,count:coops.reduce((n,c)=>n+coopStats(c)[key],0),coops:coops.filter(c=>coopStats(c)[key]>0).length}));
}
function coopsPage() {
  const districts=[...new Set(state.coops.map(c=>c.kecamatan).filter(Boolean))].sort();
  const filtered=state.coops.filter(c => {
    const terms=(coopName(c)+' '+c.nik+' '+(c.desa||'')+' '+(c.kecamatan||'')).toLowerCase();
    return terms.includes(state.coopSearch.toLowerCase()) &&
      (state.coopDistrict==='all' || c.kecamatan===state.coopDistrict) &&
      (state.coopStatus==='all' || statusName(c)===state.coopStatus);
  });
  const pages=state.coopPageSize==='all'?1:Math.max(1,Math.ceil(filtered.length/Number(state.coopPageSize)));
  state.coopPage=Math.min(state.coopPage,pages);
  const shown=state.coopPageSize==='all'?filtered:filtered.slice((state.coopPage-1)*Number(state.coopPageSize),state.coopPage*Number(state.coopPageSize));
  const rows=shown.map(coopTableRow).join('');
  return '<div class="heading"><div><span class="eyebrow">DATA WILAYAH</span><h1>Daftar koperasi</h1><div class="muted">Cari, saring, dan buka pendataan KDKMP yang berada dalam cakupan akses Anda.</div></div>' +
    '<button class="btn primary" data-page="export">↓ Ekspor</button></div><div class="coop-tools">' +
    '<input id="coop-search" class="input" type="search" value="' + esc(state.coopSearch) + '" placeholder="Cari nama, desa, atau NIK">' +
    '<select class="input" id="coop-district"><option value="all">Semua kecamatan</option>' + districts.map(x=>'<option value="' + esc(x) + '"' + (state.coopDistrict===x?' selected':'') + '>' + esc(x) + '</option>').join('') + '</select>' +
    '<select class="input" id="coop-status"><option value="all">Semua status</option>' + ['Belum mulai','Berjalan','Perlu perhatian','Siap'].map(x=>'<option' + (state.coopStatus===x?' selected':'') + '>' + x + '</option>').join('') + '</select>' +
    '<label class="page-size">Tampilkan <select class="input" id="coop-page-size"><option value="20"' + (state.coopPageSize===20?' selected':'') + '>20</option><option value="50"' + (state.coopPageSize===50?' selected':'') + '>50</option><option value="100"' + (state.coopPageSize===100?' selected':'') + '>100</option><option value="all"' + (state.coopPageSize==='all'?' selected':'') + '>Semua</option></select></label>' +
    '<span class="muted">' + fmt(filtered.length) + ' dari ' + fmt(state.coops.length) + ' koperasi</span></div>' +
    '<section class="card table coop-table"><table><thead><tr><th>Koperasi / NIK</th><th>Desa / Kecamatan</th><th>Kelengkapan</th><th>Siap / dinilai</th><th>Temuan</th><th>Status</th><th></th></tr></thead><tbody id="coop-rows">' +
      (rows || '<tr><td colspan="7" class="empty">Tidak ada koperasi yang cocok.</td></tr>') + '</tbody></table></section>' +
    '<div class="pagination"><button class="btn" id="coop-prev" ' + (state.coopPage<=1?'disabled':'') + '>← Sebelumnya</button><span>Halaman ' + state.coopPage + ' dari ' + pages + '</span><button class="btn" id="coop-next" ' + (state.coopPage>=pages?'disabled':'') + '>Berikutnya →</button></div>';
}
function exportPage() {
  const isPmo=role==='pmo' || role==='guest';
  const coopOptions=state.coops.map(c => '<option value="' + esc(c.nik) + '"' + (c.nik===state.activeNik?' selected':'') + '>' +
    esc(coopName(c) + ' · ' + (c.desa || '') + ' · NIK ' + c.nik) + '</option>').join('');
  return '<div class="heading"><div><span class="eyebrow">LAPORAN</span><h1>Ekspor data</h1><div class="muted">Unduh CSV berformat UTF-8 yang dapat dibuka di Microsoft Excel atau LibreOffice.</div></div></div>' +
    '<div class="export-grid"><article class="card export-card"><div class="export-icon">▤</div><h2>Ringkasan koperasi</h2><p>Progress dan jumlah temuan per koperasi mengikuti filter saat ini.</p>' +
      '<button class="btn primary" id="export-summary">Unduh ringkasan CSV</button><small>Termasuk kecamatan, desa, kelengkapan, status, jumlah temuan, dan waktu simpan.</small></article>' +
    '<article class="card export-card"><div class="export-icon">☷</div><h2>Detail sarana-prasarana</h2><p>Seluruh item dan detail isian dari satu koperasi, beserta tipe dan catatan lapangan.</p>' +
      '<label class="export-select">Koperasi<select class="input" id="export-nik">' + coopOptions + '</select></label>' +
      '<button class="btn primary" id="export-detail">Unduh detail CSV</button><small>' + (isPmo?'Pilih satu koperasi. Ekspor seluruh kabupaten dapat dilakukan melalui ringkasan.':'Ekspor hanya tersedia untuk koperasi dalam cakupan akun.') + '</small></article></div>' +
    '<div class="card export-note"><strong>Catatan data</strong><p>Gambar dan aset tidak dimasukkan ke CSV; file gambar tetap berada di folder aset hosting. Spesifikasi katalog ikut tersedia di panel detail aplikasi.</p></div>';
}
function sarprasPage() {
  const coop=currentCoop();
  if (!coop) return errorPanel('Pilih koperasi dari daftar sebelum membuka Form B.', 'coops');
  const stats=itemStats(state.allItems);
  const groupMarkup=state.catalog.map(groupSection).join('');
  const draft=getDraft();
  const pending=!!(draft.updatedAt || draft.pending);
  return '<div class="heading"><div><span class="eyebrow">PRA-VERVAL · FORM B</span><h1>Pendataan sarana-prasarana</h1><div class="muted">' +
    esc(coopName(coop)) + ' · NIK ' + esc(coop.nik) + ' · ' + esc(coop.desa || '—') + ', ' + esc(coop.kecamatan || '—') + '</div></div>' +
    '<button class="btn" data-page="coops">Ganti koperasi</button></div>' +
    '<div class="card context"><div><strong>Form pendataan ' + esc(coopName(coop)) + '</strong><small>Urutan dan target berasal dari katalog Form B. Isian kosong tetap dapat disimpan.</small></div>' +
      '<span class="chip">' + esc(roleLabel) + (readOnly?' · hanya lihat':' · dapat mengisi') + '</span></div>' +
    '<div class="mini-summary"><div class="mini-head"><div><strong>Progres form ini</strong><small>Terpisah dari Ringkasan kabupaten.</small></div>' +
      '<span class="muted">Simpan terakhir: ' + esc(dateTime(coop.last_saved_at)) + '</span></div>' + formStatsMarkup(stats) + '</div>' +
    '<div class="sync" id="sync-state"><b>' + (pending?'● Draft lokal siap dikirim':'● Data dari server siap') + '</b><span>' +
      (pending?'Perubahan terakhir ' + esc(dateTime(draft.updatedAt)) + '. Belum disimpan ke server.':'Perubahan hanya terkirim saat Anda menekan Simpan.') + '</span></div>' +
    '<div class="filters"><input id="item-search" class="input" type="search" value="' + esc(state.itemSearch) + '" placeholder="Cari nama item">' +
      '<select class="input" id="item-filter"><option value="all">Semua item</option><option value="empty"' + (state.itemFilter==='empty'?' selected':'') + '>Belum dinilai</option>' +
      '<option value="none"' + (state.itemFilter==='none'?' selected':'') + '>Tidak Ada</option><option value="attention"' + (state.itemFilter==='attention'?' selected':'') + '>Perlu perhatian</option></select>' +
      '<span class="muted">' + state.allItems.length + ' item · ' + state.catalog.length + ' kelompok</span></div>' +
      '<div id="form-groups">' + groupMarkup + '</div><div class="form-end"><button class="btn primary" id="save-bottom" ' + (!canEditActive()?'disabled':'') + '>Simpan seluruh form</button>' +
      '<small>Draft lokal dipisahkan per NIK koperasi dan tidak menggantikan simpan ke server.</small></div>';
}
function errorPanel(message,link) {
  return '<div class="error-panel"><span>!</span><div><strong>Belum dapat menampilkan data</strong><p>' + esc(message) + '</p>' +
    (link?'<button class="btn" data-page="' + link + '">Buka daftar koperasi</button>':'') + '</div></div>';
}
function updateFormMetrics() {
  const stats=itemStats(state.allItems);
  const rated=$('#metric-rated'),ready=$('#metric-ready'),attention=$('#metric-attention'),unrated=$('#metric-unrated');
  if(rated) rated.textContent=stats.rated+' / '+state.allItems.length;
  if(ready) ready.textContent=stats.ready;
  if(attention) attention.textContent=stats.missing+stats.damaged+stats.unchecked+stats.below;
  if(unrated) unrated.textContent=stats.unrated;
  $$('.group').forEach(node => {
    const group=state.catalog.find(g=>g.id===node.dataset.group);
    if(!group)return;
    const s=itemStats(group.items),label=node.querySelector('.group-title small'),progress=node.querySelector('.group-progress');
    if(label)label.textContent=group.items.length+' item · '+s.rated+' sudah dinilai';
    if(progress)progress.textContent=s.rated+'/'+group.items.length+' dinilai';
    const badge=node.querySelector('.num');
    if(badge){badge.classList.toggle('complete',s.rated===group.items.length&&group.items.length>0);badge.classList.toggle('partial',s.rated>0&&s.rated<group.items.length);}
  });
  applyItemFilters();
}
function refreshNoteHint(row) {
  const key=row.dataset.itemId,v=state.form.items[key]||{},item=state.allItems.find(x=>x.id===key);
  const hints=[];
  if(v.condition==='rusak'&&!String(v.note||'').trim())hints.push('Wajib isi catatan: jelaskan kerusakan yang ditemukan.');
  if(key==='OPS_SUMBER_AIR'&&v.presence==='tidak_ada'&&!String(v.note||'').trim())hints.push('Tambahkan alasan atau rencana tindak lanjut sumber air.');
  if(Number(v.actual)>1)hints.push('Jika kondisi unit berbeda, jelaskan rinciannya di catatan.');
  const target=row.querySelector('[data-note-hint]');
  if(target){target.textContent=hints.join(' ');target.classList.toggle('hidden',hints.length===0);}
}
function applyItemFilters() {
  const term=state.itemSearch.toLowerCase();
  $$('.item-card').forEach(node => {
    const item=state.allItems.find(i=>i.id===node.dataset.itemId),v=state.form.items[node.dataset.itemId]||{};
    const matchesName=node.dataset.name.includes(term);
    const matchesState=state.itemFilter==='empty'?!v.presence:
      state.itemFilter==='none'?v.presence!=='tidak_ada':
      state.itemFilter==='attention'?!(v.presence==='tidak_ada'||v.condition==='rusak'||v.condition==='belum_dicek'||(item?.target!=null&&v.actual!==''&&Number(v.actual)<item.target)):true;
    node.classList.toggle('filtered-out',!matchesName || !matchesState);
  });
  $$('.group').forEach(group => {
    group.classList.toggle('filtered-out',!group.querySelector('.item-card:not(.filtered-out)'));
  });
}
function renderPage(page,push=true) {
  if (!['summary','coops','sarpras','export'].includes(page)) page='summary';
  state.page=page;
  $$('.page').forEach(node=>node.classList.toggle('hidden',node.id!=='page-'+page));
  $$('.nav').forEach(node=>node.classList.toggle('active',node.dataset.page===page));
  const target=$('#page-'+page);
  if(page==='summary') target.innerHTML=summaryPage();
  if(page==='coops') target.innerHTML=coopsPage();
  if(page==='sarpras') target.innerHTML=sarprasPage();
  if(page==='export') target.innerHTML=exportPage();
  $('#savebar').classList.toggle('hidden',page!=='sarpras'||!canEditActive());
  if(page==='sarpras') bindFormPage();
  if(page==='coops') bindCoopsPage();
  if(page==='summary') bindSummaryPage();
  if(page==='export') bindExportPage();
  if(push) {
    history.pushState({page:page},'', '#' + page);
    window.scrollTo({top:0,behavior:'smooth'});
  }
}
function bindSummaryPage() {
  const select=$('#summary-district');
  if(select)select.addEventListener('change',()=>{state.district=select.value;state.village='all';renderPage('summary',false);});
  const status=$('#summary-status');
  if(status)status.addEventListener('change',()=>{state.summaryStatus=status.value;renderPage('summary',false);});
  const village=$('#summary-village');
  if(village)village.addEventListener('change',()=>{state.village=village.value;renderPage('summary',false);});
  const search=$('#summary-search');
  if(search)search.addEventListener('input',()=>{
    const position=search.selectionStart;state.summarySearch=search.value;renderPage('summary',false);
    const next=$('#summary-search');next?.focus();next?.setSelectionRange(position,position);
  });
  $$('#page-summary [data-open-coop]').forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function bindCoopsPage() {
  const search=$('#coop-search'),district=$('#coop-district'),status=$('#coop-status');
  if(search) search.addEventListener('input',()=>{state.coopSearch=search.value;state.coopPage=1;renderPage('coops',false);});
  if(district) district.addEventListener('change',()=>{state.coopDistrict=district.value;state.coopPage=1;renderPage('coops',false);});
  if(status) status.addEventListener('change',()=>{state.coopStatus=status.value;state.coopPage=1;renderPage('coops',false);});
  $('#coop-page-size')?.addEventListener('change',e=>{state.coopPageSize=e.target.value==='all'?'all':Number(e.target.value);state.coopPage=1;renderPage('coops',false);});
  $('#coop-prev')?.addEventListener('click',()=>{state.coopPage--;renderPage('coops',false);});
  $('#coop-next')?.addEventListener('click',()=>{state.coopPage++;renderPage('coops',false);});
  $$('#page-coops [data-open-coop]').forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function refreshCoopTable() {
  const body=$('#coop-rows');
  if(!body)return;
  const filtered=state.coops.filter(c=>(coopName(c)+' '+c.nik+' '+(c.desa||'')+' '+(c.kecamatan||'')).toLowerCase().includes(state.coopSearch.toLowerCase()) &&
    (state.coopDistrict==='all'||c.kecamatan===state.coopDistrict) &&
    (state.coopStatus==='all'||statusName(c)===state.coopStatus));
  const slice=state.coopPageSize==='all'?filtered:filtered.slice((state.coopPage-1)*state.coopPageSize,state.coopPage*state.coopPageSize);
  body.innerHTML=slice.map(coopTableRow).join('')||'<tr><td colspan="7" class="empty">Tidak ada koperasi yang cocok.</td></tr>';
  const count=$('#page-coops .coop-tools .muted');
  if(count)count.textContent=fmt(filtered.length)+' dari '+fmt(state.coops.length)+' koperasi';
  $$('[data-open-coop]',body).forEach(btn=>btn.addEventListener('click',()=>openCoop(btn.dataset.nik)));
}
function openCoop(nik) {
  const coop=state.coops.find(c=>String(c.nik)===String(nik));
  if(!coop)return;
  state.activeNik=String(nik);
  sessionStorage.setItem('kdmp-active-nik',state.activeNik);
  state.activeCoop=coop;
  state.itemSearch='';state.itemFilter='all';
  loadCoopForm().then(()=>renderPage('sarpras')).catch(error=>toast(error.message,'error'));
}
async function loadCatalog() {
  const h=apiHeaders();
  const [groupsRes,itemsRes,imagesRes]=await Promise.all([
    fetch(cfg.url+'/rest/v1/sarpras_kelompok?select=kelompok_id,nama_kelompok,urutan&aktif=eq.true&order=urutan',{headers:h}),
    fetch(cfg.url+'/rest/v1/sarpras_katalog?select=item_id,kelompok_id,nama_item,urutan,jumlah_rencana,daftar_tipe,spesifikasi&aktif=eq.true&order=urutan',{headers:h}),
    fetch('./assets/catalog-images.json')
  ]);
  if(!groupsRes.ok||!itemsRes.ok||!imagesRes.ok)throw new Error('Katalog atau peta gambar sarpras tidak dapat dimuat.');
  const groups=await groupsRes.json(),items=await itemsRes.json(),imageMap=await imagesRes.json();
  state.catalog=groups.map(g=>({
    id:g.kelompok_id,name:g.nama_kelompok,order:g.urutan,
    items:items.filter(it=>it.kelompok_id===g.kelompok_id).map((it,i)=>({
      id:it.item_id,name:it.nama_item,target:it.jumlah_rencana,types:it.daftar_tipe||[],
      spec:it.spesifikasi||{},images:{files:[]},order:it.urutan,formNo:null
    }))
  })).filter(g=>g.items.length);
  state.allItems=state.catalog.flatMap(g=>g.items);
  state.allItems.forEach((item,index)=>{
    item.formNo=index<70?String(index+1):'Tambahan';
    item.images={files:(imageMap[String(index+1)]?.files||[]).map(file=>'./assets/img/sarpras/'+file)};
  });
}
async function loadCoops() {
  const data=await rpc('kdmp_list_coops',{p_token:token()});
  state.coops=Array.isArray(data)?data:(data.coops||[]);
  if(!state.coops.length)throw new Error('Akun ini belum memiliki koperasi dalam cakupannya.');
  if(!state.coops.some(c=>String(c.nik)===String(state.activeNik))) {
    state.activeNik=String(sessionStorage.getItem('kdmp-nik')||state.coops[0].nik);
  }
  currentCoop();
}
async function loadDashboard() {
  state.dashboard=await rpc('kdmp_dashboard',{p_token:token()});
  state.coops=state.dashboard.coops||[];
  if(['manager','pengurus'].includes(role)) {
    const res=await fetch(cfg.url+'/rest/v1/rpc/kdmp_coop_picker',{method:'POST',headers:apiHeaders(),body:'{}'});
    if(res.ok) {
      const directory=await res.json(),known=new Map(state.coops.map(c=>[String(c.nik),c]));
      state.coops=directory.map(c=>known.get(String(c.nik))||{...c,items_total:state.allItems.length,items_rated:0,items_ready:0,items_missing:0,items_damaged:0,items_unchecked:0,items_below_plan:0,last_saved_at:null});
    }
  }
  if(!state.coops.length)throw new Error('Akun ini belum memiliki koperasi dalam cakupannya.');
  if(['manager','pengurus'].includes(role)) state.activeNik=String(sessionStorage.getItem('kdmp-nik')||'');
  if(!state.coops.some(c=>String(c.nik)===String(state.activeNik))) {
    state.activeNik=String(sessionStorage.getItem('kdmp-nik')||state.coops[0].nik);
  }
  currentCoop();
}
async function loadCoopForm() {
  if(!state.activeNik || !state.live)return;
  const n=state.activeNik;
  const data=await rpc('kdmp_load_form',{p_token:token(),p_nik:n});
  const serverItems={},versions={},serverGroups={},groupVersions={};
  (data.items||[]).forEach(row=>{
    const v={
      presence:row.keberadaan||'',condition:row.kondisi||'',actual:row.jumlah_aktual ?? '',
      damaged:row.jumlah_rusak ?? '',note:row.catatan||'',type:row.tipe_dipilih||'',...(row.detail||{})
    };
    serverItems[row.item_id]=v;versions[row.item_id]=Number(row.versi||0);
  });
  (data.groups||[]).forEach(row=>{
    serverGroups[row.kelompok_id]=row.penilaian_awal||'';
    groupVersions[row.kelompok_id]=Number(row.versi||0);
  });
  const saved=getDraft();
  state.form={
    items:Object.assign({},serverItems,saved.items||{}),
    groups:Object.assign({},serverGroups,saved.groups||{}),
    versions:versions,groupVersions:groupVersions
  };
  state.activeCoop=state.coops.find(c=>String(c.nik)===String(n))||state.activeCoop;
}
function bindFormPage() {
  const search=$('#item-search'),filter=$('#item-filter');
  if(search)search.addEventListener('input',()=>{state.itemSearch=search.value;applyItemFilters();});
  if(filter)filter.addEventListener('change',()=>{state.itemFilter=filter.value;applyItemFilters();});
  $$('#page-sarpras [data-key]').forEach(el => {
    const event=el.tagName==='TEXTAREA'||el.type==='number'?'input':'change';
    el.addEventListener(event,()=>handleField(el,false));
    if(event==='input')el.addEventListener('change',()=>handleField(el,true));
  });
  $$('#page-sarpras [data-group-key]').forEach(el=>el.addEventListener('change',()=>{
    if(!canEditActive())return;
    const group=state.catalog.find(g=>g.id===el.dataset.groupKey);
    if(group&&['ada','tidak_ada'].includes(el.value)) group.items.forEach(item=>{
      const input=$('[data-key="'+CSS.escape(item.id)+'"][data-field="presence"]');
      const presence=el.value==='ada'?'ada':'tidak_ada';
      state.form.items[item.id]=state.form.items[item.id]||{};state.form.items[item.id].presence=presence;
      if(input)input.value=presence;
      const condition=$('[data-key="'+CSS.escape(item.id)+'"][data-field="condition"]');
      if(condition){condition.disabled=presence!=='ada';if(presence!=='ada'){condition.value='';state.form.items[item.id].condition='';state.form.items[item.id].damaged='';}}
      const conditionField=input?.closest('.item-card')?.querySelector('[data-condition-control]');
      if(conditionField)conditionField.classList.toggle('hidden',presence!=='ada');
    });
    state.form.groups[el.dataset.groupKey]=el.value;
    setDraft();updateFormMetrics();
  }));
  $$('.group-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const group=btn.closest('.group');group.classList.toggle('collapsed');
    btn.setAttribute('aria-expanded',String(!group.classList.contains('collapsed')));
    btn.setAttribute('aria-label',(group.classList.contains('collapsed')?'Buka ':'Tutup ')+group.querySelector('.group-title strong').textContent);
  }));
  $('#save').onclick=saveForm;
  $('#save-bottom').onclick=saveForm;
  applyItemFilters();updateFormMetrics();
  $$('.item-card', $('#page-sarpras')).forEach(refreshNoteHint);
}
function handleField(el,updateVisibility) {
  if(!canEditActive())return;
  const key=el.dataset.key,fieldName=el.dataset.field;
  state.form.items[key]=state.form.items[key]||{};
  state.form.items[key][fieldName]=el.value;
  if(fieldName==='condition'&&el.value!=='rusak')state.form.items[key].damaged='';
  if(fieldName==='presence' && el.value!=='ada') {
    state.form.items[key].condition='';
    const condition=$('[data-key="' + CSS.escape(key) + '"][data-field="condition"]');
    if(condition){condition.value='';condition.disabled=true;}
    const label=el.closest('.item-card')?.querySelector('[data-condition-control]');
    if(label)label.classList.toggle('hidden',el.value==='tidak_ada');
  }
  if(fieldName==='presence' && el.value==='ada') {
    const condition=$('[data-key="' + CSS.escape(key) + '"][data-field="condition"]');
    if(condition)condition.disabled=false;
    const label=el.closest('.item-card')?.querySelector('[data-condition-control]');
    if(label)label.classList.remove('hidden');
  }
  if(fieldName==='presence') syncGroupAssessment(el.closest('.group'));
  const row=el.closest('.item-card');
  if(row)refreshNoteHint(row);
  setDraft();
  if(fieldName!=='note'||updateVisibility)updateFormMetrics();
}
function syncGroupAssessment(node){
  if(!node)return;
  const id=node.dataset.group,group=state.catalog.find(g=>g.id===id);if(!group)return;
  const vals=group.items.map(item=>state.form.items[item.id]?.presence||'');
  let value='';
  if(vals.every(v=>v==='ada'))value='ada';
  else if(vals.every(v=>v==='tidak_ada'))value='tidak_ada';
  else if(vals.some(Boolean))value='custom';
  state.form.groups[id]=value;
  const select=node.querySelector('[data-group-key]');if(select)select.value=value;
}
function groupAssessment(group) {return state.form.groups[group.id] || '';}
function serializeRows() {
  return state.allItems.map(item=>{
    const v=state.form.items[item.id]||{};
    if(v.condition==='rusak'&&!String(v.note||'').trim())throw new Error('Catatan lapangan wajib diisi untuk item rusak: '+item.name+'.');
    const actual=v.actual===''||v.actual==null?null:Number(v.actual);
    const damaged=v.damaged===''||v.damaged==null?null:Number(v.damaged);
    if(actual!=null&&(!Number.isInteger(actual)||actual<0))throw new Error('Jumlah aktual pada “'+item.name+'” harus bilangan bulat nol atau lebih.');
    if(damaged!=null&&(!Number.isInteger(damaged)||damaged<0||actual==null||damaged>actual))throw new Error('Jumlah rusak pada “'+item.name+'” harus bilangan bulat dan tidak boleh melebihi jumlah aktual.');
    const detail={};
    Object.entries(v).forEach(([key,value])=>{if(!['presence','condition','actual','damaged','note','type'].includes(key)&&value!==''&&value!=null)detail[key]=value;});
    return {
      item_id:item.id,expected_versi:state.form.versions[item.id] ?? null,
      tipe_dipilih:v.type||null,keberadaan:v.presence||null,
      kondisi:v.presence==='ada'?(v.condition||null):null,
      jumlah_aktual:actual,jumlah_rusak:damaged,catatan:String(v.note||'').slice(0,1000)||null,detail:detail
    };
  });
}
async function saveForm() {
  if(!canEditActive() || state.saving)return;
  if(!state.live || !token()){toast('Koneksi server dan sesi login diperlukan.','error');return;}
  let rows;
  try { rows=serializeRows(); }
  catch(error){toast(error.message,'error');return;}
  const groups=state.catalog.map(g=>({
    kelompok_id:g.id,penilaian_awal:groupAssessment(g)||null,
    expected_versi:state.form.groupVersions[g.id] ?? null
  }));
  state.saving=true;
  $$('#save,#save-bottom').forEach(btn=>{btn.disabled=true;btn.textContent='Menyimpan…';});
  try {
    const result=await rpc('kdmp_save_form',{
      p_token:token(),p_nik:state.activeNik,p_rows:rows,p_groups:groups
    });
    localStorage.removeItem(localKey(state.activeNik));
    toast('Form berhasil disimpan ke server.','success');
    const stamp=($('#sync-state'));
    if(stamp)stamp.innerHTML='<b>✓ Data tersimpan di server</b><span>' + fmt(result.saved_rows) + ' item · ' + esc(dateTime(result.saved_at)) + '</span>';
    await Promise.all([loadCoopForm(),loadDashboard()]);
    renderPage('sarpras',false);
  } catch(error) {
    toast(error.message,'error');
    const stamp=$('#sync-state');
    if(stamp)stamp.innerHTML='<b>⚠ Penyimpanan gagal</b><span>Draft di perangkat tetap aman. ' + esc(error.message) + '</span>';
    const detail=/form berubah|versi|diperbarui|konflik/i.test(error.message);
    if(detail) {
      const confirmLoad=window.confirm('Data di server berubah sejak form dibuka. Muat ulang data terbaru? Draft lokal saat ini tetap tersimpan.');
      if(confirmLoad){localStorage.removeItem(localKey(state.activeNik));await loadCoopForm();renderPage('sarpras',false);}
    }
  } finally {
    state.saving=false;
    $$('#save,#save-bottom').forEach(btn=>{btn.disabled=readOnly;btn.textContent='Simpan seluruh form';});
    const save=$('#save');if(save)save.textContent='Simpan ke server';
  }
}
function csvCell(value) {
  const s=String(value??'');
  return '"' + s.replace(/"/g,'""') + '"';
}
function downloadCSV(name,headers,rows) {
  const content='\ufeff'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
function bindExportPage() {
  $('#export-summary').onclick=()=> {
    const rows=filteredSummaryCoops().map(c=>{
      const s=coopStats(c);
      return [c.nik,coopName(c),c.desa,c.kecamatan,s.rated,s.total,percent(s.rated,s.total),s.ready,s.missing,s.damaged,s.unchecked,s.below,statusName(c),c.last_saved_at];
    });
    downloadCSV('ringkasan-kdkmp-lahat.csv',['NIK','Koperasi','Desa','Kecamatan','Item dinilai','Total item','Kelengkapan (%)','Siap','Tidak ada','Rusak','Belum dicek','Di bawah rencana','Status','Simpan terakhir'],rows);
    toast(rows.length+' koperasi diekspor ke CSV.','success');
  };
  $('#export-detail').onclick=async()=>{
    const nik=$('#export-nik').value;
    const button=$('#export-detail');button.disabled=true;button.textContent='Memuat data…';
    try {
      const coop=state.coops.find(c=>String(c.nik)===String(nik));
      const data=await rpc('kdmp_load_form',{p_token:token(),p_nik:nik});
      const byId=new Map((data.items||[]).map(row=>[row.item_id,row]));
      const rows=state.allItems.map(item=>{
        const row=byId.get(item.id)||{},detail=row.detail||{};
        return [coop?.nik,coopName(coop||{}),coop?.desa,coop?.kecamatan,item.id,item.name,item.target,
          row.keberadaan||'belum dinilai',row.tipe_dipilih,row.kondisi,row.jumlah_aktual,row.jumlah_rusak,
          row.catatan,JSON.stringify(detail),row.diubah_pada];
      });
      downloadCSV('detail-sarpras-'+nik+'.csv',['NIK','Koperasi','Desa','Kecamatan','ID item','Item','Jumlah rencana','Keberadaan','Tipe / varian','Kondisi','Jumlah aktual','Jumlah rusak','Catatan','Detail terstruktur','Simpan terakhir'],rows);
      toast('Detail '+coopName(coop||{})+' berhasil diekspor.','success');
    } catch(error) {toast(error.message,'error');}
    finally {button.disabled=false;button.textContent='Unduh detail CSV';}
  };
}
function renderMedia(item) {
  const modal=$('#media-modal'),formValue=state.form.items[item.id]||{};
  state.focusReturn=document.activeElement;
  modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');
  $('#media-title',modal).textContent=item.name;
  $('#media-variant',modal).textContent=formValue.type?'Tipe dipilih: '+formValue.type:'Spesifikasi katalog';
  const files=item.images?.files||[],type=(formValue.type||'').toLowerCase();
  const tokens=type.split(/[^a-z0-9]+/).filter(x=>x.length>2);
  const filtered=tokens.length?files.filter(file=>tokens.some(t=>file.toLowerCase().includes(t))):files;
  const show=filtered.length?filtered:files;
  const gallery=$('#media-gallery',modal);gallery.replaceChildren();
  if(show.length) {
    show.forEach(src=>{
      const img=document.createElement('img');img.src=src;img.alt=item.name+(formValue.type?' · '+formValue.type:'');
      img.loading='lazy';img.onerror=()=>{img.classList.add('image-failed');img.alt='Gambar gagal dimuat: '+item.name;};
      img.addEventListener('click',()=>img.classList.toggle('zoomed'));gallery.append(img);
    });
  } else {
    const empty=document.createElement('div');empty.className='media-empty';empty.textContent='Gambar belum tersedia. Spesifikasi katalog tetap dapat dibaca di bawah.';
    gallery.append(empty);
  }
  const specs=$('#media-spec',modal);specs.replaceChildren();
  const spec=item.spec||{};let text=spec.default||'';
  if(formValue.type&&spec.variants?.[formValue.type])text=spec.variants[formValue.type];
  if(!text&&Object.keys(spec.variants||{}).length)text=Object.values(spec.variants)[0];
  if(!text) {specs.textContent='Spesifikasi belum tersedia pada katalog untuk item ini.';return;}
  text.split(/\r?\n/).filter(Boolean).forEach(line=>{
    if(/^\[.*\]$/.test(line)) {
      const h=document.createElement('h4');h.textContent=line.slice(1,-1);specs.append(h);
    } else if(line.includes(':')) {
      const row=document.createElement('div');row.className='spec-row';
      const parts=line.split(':'),strong=document.createElement('b'),span=document.createElement('span');
      strong.textContent=parts.shift();span.textContent=parts.join(':').trim();row.append(strong,span);specs.append(row);
    } else {
      const p=document.createElement('p');p.textContent=line;specs.append(p);
    }
  });
}
function installMediaModal() {
  document.body.insertAdjacentHTML('beforeend',
    '<div id="media-modal" class="media-modal hidden" aria-hidden="true"><div class="media-window" role="dialog" aria-modal="true" aria-labelledby="media-title">' +
    '<div class="media-head"><div><strong id="media-title"></strong><small id="media-variant"></small></div><button class="btn" data-close-media type="button">Tutup ×</button></div>' +
    '<div id="media-gallery" class="media-gallery"></div><h3>Spesifikasi katalog</h3><div id="media-spec" class="media-spec"></div>' +
    '<p class="media-hint">Gambar dimuat dari folder aset hosting. Klik gambar untuk memperbesar; spesifikasi mengikuti varian yang dipilih.</p></div></div>');
}
function setConnection() {
  const header=$('#connection-label'),side=$('#server-status');
  if(header)header.innerHTML=state.live?'● Terhubung ke server':'● Server tidak terhubung';
  if(side)side.innerHTML=state.live?
    '<span class="online">● Terhubung ke Supabase</span><br>' + fmt(state.coops.length) + ' koperasi · ' + state.allItems.length + ' item katalog<br>Perubahan tetap melalui tombol Simpan':
    '<span class="offline">● Sambungan gagal</span><br>' + esc(state.error || 'Coba muat ulang setelah memeriksa jaringan.');
}
async function bootstrap() {
  shell();installMediaModal();
  if(!token()) { $('#server-status').textContent='Silakan masuk untuk memuat data.';renderPage(state.page,false);return; }
  try {
    await loadCatalog();
    state.live=true;
    await loadDashboard();
    setConnection();
    if(state.page==='sarpras')await loadCoopForm();
    renderPage(state.page,false);
  } catch(error) {
    state.live=false;state.error=error.message;setConnection();
    renderPage('summary',false);toast(error.message,'error');
  }
}
document.addEventListener('click',event=>{
  const page=event.target.closest('[data-page]');
  if(page){
    if(page.dataset.page==='sarpras'&&state.live){
      const own=['manager','pengurus'].includes(role)?String(sessionStorage.getItem('kdmp-nik')):state.activeNik;
      state.activeNik=own;currentCoop();loadCoopForm().then(()=>renderPage('sarpras')).catch(error=>{state.error=error.message;toast(error.message,'error');renderPage('sarpras');});
    } else renderPage(page.dataset.page);
    return;
  }
  const open=event.target.closest('[data-open-coop]');
  if(open){openCoop(open.dataset.nik);return;}
  const media=event.target.closest('[data-media-key]');
  if(media){const item=state.allItems.find(x=>x.id===media.dataset.mediaKey);if(item)renderMedia(item);return;}
  const close=event.target.closest('[data-close-media]');
  if(close){const modal=$('#media-modal');modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');state.focusReturn?.focus();return;}
  if(event.target.id==='media-modal'){event.target.classList.add('hidden');event.target.setAttribute('aria-hidden','true');state.focusReturn?.focus();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
    const modal=$('#media-modal');
    if(modal&&!modal.classList.contains('hidden')){$('.media-head [data-close-media]',modal).click();}
  }
});
window.addEventListener('popstate',event=>renderPage(event.state?.page||location.hash.slice(1)||'summary',false));
window.addEventListener('beforeunload',event=>{
  const draft=state.activeNik?localStorage.getItem(localKey(state.activeNik)):null;
  if(draft && state.page==='sarpras' && !readOnly){event.preventDefault();event.returnValue='';}
});
bootstrap();

