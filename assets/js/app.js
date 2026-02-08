(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (str) => String(str ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // Year
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  // Mobile menu
  const btn = $('[data-menu-btn]'); const panel = $('[data-menu-panel]');
  if (btn && panel) btn.addEventListener('click', () => {
    const open = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', open);
    btn.setAttribute('aria-expanded', String(!open));
  });

  // Language preference
  const saved = localStorage.getItem('beza_lang') || 'en';
  document.documentElement.setAttribute('data-lang', saved);
  $$('[data-lang-btn]').forEach(b => b.addEventListener('click', () => {
    const lang = b.getAttribute('data-lang-btn');
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('beza_lang', lang);
  }));

  function applyConfigToDOM(){
    const c = window.BEZA_CONFIG || {};
    const setText = (sel, val) => { const el = document.querySelector(sel); if (el && val) el.textContent = val; };
    setText('[data-company]', c.companyName);
    setText('[data-address-1]', c.addressLine1);
    setText('[data-address-2]', c.addressLine2);
    setText('[data-phone-1]', c.phonePrimary);
    setText('[data-phone-2]', c.phoneSecondary);
    setText('[data-email]', c.emailTo);

    // email links (still available, but form does not require email app)
    document.querySelectorAll('a[data-email-link]').forEach(a=>{ if (c.emailTo) a.href = `mailto:${c.emailTo}`; });

    // whatsapp links
    const phone = (c.whatsappPhone || "971XXXXXXXXX");
    const msg = (c.whatsappMessage || "Hello BEZA, I would like to request a quotation.");
    document.querySelectorAll('a[data-whatsapp], a[data-wa-link]').forEach(a=>{ a.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`; });
  }
  applyConfigToDOM();

  // WhatsApp CTA
  const wa = $('[data-whatsapp]');
  if (wa) {
    const c = window.BEZA_CONFIG || {};
    const phone = c.whatsappPhone || "971XXXXXXXXX";
    const msg = c.whatsappMessage || "Hello BEZA, I would like to request a quotation.";
    wa.href = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  async function loadProducts(){
    try {
      const res = await fetch('assets/data/products.json', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch(e){}
    if (window.BEZA_PRODUCTS) return window.BEZA_PRODUCTS;
    throw new Error('Products data not available');
  }

  // Products list
  async function initProducts(){
    const mount = $('#products-grid'); if (!mount) return;
    const products = await loadProducts();
    const cats = Array.from(new Set(products.map(p=>p.category))).sort();
    const chips = $('#category-chips');
    const q = $('#product-search');
    let active='All', query='';

    const chip = (label) => {
      const b=document.createElement('button');
      b.type='button';
      b.textContent=label;
      b.className='px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white';
      b.addEventListener('click', ()=>{ active=label; paintChips(); render(); });
      return b;
    };

    function paintChips(){
      $$('#category-chips button').forEach(x=>{
        x.className = (x.textContent===active)
          ? 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-emerald-700 text-white ring-emerald-700'
          : 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white';
      });
    }

    if (chips){
      chips.innerHTML='';
      chips.appendChild(chip('All'));
      cats.forEach(c=>chips.appendChild(chip(c)));
      active='All'; paintChips();
    }
    if (q) q.addEventListener('input', ()=>{ query=q.value.trim().toLowerCase(); render(); });

    const card = (p) => {
      const img = (p.gallery && p.gallery[0]) ? p.gallery[0] : '';
      return `
        <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="group rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft overflow-hidden hover:-translate-y-0.5 transition block">
          <div class="aspect-[3/2] bg-slate-50 overflow-hidden">
            <img src="${img}" alt="${esc(p.name)}" class="h-full w-full object-cover group-hover:scale-[1.02] transition">
          </div>
          <div class="p-6">
            <div class="flex items-center justify-between gap-3 flex-wrap">
              <div class="text-lg font-extrabold">${esc(p.name)}</div>
              <span class="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-800">${esc(p.category)}</span>
            </div>
            <p class="mt-2 text-slate-600">${esc(p.short)}</p>
            <div class="mt-4 inline-flex items-center gap-2 font-extrabold text-emerald-700">View details <span aria-hidden>→</span></div>
          </div>
        </a>
      `;
    };

    function render(){
      const filtered = products.filter(p=>{
        const okCat = active==='All' || p.category===active;
        const blob = (p.name+' '+p.short+' '+p.long).toLowerCase();
        const okQ = !query || blob.includes(query);
        return okCat && okQ;
      });
      mount.innerHTML = filtered.map(card).join('');
    }
    render();
  }

  // Product detail
  async function initProductDetail(){
    const mount = $('#product-detail'); if (!mount) return;
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const products = await loadProducts();
    const p = products.find(x=>x.slug===slug) || products[0];
    document.title = `${p.name} • ${(window.BEZA_CONFIG && window.BEZA_CONFIG.companyName) || 'BEZA'}`;

    const heroImg = (p.gallery && p.gallery[0]) ? p.gallery[0] : '';
    const specsRows = (p.specs||[]).map(([k,v])=>`
      <tr class="border-t border-black/5">
        <td class="px-5 py-4 font-semibold text-slate-800">${esc(k)}</td>
        <td class="px-5 py-4 text-slate-600">${esc(v)}</td>
      </tr>`).join('');

    const docs = (p.docs||[]).map(d=>`<li class="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 font-semibold text-slate-700">${esc(d)}</li>`).join('');
    const uses = (p.useCases||[]).map(u=>`<div class="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 font-semibold text-slate-700">${esc(u)}</div>`).join('');

    const gallery = (p.gallery||[]).map((src,i)=>`
      <button type="button" class="mb-4 w-full overflow-hidden rounded-2xl ring-1 ring-black/10 bg-slate-50" data-lightbox="${i}">
        <img src="${src}" alt="" class="w-full h-auto object-cover hover:scale-[1.01] transition">
      </button>`).join('');

    const videoCards = (p.videos||[]).map(v=>{
      const media = v.type==='embed'
        ? `<iframe class="w-full aspect-video" src="${v.url}" title="${esc(v.title)}" allowfullscreen></iframe>`
        : `<video class="w-full" controls><source src="${v.url}" type="video/mp4"></video>`;
      return `
        <div class="rounded-3xl bg-slate-50 ring-1 ring-slate-200 p-4">
          <div class="font-extrabold">${esc(v.title)}</div>
          <div class="mt-3 overflow-hidden rounded-2xl ring-1 ring-black/10 bg-black/5">${media}</div>
        </div>`;
    }).join('');

    const processing = buildProcessing(p);

    mount.innerHTML = `
      <section class="pt-12 pb-10">
        <div class="mx-auto max-w-container px-4">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="inline-flex items-center gap-2 rounded-full bg-emerald-50 ring-1 ring-emerald-200 px-4 py-2 text-xs font-extrabold tracking-widest uppercase text-emerald-800">${esc(p.category)}</div>
            <a href="products.html" class="px-5 py-2.5 rounded-full bg-white/80 ring-1 ring-black/10 font-extrabold">Back to products</a>
          </div>

          <div class="mt-6 grid lg:grid-cols-12 gap-6 items-start">
            <div class="lg:col-span-7 rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft overflow-hidden">
              <div class="aspect-[16/10] bg-slate-50 overflow-hidden">
                <img src="${heroImg}" alt="${esc(p.name)}" class="h-full w-full object-cover">
              </div>
              <div class="p-7">
                <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">${esc(p.name)}</h1>
                <p class="mt-3 text-slate-600 text-lg">${esc(p.long)}</p>
                <div class="mt-7 flex flex-wrap gap-3">
                  <a href="contact.html?commodity=${encodeURIComponent(p.name)}" class="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-emerald-700 px-7 py-3.5 text-white font-extrabold shadow-soft">Request Quote</a>
                  <a href="contact.html?commodity=${encodeURIComponent(p.name)}" class="inline-flex items-center justify-center rounded-full bg-white/80 ring-1 ring-black/10 px-7 py-3.5 text-slate-900 font-extrabold hover:bg-white">Send Inquiry</a>
                </div>
              </div>
            </div>

            <div class="lg:col-span-5 grid gap-6">
              <div class="overflow-hidden rounded-3xl ring-1 ring-black/5 bg-white/80 shadow-soft">
                <table class="w-full text-left">
                  <thead class="bg-slate-50">
                    <tr>
                      <th class="px-5 py-4 text-sm font-extrabold">Specification</th>
                      <th class="px-5 py-4 text-sm font-extrabold">Value</th>
                    </tr>
                  </thead>
                  <tbody>${specsRows}</tbody>
                </table>
              </div>

              <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
                <div class="text-sm font-extrabold">Available documentation</div>
                <ul class="mt-3 grid gap-2">${docs}</ul>
              </div>
            </div>
          </div>

          <div class="mt-10 grid lg:grid-cols-12 gap-6">
            <div class="lg:col-span-6">${processing}</div>
            <div class="lg:col-span-6 rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
              <div class="text-sm font-extrabold">Use cases / industries</div>
              <div class="mt-3 grid gap-2">${uses}</div>
            </div>
          </div>

          <div class="mt-10 grid gap-6">
            <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
              <div class="text-sm font-extrabold">Gallery</div>
              <p class="mt-1 text-slate-600">Click an image to view larger.</p>
              <div class="mt-4 columns-2 md:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">${gallery}</div>
            </div>

            <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
              <div class="text-sm font-extrabold">Videos</div>
              <p class="mt-1 text-slate-600">Supports YouTube/Vimeo embeds and local MP4 files.</p>
              <div class="mt-4 grid md:grid-cols-2 gap-6">${videoCards}</div>
            </div>
          </div>
        </div>
      </section>
      ${lightboxMarkup(p.gallery||[])}
    `;

    initLightbox(p.gallery||[]);
    initProcessingTabsIfAny(p);
  }

  function buildProcessing(p){
    if (Array.isArray(p.processingTabs) && p.processingTabs.length){
      const tabs = p.processingTabs.map((t,i)=>{
        const active = i===0 ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white/80 text-slate-800 ring-black/10 hover:bg-white';
        return `<button type="button" class="px-4 py-2 rounded-full font-extrabold text-sm ring-1 ${active}" data-proc-tab="${i}">${esc(t[0])}</button>`;
      }).join('');
      const steps = p.processingTabs[0][1].map((s,idx)=>stepRow(s,idx)).join('');
      return `
        <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6" id="proc-wrap">
          <div class="text-sm font-extrabold">Processing methods</div>
          <div class="mt-3 flex flex-wrap gap-2" id="proc-tabs">${tabs}</div>
          <ol class="mt-4 grid gap-2" id="proc-steps">${steps}</ol>
        </div>`;
    }
    const steps = (p.processingSteps||[]).map((s,idx)=>stepRow(s,idx)).join('');
    return `
      <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
        <div class="text-sm font-extrabold">Processing steps</div>
        <ol class="mt-4 grid gap-2">${steps}</ol>
      </div>`;
  }
  const stepRow = (s, idx) => `<li class="rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3 font-semibold text-slate-700"><span class="font-extrabold text-emerald-700 mr-2">${idx+1}.</span>${esc(s)}</li>`;

  function initProcessingTabsIfAny(p){
    const wrap = $('#proc-wrap'); if (!wrap || !p.processingTabs) return;
    const tabs = $$('#proc-tabs [data-proc-tab]');
    const stepsEl = $('#proc-steps');
    tabs.forEach(btn=>btn.addEventListener('click', ()=>{
      const i = Number(btn.getAttribute('data-proc-tab'));
      tabs.forEach(b=>b.className='px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white');
      btn.className='px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-emerald-700 text-white ring-emerald-700';
      stepsEl.innerHTML = p.processingTabs[i][1].map((s,idx)=>stepRow(s,idx)).join('');
    }));
  }

  // Gallery page
  async function initGalleryPage(){
    const mount = $('#global-gallery'); if (!mount) return;
    const products = await loadProducts();
    const cats = Array.from(new Set(products.map(p=>p.category))).sort();
    const chips = $('#gallery-chips');
    let active='All', images=[];

    const chip = (label) => {
      const b=document.createElement('button');
      b.type='button'; b.textContent=label;
      b.className='px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white';
      b.addEventListener('click', ()=>{ active=label; paint(); render(); });
      return b;
    };
    const paint = ()=> $$('#gallery-chips button').forEach(x=>x.className = (x.textContent===active)
      ? 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-emerald-700 text-white ring-emerald-700'
      : 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white');

    if (chips){
      chips.innerHTML=''; chips.appendChild(chip('All')); cats.forEach(c=>chips.appendChild(chip(c)));
      active='All'; paint();
    }
    function render(){
      const list = active==='All' ? products : products.filter(p=>p.category===active);
      images = Array.from(new Set(list.flatMap(p=>p.gallery||[]))).slice(0,60);
      mount.innerHTML = `
        <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
          <div class="text-sm font-extrabold">Gallery</div>
          <p class="mt-1 text-slate-600">Click to view larger.</p>
          <div class="mt-4 columns-2 md:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
            ${images.map((src,i)=>`
              <button type="button" class="mb-4 w-full overflow-hidden rounded-2xl ring-1 ring-black/10 bg-slate-50" data-lightbox="${i}">
                <img src="${src}" alt="" class="w-full h-auto object-cover hover:scale-[1.01] transition">
              </button>`).join('')}
          </div>
        </div>
        ${lightboxMarkup(images)}
      `;
      initLightbox(images);
    }
    render();
  }

  // Videos page
  async function initVideosPage(){
    const mount = $('#global-videos'); if (!mount) return;
    const products = await loadProducts();
    const cats = Array.from(new Set(products.map(p=>p.category))).sort();
    const chips = $('#videos-chips');
    let active='All';

    const chip = (label) => {
      const b=document.createElement('button');
      b.type='button'; b.textContent=label;
      b.className='px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white';
      b.addEventListener('click', ()=>{ active=label; paint(); render(); });
      return b;
    };
    const paint = ()=> $$('#videos-chips button').forEach(x=>x.className = (x.textContent===active)
      ? 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-emerald-700 text-white ring-emerald-700'
      : 'px-4 py-2 rounded-full font-extrabold text-sm ring-1 bg-white/80 text-slate-800 ring-black/10 hover:bg-white');

    if (chips){
      chips.innerHTML=''; chips.appendChild(chip('All')); cats.forEach(c=>chips.appendChild(chip(c)));
      active='All'; paint();
    }

    function render(){
      const list = active==='All' ? products : products.filter(p=>p.category===active);
      const vids = list.flatMap(p => (p.videos||[]).map(v=>({ ...v, product:p.name })));
      mount.innerHTML = `
        <div class="rounded-3xl bg-white/80 ring-1 ring-black/5 shadow-soft p-6">
          <div class="text-sm font-extrabold">Video library</div>
          <div class="mt-4 grid md:grid-cols-2 gap-6">
            ${vids.map(v=>{
              const media = v.type==='embed'
                ? `<iframe class="w-full aspect-video" src="${v.url}" title="${esc(v.title)}" allowfullscreen></iframe>`
                : `<video class="w-full" controls><source src="${v.url}" type="video/mp4"></video>`;
              return `
                <div class="rounded-3xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <div class="flex items-center justify-between gap-3 flex-wrap">
                    <div class="font-extrabold">${esc(v.title)}</div>
                    <div class="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-50 ring-1 ring-amber-200 text-amber-800">${esc(v.product)}</div>
                  </div>
                  <div class="mt-3 overflow-hidden rounded-2xl ring-1 ring-black/10 bg-black/5">${media}</div>
                </div>`;
            }).join('')}
          </div>
        </div>
      `;
    }
    render();
  }

  // Inquiry form - sends via FormSubmit endpoint (no email app)
  function initInquiryForm(){
    const form = $('#inquiry-form'); if (!form) return;
    const params = new URLSearchParams(location.search);
    const commodity = params.get('commodity');
    if (commodity) { const sel=form.querySelector('[name="commodity"]'); if (sel) sel.value=commodity; }

    const status = $('#form-status');
    const required = ["fullName","companyName","country","email","whatsapp","commodity","quantity","incoterms","destinationPort"];

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const missing = required.filter(k=>!String(fd.get(k)||"").trim());
      if (missing.length){
        status.innerHTML = `<div class="rounded-3xl bg-amber-50 ring-1 ring-amber-200 p-4 font-semibold text-amber-900">Please fill required fields: <span class="font-extrabold">${missing.join(", ")}</span></div>`;
        return;
      }

      const c = window.BEZA_CONFIG || {};
      const endpoint = c.formEndpoint;
      const payload = Object.fromEntries(fd.entries());
      payload.timestamp = new Date().toISOString();

      status.innerHTML = `<div class="rounded-3xl bg-slate-50 ring-1 ring-slate-200 p-4 font-semibold text-slate-900">Sending inquiry…</div>`;

      try {
        // FormSubmit accepts JSON at /ajax/ endpoint
        const r = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type":"application/json", "Accept":"application/json" },
          body: JSON.stringify(payload)
        });
        if (!r.ok) throw new Error("Send failed");
        status.innerHTML = `<div class="rounded-3xl bg-emerald-50 ring-1 ring-emerald-200 p-4 font-semibold text-emerald-900">Inquiry sent successfully. We will contact you shortly.</div>`;
        form.reset();
      } catch(err){
        status.innerHTML = `<div class="rounded-3xl bg-amber-50 ring-1 ring-amber-200 p-4 font-semibold text-amber-900">Could not send automatically. Please use WhatsApp send button.</div>`;
      }
    });

    const waBtn = $('#send-whatsapp');
    if (waBtn) waBtn.addEventListener('click', ()=>{
      const fd = new FormData(form);
      const p = Object.fromEntries(fd.entries());
      const c = window.BEZA_CONFIG || {};
      const phone = c.whatsappPhone || "971XXXXXXXXX";
      const msg = [
        "RFQ Inquiry (BEZA)",
        `Name: ${p.fullName||""}`,
        `Company: ${p.companyName||""}`,
        `Country: ${p.country||""}`,
        `Email: ${p.email||""}`,
        `WhatsApp: ${p.whatsapp||""}`,
        `Commodity: ${p.commodity||""}`,
        `Qty: ${p.quantity||""} MT`,
        `Incoterms: ${p.incoterms||""}`,
        `Dest Port: ${p.destinationPort||""}`,
        `Message: ${p.message||""}`
      ].join("\n");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    });
  }

  // Lightbox
  const lightboxMarkup = (images) => (!images || !images.length) ? '' : `
    <div id="lightbox" class="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm hidden place-items-center p-4" role="dialog" aria-modal="true">
      <div class="w-full max-w-5xl rounded-3xl bg-white overflow-hidden ring-1 ring-black/10 shadow-soft">
        <div class="flex items-center justify-between px-4 py-3 border-b border-black/5">
          <div class="font-extrabold" id="lb-count"></div>
          <button type="button" id="lb-close" class="px-3 py-1.5 rounded-full bg-slate-100 font-extrabold">Close</button>
        </div>
        <div class="bg-black"><img id="lb-img" src="" alt="" class="w-full max-h-[78vh] object-contain"></div>
        <div class="flex items-center justify-between px-4 py-3 border-t border-black/5">
          <button type="button" id="lb-prev" class="px-4 py-2 rounded-full bg-slate-100 font-extrabold">Prev</button>
          <button type="button" id="lb-next" class="px-4 py-2 rounded-full bg-slate-100 font-extrabold">Next</button>
        </div>
      </div>
    </div>`;

  function initLightbox(images){
    const lb = $('#lightbox'); if (!lb) return;
    const img = $('#lb-img'); const count = $('#lb-count');
    const close = $('#lb-close'); const prev = $('#lb-prev'); const next = $('#lb-next');
    let active = 0;
    const open = (i)=>{ active=i; img.src=images[active]; count.textContent=`Image ${active+1} / ${images.length}`; lb.classList.remove('hidden'); lb.classList.add('grid'); };
    const hide = ()=>{ lb.classList.add('hidden'); lb.classList.remove('grid'); };
    const go = (d)=>{ active=(active+d+images.length)%images.length; img.src=images[active]; count.textContent=`Image ${active+1} / ${images.length}`; };

    $$('[data-lightbox]').forEach(b=>b.addEventListener('click', ()=>open(Number(b.getAttribute('data-lightbox')))));
    close && close.addEventListener('click', hide);
    lb.addEventListener('click', (e)=>{ if (e.target===lb) hide(); });
    prev && prev.addEventListener('click', ()=>go(-1));
    next && next.addEventListener('click', ()=>go(1));
    document.addEventListener('keydown', (e)=>{
      if (lb.classList.contains('hidden')) return;
      if (e.key==='Escape') hide();
      if (e.key==='ArrowLeft') go(-1);
      if (e.key==='ArrowRight') go(1);
    });
  }

  // Init
  initProducts().catch(()=>{});
  initProductDetail().catch(()=>{});
  initGalleryPage().catch(()=>{});
  initVideosPage().catch(()=>{});
  initInquiryForm();

  // Export helpers for product page rendering
  window.__BEZA_LIGHTBOX = { lightboxMarkup };
  window.__BEZA_INIT_LIGHTBOX = initLightbox;
})();
