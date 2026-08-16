const toggle=document.querySelector('.mobile-toggle');const nav=document.querySelector('.navlinks');toggle?.addEventListener('click',()=>nav?.classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));
const year=document.querySelector('[data-year]');if(year)year.textContent=new Date().getFullYear();
