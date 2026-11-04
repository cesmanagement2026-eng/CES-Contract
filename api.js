window.CES_API=(()=>{
  let index=0;
  const inFlight=new Map();
  function endpoint(){
    const raw=String(window.CES_CONFIG?.webAppUrl||'').trim();
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec\/?$/.test(raw))throw new Error('Invalid Apps Script deployment URL in config.js');
    return raw.replace(/\/$/,'');
  }
  function request(action,data={},channel=action){
    const id=++index,previous=inFlight.get(channel);
    if(previous)previous.cancel();
    return new Promise((resolve,reject)=>{
      const callback='__ces_callback_'+id;
      const script=document.createElement('script');
      let done=false;
      const clean=()=>{clearTimeout(timer);script.remove();try{delete window[callback]}catch(_){window[callback]=undefined}if(inFlight.get(channel)?.id===id)inFlight.delete(channel)};
      const finish=(result,error)=>{if(done)return;done=true;const wasCanceled=inFlight.get(channel)?.id!==id;clean();if(wasCanceled)return reject(new Error('Request superseded'));if(error)reject(error);else if(result?.ok===false)reject(new Error(result.error||'API request failed'));else resolve(result?.data??result)};
      const cancel=()=>finish(null,new Error('Request superseded'));
      inFlight.set(channel,{id,cancel});
      const timer=setTimeout(()=>finish(null,new Error('Connection timed out. Please check Apps Script deployment.')),Number(window.CES_CONFIG?.requestTimeoutMs)||25000);
      window[callback]=value=>finish(value);
      script.onerror=()=>finish(null,new Error('Apps Script unavailable. Verify deployment access and /exec URL.'));
      try{
        const payload=btoa(unescape(encodeURIComponent(JSON.stringify(data)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
        script.src=endpoint()+'?action='+encodeURIComponent(action)+'&payload='+encodeURIComponent(payload)+'&callback='+callback+'&_='+id;
        document.head.appendChild(script);
      }catch(e){finish(null,e)}
    });
  }
  function cancel(channel){inFlight.get(channel)?.cancel()}
  return {request,cancel,endpoint};
})();
