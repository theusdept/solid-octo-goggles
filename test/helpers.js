import {Store} from '../runtime/store.js';
import {ExchangeBot} from '../runtime/bot.js';
import {POLICY_VERSION} from '../runtime/policies.js';
export const btc={ticker:'btc',network:'btc',name:'Bitcoin',buy:true,sell:true,hasExternalId:false};
export const eth={ticker:'eth',network:'eth',name:'Ethereum',buy:true,sell:true,hasExternalId:false};
export const xrp={ticker:'xrp',network:'xrp',name:'XRP',buy:true,sell:true,hasExternalId:true,isExtraIdSupported:true};
export const cfg={owner:'1',secret:'a'.repeat(40),live:true,approved:true,fixed:false,url:'https://fast.example',support:'support@example.com',operator:'Test Operator'};
export const order={id:'1234567890abcd',payinAddress:'provider-deposit',payoutAddress:'destination',fromCurrency:'btc',fromNetwork:'btc',toCurrency:'eth',toNetwork:'eth',flow:'standard',fromAmount:'1',toAmount:'20'};
export function setup(overrides={}){
 const store=new Store();let creates=0;
 const provider={currencies:async()=>[btc,eth,xrp],select:async(v)=>v.startsWith('btc')?btc:v.startsWith('xrp')?xrp:eth,
  quote:async(a,b,amount,flow)=>({fromAmount:amount,toAmount:'20',flow,quotedAt:Date.now(),...(flow==='fixed-rate'?{rateId:'rate',validUntil:new Date(Date.now()+60000).toISOString()}:{})}),
  validate:async()=>{},create:async()=>{creates++;return {...order};},status:async id=>({...order,id,status:'waiting'}),...overrides};
 const bot=new ExchangeBot(store,provider,{...cfg});store.save('2',{},POLICY_VERSION);
 let updateId=0;
 const text=(text,id='2',fixedId)=>bot.receive({update_id:fixedId??++updateId,message:{date:Math.floor(Date.now()/1000),text,from:{id:Number(id)},chat:{type:'private',id:Number(id)}}});
 const callback=(data,id='2',fixedId)=>bot.receive({update_id:fixedId??++updateId,callback_query:{id:'cb',data,from:{id:Number(id)},message:{chat:{type:'private',id:Number(id)}}}});
 const draft=()=>{const s={step:'confirm',nonce:'nonce',from:btc,to:eth,amount:'1',address:'destination',flow:'standard',quote:{toAmount:'20',quotedAt:Date.now()}};store.save('2',s,POLICY_VERSION);return s;};
 const messages=()=>store.pending().map(x=>JSON.parse(x.body).text).join('\n');
 return {store,provider,bot,text,callback,draft,messages,creates:()=>creates};
}
