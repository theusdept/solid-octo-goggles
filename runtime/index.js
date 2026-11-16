import {config} from './validation.js';
import {Store} from './store.js';
import {ChangeNOW} from './provider.js';
import {ExchangeBot} from './bot.js';
import {server} from './server.js';
import {Telegram} from './telegram.js';
const c=config(),store=new Store(c.db),provider=new ChangeNOW(c.key),bot=new ExchangeBot(store,provider,c),telegram=new Telegram(c.token);
let queue=Promise.resolve(),pending=0,stopping=false,lastTick=Date.now();
function enqueue(fn){pending++;const task=queue.then(fn);queue=task.catch(()=>{}).finally(()=>pending--);return task;}
const http=server(bot,c,{enqueue,onCallback:id=>telegram.call('answerCallbackQuery',{callback_query_id:id}).catch(()=>{}),healthy:()=>!stopping&&pending<100&&Date.now()-lastTick<180000});
http.requestTimeout=120000;http.headersTimeout=15000;
http.listen(c.port,'0.0.0.0',()=>console.info(JSON.stringify({event:'listening',product:'FASTCOINSWAPbot',liveOrders:bot.ready()})));
let workerBusy=false;
const timer=setInterval(()=>{
  if(workerBusy||stopping)return;workerBusy=true;
  enqueue(async()=>{try{await bot.poll();store.cleanup();lastTick=Date.now();}catch{store.audit('system','worker_error');}})
    .finally(()=>{workerBusy=false;});
},30000);
let deliveryBusy=false;
const delivery=setInterval(async()=>{
  if(deliveryBusy||stopping)return;deliveryBusy=true;
  try{await telegram.flush(store);}catch{store.audit('system','delivery_error');}finally{deliveryBusy=false;}
},1500);
async function shutdown(){
  if(stopping)return;stopping=true;clearInterval(timer);clearInterval(delivery);http.close();
  const force=setTimeout(()=>process.exit(1),25000);force.unref();
  await queue;
  // Let in-flight Telegram sends finish before closing the database.
  while(deliveryBusy)await new Promise(r=>setTimeout(r,100));
  store.close();process.exit(0);
}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
