import {assetKey, pair, providerDecimal, compare, UserError} from './validation.js';
export class ProviderError extends Error {
  constructor(code, uncertain=false) {super(code);this.code=code;this.uncertain=uncertain;}
}
export class ChangeNOW {
  constructor(key,{fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),clock=Date.now}={}) {
    this.key=key;this.fetch=fetchImpl;this.sleep=sleep;this.clock=clock;this.cache=null;this.next=0;
  }
  async request(path,query={},body) {
    const url=new URL('https://api.changenow.io/v2/'+path);
    for(const [k,v] of Object.entries(query))if(v!==undefined)url.searchParams.set(k,String(v));
    for(let attempt=0;attempt<3;attempt++) {
      // Serialized bot execution plus this spacing stays below the published 30/s key limit.
      const wait=this.next-this.clock();if(wait>0)await this.sleep(wait);this.next=this.clock()+100;
      let res;
      try { res=await this.fetch(url,{method:body?'POST':'GET',headers:{'x-changenow-api-key':this.key,'content-type':'application/json'},
        ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000),redirect:'error'}); }
      catch {if(body)throw new ProviderError('CREATE_UNCERTAIN',true);if(attempt===2)throw new ProviderError('NETWORK');continue;}
      if(!res.ok) {
        if(!body && (res.status===429||res.status>=500) && attempt<2) {
          const seconds=Number(res.headers.get('retry-after'));
          await this.sleep(Number.isFinite(seconds)&&seconds>0?Math.min(seconds*1000,30000):500*2**attempt);continue;
        }
        throw new ProviderError(res.status===403?'PERMISSION':res.status===401?'AUTH':res.status===429?'RATE_LIMIT':res.status>=500?'UNAVAILABLE':'REJECTED',Boolean(body&&res.status>=500));
      }
      try {return await res.json();}catch{throw new ProviderError(body?'CREATE_UNCERTAIN':'BAD_RESPONSE',Boolean(body));}
    }
  }
  async currencies(flow='standard') {
    if(this.cache?.flow===flow&&this.clock()-this.cache.time<60000)return this.cache.data;
    const list=await this.request('exchange/currencies',{active:true,flow});
    if(!Array.isArray(list))throw new ProviderError('BAD_RESPONSE');
    const data=list.filter(a=>!a.isFiat&&/^[a-z0-9_-]{1,32}$/.test(a.ticker)&&/^[a-z0-9_-]{1,32}$/.test(a.network));
    this.cache={flow,time:this.clock(),data};return data;
  }
  async select(input,side,flow='standard') {
    const list=(await this.currencies(flow)).filter(a=>a[side]===true);
    const key=input.toLowerCase().replace(/^\//,'');
    const found=list.filter(a=>assetKey(a)===key||a.ticker===key||a.legacyTicker===key);
    if(found.length!==1)throw new UserError(found.length?`Choose the network: ${found.map(assetKey).join(', ')}`:'Currency unavailable. Use /currencies TICKER to find active assets.');
    return found[0];
  }
  async quote(a,b,amount,flow='standard') {
    if(assetKey(a)===assetKey(b))throw new UserError('Choose two different assets or networks.');
    const p=pair(a,b,flow),range=await this.request('exchange/range',p);
    const min=providerDecimal(range.minAmount,true),max=range.maxAmount==null?null:providerDecimal(range.maxAmount,true);
    if(compare(amount,min)<0 || (max!==null&&compare(amount,max)>0))throw new UserError(`Amount must be at least ${min}${max?` and no more than ${max}`:''} ${a.ticker.toUpperCase()}.`);
    const q=await this.request('exchange/estimated-amount',{...p,fromAmount:amount,type:'direct',...(flow==='fixed-rate'?{useRateId:true}:{})});
    for(const [k,v] of Object.entries(p))if(q[k]!==v)throw new ProviderError('PAIR_MISMATCH');
    if(compare(providerDecimal(q.fromAmount),amount)!==0)throw new ProviderError('AMOUNT_MISMATCH');
    const toAmount=providerDecimal(q.toAmount);
    if(flow==='fixed-rate'&&(!q.rateId||!Number.isFinite(Date.parse(q.validUntil))||Date.parse(q.validUntil)<=this.clock()))throw new ProviderError('EXPIRED_RATE');
    return {...q,toAmount,quotedAt:this.clock()};
  }
  async validate(asset,address) {
    const r=await this.request('validate/address',{currency:asset.network,address});
    if(r.result!==true)throw new UserError('Address validation failed for this network. Check the address and selected network.');
  }
  async create(s) {
    const body={...pair(s.from,s.to,s.flow),fromAmount:s.amount,address:s.address,type:'direct',
      ...(s.extraId?{extraId:s.extraId}:{}),...(s.refundAddress?{refundAddress:s.refundAddress}:{}),
      ...(s.refundExtraId?{refundExtraId:s.refundExtraId}:{}),...(s.flow==='fixed-rate'?{rateId:s.quote.rateId}:{})};
    const r=await this.request('exchange',{},body);
    try {
    if(!/^[a-z0-9]{14,64}$/.test(r.id)||typeof r.payinAddress!=='string'||!r.payinAddress||r.payoutAddress!==s.address||
      Object.entries(pair(s.from,s.to,s.flow)).some(([k,v])=>r[k]!==v)||
      (s.from.hasExternalId&&!r.payinExtraId)||compare(providerDecimal(r.fromAmount),s.amount)!==0)
      throw new ProviderError('CREATE_UNCERTAIN',true);
    if(s.flow==='fixed-rate'&&(!r.validUntil||!Number.isFinite(Date.parse(r.validUntil))))throw new Error('Missing validity');
    return {...r,toAmount:providerDecimal(r.toAmount)};
    } catch {throw new ProviderError('CREATE_UNCERTAIN',true);}
  }
  async status(id) {
    const r=await this.request('exchange/by-id',{id});
    if(r.id!==id||typeof r.status!=='string')throw new ProviderError('BAD_RESPONSE');return r;
  }
}
