export class Telegram {
  constructor(token,{fetchImpl=fetch}={}){this.token=token;this.fetch=fetchImpl;this.blockedUntil=0;}
  async call(method,body){
    const res=await this.fetch(`https://api.telegram.org/bot${this.token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:'error'});
    let data;try{data=await res.json();}catch{throw new Error('Telegram response invalid');}
    if(!res.ok||!data.ok){
      const e=new Error('Telegram request failed');e.code=data.error_code;
      if(e.code===429)this.blockedUntil=Date.now()+Math.min(Number(data.parameters?.retry_after||5),3600)*1000;
      throw e;
    }
    return data.result;
  }
  async flush(store){
    if(Date.now()<this.blockedUntil)return;
    for(const item of store.pending()){
      try{
        await this.call('sendMessage',{chat_id:item.user_id,...JSON.parse(item.body),link_preview_options:{is_disabled:true}});store.sent(item.id);
        await new Promise(r=>setTimeout(r,1100));
      }catch(e){
        // A blocked user cannot receive updates; their saved order remains accessible if they return.
        if(e.code===403){store.sent(item.id);store.audit('system','notification_blocked',item.user_id);continue;}
        store.audit('system','notification_retry');break;
      }
    }
  }
}
