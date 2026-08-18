if(window.location.protocol==='http:'){window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);}
const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.navlinks');
if(nav&&!nav.querySelector('a[href$="gallery.html"]')){const link=document.createElement('a');const nested=window.location.pathname.includes('/services/')||window.location.pathname.includes('/locations/');link.href=nested?'../gallery.html':'gallery.html';link.textContent='Gallery';const quote=Array.from(nav.querySelectorAll('a')).find(a=>a.textContent.trim()==='Free Quote');nav.insertBefore(link,quote||null);}
toggle?.setAttribute('aria-label','Open navigation menu');toggle?.setAttribute('aria-expanded','false');toggle?.addEventListener('click',()=>{const open=nav?.classList.toggle('open')||false;toggle.setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>{nav?.classList.remove('open');toggle?.setAttribute('aria-expanded','false');}));
const year=document.querySelector('[data-year]');if(year)year.textContent=new Date().getFullYear();

const footerContainer=document.querySelector('.footer .container');
if(footerContainer&&!footerContainer.querySelector('.footer-legal')){
  const legal=document.createElement('div');
  legal.className='footer-legal';
  const nested=window.location.pathname.includes('/services/')||window.location.pathname.includes('/locations/');
  const prefix=nested?'../':'';
  legal.innerHTML=`<a href="mailto:infometrohaulmovers@gmail.com">infometrohaulmovers@gmail.com</a><a href="${prefix}privacy.html">Privacy Policy</a><a href="${prefix}terms.html">Terms of Use</a>`;
  footerContainer.append(legal);
}

const analyticsId=document.querySelector('meta[name="google-analytics-id"]')?.content?.trim();
if(analyticsId&&/^G-[A-Z0-9]+$/i.test(analyticsId)){
  const analyticsScript=document.createElement('script');
  analyticsScript.async=true;
  analyticsScript.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(analyticsId)}`;
  document.head.append(analyticsScript);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag('js',new Date());
  window.gtag('config',analyticsId);
  window.addEventListener('metrohaul:quote-submitted',event=>{
    window.gtag('event','generate_lead',{service_type:event.detail?.serviceType||'unknown'});
  });
}
