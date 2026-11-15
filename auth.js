(() => {
  const config=window.KDKMP_SUPABASE;
  if(!config)return;
  const overlay=document.createElement('section');
  overlay.className='auth-layer';
  overlay.innerHTML=
    '<form class="auth-card" id="auth-form">' +
      '<div class="auth-brand"><img src="./assets/logo-kdmp.svg" alt=""><div><strong>KDKMP Lahat</strong><small>Sistem pendataan Pra-Verval</small></div></div>' +
      '<h1>Masuk ke aplikasi</h1><p>Pilih peran dan masukkan NIK serta PIN.</p>' +
      '<label class="auth-field">Peran<select id="auth-role">' +
        '<option value="manager" selected>Manager</option><option value="pmo">PMO</option>' +
        '<option value="pengurus">Pengurus</option><option value="guest">Guest · hanya melihat</option></select></label>' +
      '<div id="nik-wrap"><label class="auth-field"><span id="nik-label">NIK koperasi</span>' +
        '<input id="auth-nik" inputmode="numeric" autocomplete="off" placeholder="Masukkan 13 digit NIK"></label>' +
        '<div id="coop-fields"><div class="auth-pickers">' +
          '<label class="auth-field">Kecamatan<select id="auth-district"><option value="">Pilih kecamatan</option></select></label>' +
          '<label class="auth-field">Desa / kelurahan<select id="auth-village" disabled><option value="">Pilih kecamatan dulu</option></select></label>' +
        '</div></div><small class="auth-help" id="nik-help">Ketik NIK koperasi, atau pilih kecamatan dan desa untuk mengisinya otomatis.</small></div>' +
      '<label class="auth-field">PIN<input id="auth-pin" type="password" inputmode="numeric" autocomplete="current-password" required></label>' +
      '<div class="auth-error hidden" id="auth-error" role="alert"></div><button class="auth-submit" type="submit">Masuk</button>' +
      '<div class="auth-note">Sesi berakhir otomatis setelah 12 jam. PIN tidak disimpan di perangkat.</div>' +
    '</form>';
  document.body.append(overlay);
  const form=overlay.querySelector('#auth-form');
  const role=overlay.querySelector('#auth-role');
  const nik=overlay.querySelector('#auth-nik');
  const nikLabel=overlay.querySelector('#nik-label');
  const nikHelp=overlay.querySelector('#nik-help');
  const nikWrap=overlay.querySelector('#nik-wrap');
  const coopFields=overlay.querySelector('#coop-fields');
  const pin=overlay.querySelector('#auth-pin');
  const error=overlay.querySelector('#auth-error');
  const district=overlay.querySelector('#auth-district');
  const village=overlay.querySelector('#auth-village');
  let coops=[];
  let loadingCoops=false;

  function fillVillages(selectedNik) {
    const rows=coops.filter(c=>c.kecamatan===district.value);
    village.innerHTML='<option value="">Pilih desa / kelurahan</option>' +
      rows.map(c=>'<option value="'+String(c.nik).replace(/"/g,'&quot;')+'"'+
        (String(c.nik)===String(selectedNik||'')?' selected':'')+'>'+
        String(c.desa||'Desa belum tercatat')+' · '+String(c.kdkmp||'KDKMP')+'</option>').join('');
    village.disabled=!district.value||!rows.length;
  }
  function syncNIK() {
    if(role.value!=='manager'&&role.value!=='pengurus')return;
    const found=coops.find(c=>String(c.nik)===nik.value.trim());
    if(found) {
      district.value=found.kecamatan||'';
      fillVillages(found.nik);
      village.value=String(found.nik);
      nikHelp.textContent='Kecamatan dan desa cocok dengan NIK.';
      nikHelp.classList.remove('auth-help-error');
    } else {
      village.value='';
      if(nik.value.trim()&&coops.length) {
        nikHelp.textContent='NIK belum cocok dengan daftar. Periksa kembali atau pilih kecamatan dan desa.';
        nikHelp.classList.add('auth-help-error');
      } else {
        nikHelp.textContent='Ketik NIK koperasi, atau pilih kecamatan dan desa untuk mengisinya otomatis.';
        nikHelp.classList.remove('auth-help-error');
      }
    }
  }
  function syncRole() {
    const current=role.value;
    const isPmo=current==='pmo';
    const isCoop=current==='manager'||current==='pengurus';
    nikWrap.classList.toggle('hidden',current==='guest');
    coopFields.classList.toggle('hidden',!isCoop);
    nik.required=current!=='guest';
    nik.maxLength=isPmo?4:13;
    nikLabel.textContent=isPmo?'NIK PMO':'NIK koperasi';
    nik.placeholder=isPmo?'Masukkan 1111 atau 2222':'Masukkan 13 digit NIK';
    nikHelp.textContent=isPmo?'Masukkan NIK PMO 1111 atau 2222.':'Ketik NIK koperasi, atau pilih kecamatan dan desa untuk mengisinya otomatis.';
    nikHelp.classList.remove('auth-help-error');
    if(isCoop&&!loadingCoops&&!coops.length)loadCoopOptions();
  }
  async function loadCoopOptions() {
    loadingCoops=true;
    try {
      const response=await fetch(config.url+'/rest/v1/rpc/kdmp_coop_picker',{
        method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:'{}'
      });
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||'Daftar koperasi gagal dimuat.');
      coops=Array.isArray(data)?data:[];
      [...new Set(coops.map(c=>c.kecamatan).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'))
        .forEach(name=>district.add(new Option(name,name)));
      if(nik.value.trim())syncNIK();
    } catch(e) {
      nikHelp.textContent='Daftar desa gagal dimuat. Anda masih dapat memasukkan NIK secara langsung.';
    } finally {loadingCoops=false;}
  }
  role.addEventListener('change',()=>{
    nik.value='';district.value='';village.innerHTML='<option value="">Pilih kecamatan dulu</option>';
    village.disabled=true;syncRole();
  });
  district.addEventListener('change',()=>{
    fillVillages('');nik.value='';
    nikHelp.textContent='Pilih desa untuk mengisi NIK secara otomatis.';
    nikHelp.classList.remove('auth-help-error');
  });
  village.addEventListener('change',()=>{
    const found=coops.find(c=>String(c.nik)===village.value);
    if(!found)return;
    nik.value=String(found.nik);
    nikHelp.textContent='NIK terisi otomatis dari desa yang dipilih.';
    nikHelp.classList.remove('auth-help-error');
  });
  nik.addEventListener('input',syncNIK);
  syncRole();
  if(sessionStorage.getItem('kdmp-token'))overlay.classList.add('hidden');

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    error.classList.add('hidden');
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;button.textContent='Memeriksa…';
    try {
      const loginNik=role.value==='guest'?null:nik.value.trim();
      const response=await fetch(config.url+'/rest/v1/rpc/kdmp_login',{
        method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},
        body:JSON.stringify({p_role:role.value,p_nik:loginNik||null,p_pin:pin.value})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||result.details||'Login gagal. Periksa kembali data yang dimasukkan.');
      sessionStorage.setItem('kdmp-token',result.token);
      sessionStorage.setItem('kdmp-role',result.role);
      if(result.nik)sessionStorage.setItem('kdmp-nik',result.nik);else sessionStorage.removeItem('kdmp-nik');
      if(result.operator_name)sessionStorage.setItem('kdmp-name',result.operator_name);else sessionStorage.removeItem('kdmp-name');
      if(result.coop_name)sessionStorage.setItem('kdmp-coop-name',result.coop_name);else sessionStorage.removeItem('kdmp-coop-name');
      pin.value='';location.reload();
    } catch(err) {
      error.textContent=err.message;error.classList.remove('hidden');
      button.disabled=false;button.textContent='Masuk';
    }
  });
})();
