(function(){
 const form=document.getElementById('quoteForm');if(!form)return;
 const success=document.getElementById('successNotice');
 form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Submitting…';
  const f=new FormData(form); const lead=Object.fromEntries(f.entries());
  lead.created_at=new Date().toISOString();lead.source='website';lead.status='NEW';
  try{
   const cfg=window.METRO_HAUL_SUPABASE||{};
   if(!cfg.url||cfg.url.includes('YOUR_PROJECT')||!cfg.publishableKey||cfg.publishableKey.includes('REPLACE_ME')) throw new Error('Supabase is not configured yet.');
   const res=await fetch(`${cfg.url}/rest/v1/leads`,{method:'POST',headers:{'apikey':cfg.publishableKey,'Authorization':`Bearer ${cfg.publishableKey}`,'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(lead)});
   if(!res.ok) throw new Error(await res.text());
   form.reset();success.style.display='block';success.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(err){alert('Your quote form is ready, but the Supabase project still needs to be connected. '+err.message)}
  finally{btn.disabled=false;btn.textContent='Request My Free Quote';}
 });
})();
