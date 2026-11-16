import {randomBytes} from 'node:crypto';
import {UserError,decimal,field,userId,assetKey,assetLabel,compare} from './validation.js';
import {ProviderError} from './provider.js';
import {policies,POLICY_VERSION} from './policies.js';
const token=()=>randomBytes(12).toString('hex');
const buttons=(...rows)=>({inline_keyboard:rows.map(row=>row.map(([text,callback_data])=>({text,callback_data})))});
const STATUS={new:'🕒 Created',waiting:'⏳ Awaiting deposit',confirming:'🔗 Confirming deposit',exchanging:'🔄 Exchanging',sending:'📤 Sending payout',finished:'✅ Finished',failed:'⚠️ Failed — contact support',refunded:'↩️ Refunded',verifying:'🪪 Provider verification required',expired:'⌛ Expired — contact support if funds were sent',overdue:'⌛ Overdue — contact support',hold:'⚠️ On hold — contact support'};
export function statusMessage(o) {
  const state=STATUS[o.status]||`ℹ️ Provider status: ${String(o.status).slice(0,64)}`;
  return `${state}\nOrder: ${o.id}\n${o.fromCurrency?.toUpperCase()||''} (${o.fromNetwork||''}) → ${o.toCurrency?.toUpperCase()||''} (${o.toNetwork||''})`+
    (o.payoutHash?`\nPayout transaction: ${o.payoutHash}`:'')+(o.refundHash?`\nRefund transaction: ${o.refundHash}`:'')+
    `\nhttps://changenow.io/exchange/txs/${o.id}`;
}
export class ExchangeBot {
  constructor(store,provider,config,{clock=Date.now}={}){this.store=store;this.provider=provider;this.c=config;this.clock=clock;this.policy=policies(config);}
  say(id,text,markup){this.store.notify(id,JSON.stringify({text,...(markup?{reply_markup:markup}:{})}));}
  save(id,s,accepted){this.store.save(id,s,accepted);}
  ready(){return this.c.live&&this.c.approved&&!this.store.pause();}
  accepted(id){return this.store.get(id).accepted===POLICY_VERSION;}
  terms(id){this.say(id,this.policy.terms,buttons([['📜 Privacy','privacy'],['↩️ Refunds','refunds']],[['✅ Accept policies','accept']]));}
  async receive(update) {
    if(!Number.isSafeInteger(update.update_id)||!this.store.claimUpdate(update.update_id))return;
    const m=update.message||update.callback_query?.message,from=update.message?.from||update.callback_query?.from;
    if(!m||m.chat?.type!=='private'||!from||from.is_bot||String(m.chat.id)!==String(from.id)){this.store.finishUpdate(update.update_id);return;}
    const id=userId(from.id),text=update.message?.text?.trim()||'',cb=update.callback_query?.data;
    // Old message replays must not create new orders after the update ledger expires.
    if(update.message?.date&&this.clock()/1000-update.message.date>300){this.say(id,'This message is too old. Send /start to continue.');this.store.finishUpdate(update.update_id);return;}
    if(!this.store.allow(id,this.clock())){this.store.finishUpdate(update.update_id);return;}
    try {await this.handle(id,text,cb);}catch(e){
      if(e instanceof UserError)this.say(id,e.message);
      else if(e instanceof ProviderError)this.say(id,e.uncertain?'Order creation could not be confirmed. Do not retry or send funds. Contact /support with the reference shown in /history.':
        e.code==='PERMISSION'?'This provider feature is not enabled for the account. Contact /support.':e.code==='RATE_LIMIT'?'Provider rate limit reached. Wait a moment, then retry this step.':'The provider could not complete this step. Your funds have not been sent by this bot. Retry the step or contact /support.');
      else {this.store.audit(id,'internal_error');this.say(id,'This step could not be completed. Use /history to check existing orders before starting again, or contact /support.');}
    } finally {this.store.finishUpdate(update.update_id);}
  }
  async handle(id,text,cb) {
    let {session:s}=this.store.get(id);
    if(cb==='cancel'){this.save(id,{});this.say(id,'Draft canceled. Existing exchanges continue; use /history.');return;}
    if(cb==='privacy'||cb==='refunds'){this.say(id,this.policy[cb]);return;}
    if(cb==='accept'){this.save(id,{step:'idle'},POLICY_VERSION);this.say(id,'✅ Policies accepted. Use /exchange to start.');return;}
    const [raw,...args]=text.split(/\s+/),cmd=raw?.split('@')[0].toLowerCase();
    if(cmd==='/start'||cmd==='/terms'){this.terms(id);return;}
    if(cmd==='/privacy'||cmd==='/refunds'){this.say(id,this.policy[cmd.slice(1)]);return;}
    if(cmd==='/support'){this.say(id,`🛟 Bot support: ${this.c.support}\nExchange execution/refunds: support@changenow.io\nhttps://support.changenow.io\nInclude your order ID. Never share a private key or seed phrase.`);return;}
    if(cmd==='/help'){this.say(id,'🔄 /exchange — New exchange\n🪙 /currencies [ticker] — Supported assets and networks\n📍 /status ORDER_ID — Track your exchange\n🧾 /history — Your recent orders\n↩️ /back — Previous input\n❌ /cancel — Cancel current draft\n📜 /terms /privacy /refunds\n🛟 /support\n🆔 /myid\n🗑 /delete — Delete inactive local profile');return;}
    if(cmd==='/myid'){this.say(id,`🆔 Your Telegram ID: ${id}`);return;}
    if(['/addadmin','/removeadmin','/admins','/pause','/resume','/reconcile','/clearattempt'].includes(cmd)){
      if(id!==this.c.owner)throw new UserError('Owner access required.');
      if(cmd==='/addadmin'||cmd==='/removeadmin'){const target=userId(args[0]);this.store.admin(target,cmd==='/addadmin');this.store.audit(id,cmd,target);this.say(id,'Administrator list updated.');return;}
      if(cmd==='/admins'){this.say(id,`Owner: ${this.c.owner}\nAdmins: ${this.store.admins().join(', ')||'none'}`);return;}
      if(cmd==='/pause'||cmd==='/resume'){this.store.pause(cmd==='/pause');this.store.audit(id,cmd);this.say(id,`New order creation ${cmd==='/pause'?'paused':'resumed if deployment gates are satisfied'}. Existing orders remain tracked.`);return;}
      const attempt=this.store.attempt(args[0]);
      if(!attempt||attempt.state!=='uncertain')throw new UserError('Supply an unresolved attempt reference from /history.');
      if(cmd==='/clearattempt'){
        if(!args[1]||args[1].length<8)throw new UserError('Supply the provider support ticket confirming NO order was created: /clearattempt REFERENCE SUPPORT_TICKET.');
        this.store.settle(attempt.id,'rejected',attempt.result);this.store.audit(id,'provider_confirmed_no_order',`${attempt.id}:${args[1]}`);
        this.say(attempt.user_id,'Provider reconciliation completed. No order was found for the uncertain attempt. You may use /exchange again.');return;
      }
      if(!/^[a-z0-9]{14,64}$/.test(args[1]||''))throw new UserError('Use /reconcile REFERENCE PROVIDER_ORDER_ID.');
      const o=await this.provider.status(args[1]),req=attempt.result;
      if(!req||o.payoutAddress!==req.address||o.fromCurrency!==req.from.ticker||o.fromNetwork!==req.from.network||o.toCurrency!==req.to.ticker||o.toNetwork!==req.to.network||compare(String(o.expectedAmountFrom??o.amountFrom),req.amount)!==0)
        throw new UserError('Provider order does not match the saved attempt. Contact provider support.');
      if(this.store.db.prepare('SELECT 1 FROM orders WHERE id=?').get(o.id))throw new UserError('Order already registered; review it before reconciling.');
      this.store.putOrder(attempt.user_id,o);this.store.settle(attempt.id,'created',o);this.store.audit(id,'reconciled',attempt.id);
      this.say(attempt.user_id,`Order recovered.\n${statusMessage(o)}\nUse /status ${o.id} for details. Contact support before depositing into a recovered order.`);return;
    }
    if(cmd==='/stats'){
      if(id!==this.c.owner&&!this.store.isAdmin(id))throw new UserError('Administrator access required.');
      this.say(id,JSON.stringify(this.store.counts()));return;
    }
    if(cmd==='/delete'){
      if(this.store.blocked(id)||this.store.list(id).some(o=>!['finished','refunded'].includes(o.status)))throw new UserError('Resolve your active or uncertain orders through /support before deleting the profile.');
      this.store.db.exec('BEGIN IMMEDIATE');try {
        for(const table of ['orders','attempts','notifications','limits'])this.store.db.prepare(`DELETE FROM ${table} WHERE user_id=?`).run(id);
        this.store.db.prepare('DELETE FROM users WHERE id=?').run(id);this.store.db.exec('COMMIT');
      }catch(e){this.store.db.exec('ROLLBACK');throw e;}
      this.say(id,'Your local profile and settled order records have been deleted. Telegram and ChangeNOW records are managed separately.');return;
    }
    if(cmd==='/history'){
      const rows=this.store.list(id),blocked=this.store.blocked(id);
      this.say(id,'🧾 Recent exchanges\n'+(rows.map(o=>`${o.id}: ${o.status}`).join('\n')||'No saved orders.')+(blocked?`\n⚠️ Unresolved attempt reference: ${blocked.id}. Contact /support.`:''));return;
    }
    if(cmd==='/status'||cb?.startsWith('status:')){
      const orderId=cb?cb.slice(7):args[0];const row=this.store.order(orderId||'',id);
      if(!row)throw new UserError('Order not found in your history. Use /history or contact /support.');
      const next=await this.provider.status(orderId);this.store.putOrder(id,{...row.data,...next});
      this.say(id,statusMessage(next));return;
    }
    if(cmd==='/cancel'){
      this.save(id,{});this.say(id,'Draft canceled. Existing exchanges continue; use /history.');return;
    }
    if(!this.accepted(id)){this.terms(id);return;}
    if(cmd==='/currencies'){
      const q=args.join(' ').toLowerCase(),list=(await this.provider.currencies(s.flow)).filter(a=>(a.sell||a.buy)&&(!q||a.ticker.includes(q)||a.name.toLowerCase().includes(q)));
      this.say(id,'🪙 Use ticker:network, for example usdt:trx.\n'+list.slice(0,60).map(a=>`${assetKey(a)} — ${a.name}`).join('\n')+(list.length>60?'\nSearch with /currencies TICKER for more.':''));return;
    }
    if(cmd==='/exchange'||cmd==='/new'){
      if(this.store.blocked(id))throw new UserError('An earlier creation attempt is unresolved. Contact /support with its /history reference before starting another.');
      this.save(id,{step:'flow',nonce:token()});
      const n=this.store.get(id).session.nonce;
      this.say(id,'🔄 Choose a rate type. Standard estimates can change before execution.',buttons([['🌊 Standard',`flow:standard:${n}`]],...(this.c.fixed?[[['🔒 Fixed rate',`flow:fixed-rate:${n}`]]]:[])));return;
    }
    if(cb?.startsWith('flow:')){
      const [,flow,n]=cb.split(':');
      if(s.step!=='flow'||n!==s.nonce||!['standard','fixed-rate'].includes(flow)||flow==='fixed-rate'&&!this.c.fixed)throw new UserError('Selection expired. Use /exchange.');
      s={step:'from',flow};this.save(id,s);this.say(id,'🪙 What will you send? Enter ticker:network (btc:btc, eth:eth, sol:sol). Use /currencies to browse.');return;
    }
    if(cmd==='/back'){
      const prev={to:'from',amount:'to',address:'amount',extraId:'address',refundAddress:'address',refundExtraId:'refundAddress',confirm:'address'};
      s.step=prev[s.step]||'from';delete s.quote;delete s.nonce;this.save(id,s);
      this.say(id,`Back to ${s.step}. Enter ${s.step==='from'?'the sending ticker:network':s.step==='to'?'the receiving ticker:network':s.step==='amount'?'the amount':s.step==='refundAddress'?'a refund address on the sending network, or skip':'the destination address on the receiving network'}.`);return;
    }
    if(cb?.startsWith('confirm:')){
      if(s.step!=='confirm'||cb.slice(8)!==s.nonce)throw new UserError('Confirmation expired. Check /history or start /exchange.');
      await this.confirm(id,s);return;
    }
    if(text.startsWith('/'))throw new UserError('Unknown command. Use /help.');
    if(!text)return;
    switch(s.step){
      case 'from':s={flow:s.flow,from:await this.provider.select(text,'sell',s.flow),step:'to'};this.save(id,s);this.say(id,`Sending ${assetLabel(s.from)}.\n🪙 Enter the receiving ticker:network.`);break;
      case 'to':{
        s={flow:s.flow,from:s.from,to:await this.provider.select(text,'buy',s.flow),step:s.step};
        if(assetKey(s.from)===assetKey(s.to))throw new UserError('Choose a different asset or network.');
        s.step='amount';this.save(id,s);this.say(id,`Receiving ${assetLabel(s.to)}.\n💰 Enter the exact amount of ${s.from.ticker.toUpperCase()} you want to send.`);break;}
      case 'amount':s={flow:s.flow,from:s.from,to:s.to,amount:decimal(text),step:s.step};s.quote=await this.provider.quote(s.from,s.to,s.amount,s.flow);s.step='address';this.save(id,s);
        this.say(id,`Estimated receive: ${s.quote.toAmount} ${assetLabel(s.to)}.\n📍 Enter the recipient address on ${s.to.network.toUpperCase()}. Never send a private key.`);break;
      case 'address':s.address=field(text);await this.provider.validate(s.to,s.address);delete s.extraId;delete s.refundAddress;delete s.refundExtraId;s.step=(s.to.hasExternalId||s.to.isExtraIdSupported)?'extraId':'refundAddress';this.save(id,s);
        this.say(id,s.step==='extraId'?'🏷 Enter the recipient memo/tag. Enter skip ONLY if your receiving wallet explicitly requires none.':'↩️ Enter your refund address on the sending network, or type skip.');break;
      case 'extraId':s.extraId=text.toLowerCase()==='skip'?'':field(text,'Memo');s.step='refundAddress';this.save(id,s);this.say(id,'↩️ Enter your refund address on the sending network, or type skip.');break;
      case 'refundAddress':{
        s.refundAddress=text.toLowerCase()==='skip'?'':field(text);delete s.refundExtraId;
        if(s.refundAddress)await this.provider.validate(s.from,s.refundAddress);
        if(s.refundAddress&&(s.from.hasExternalId||s.from.isExtraIdSupported)){
          s.step='refundExtraId';this.save(id,s);this.say(id,'🏷 Enter your refund memo/tag, or skip only if your refund wallet requires none.');
        }else await this.review(id,s);break;}
      case 'refundExtraId':s.refundExtraId=text.toLowerCase()==='skip'?'':field(text,'Refund memo');await this.review(id,s);break;
      default:this.say(id,'Use /exchange to start or /history to find an existing order.');
    }
  }
  async review(id,s){
    s.quote=await this.provider.quote(s.from,s.to,s.amount,s.flow);s.nonce=token();s.step='confirm';this.save(id,s);
    this.say(id,`🔎 Review your exchange\nSend: ${s.amount} ${assetLabel(s.from)}\nEstimated receive: ${s.quote.toAmount} ${assetLabel(s.to)}\nRate: ${s.flow}\nRecipient: ${s.address}\nMemo/tag: ${s.extraId||'none — confirm your wallet requires none'}\nRefund address: ${s.refundAddress||'not supplied'}\nRefund memo: ${s.refundExtraId||'none'}`+
      (s.quote.validUntil?`\nQuote valid until: ${s.quote.validUntil}`:'\nStandard estimates float until execution.')+
      (s.quote.warningMessage?`\nProvider warning: ${s.quote.warningMessage}`:'')+
      '\nProvider pricing includes applicable costs; your wallet may charge a sending fee.\nVerify both networks, all addresses and all memo requirements. Confirm creates an order; you send funds separately.',buttons([['✅ Confirm',`confirm:${s.nonce}`]],[['❌ Cancel','cancel']]));
  }
  async confirm(id,s){
    if(!this.ready())throw new UserError('New live orders are disabled pending launch verification. Quotes and existing-order tracking remain available.');
    if(s.flow==='fixed-rate'&&!this.c.fixed)throw new UserError('Fixed-rate orders are currently disabled. Start /exchange with a standard rate.');
    const old=this.store.attempt(s.nonce);
    if(old){this.say(id,old.state==='created'?`Order already created: ${old.result.id}. Use /history.`:`Attempt ${old.id} is ${old.state}. Use /history or /support.`);return;}
    const expires=s.flow==='fixed-rate'?Date.parse(s.quote.validUntil):s.quote.quotedAt+60000;
    if(!Number.isFinite(expires)||this.clock()>=expires){await this.review(id,s);this.say(id,'Quote refreshed. Review and confirm again.');return;}
    if(this.store.blocked(id))throw new UserError('An earlier attempt is unresolved. Contact /support.');
    // Save the exact request before any non-idempotent provider operation.
    if(!this.store.begin(s.nonce,id))return;
    this.store.settle(s.nonce,'creating',s);
    let o;
    try{o=await this.provider.create(s);}catch(e){this.store.settle(s.nonce,e.uncertain?'uncertain':'rejected',s);if(!e.uncertain){s.step='address';this.save(id,s);}throw e;}
    try{
      this.store.db.exec('BEGIN IMMEDIATE');this.store.putOrder(id,{...o,status:'waiting'});this.store.settle(s.nonce,'created',o);
      this.save(id,{step:'idle'});this.store.audit(id,'order_created',o.id);
      this.say(id,`✅ Order created: ${o.id}\nSend exactly ${s.amount} ${assetLabel(s.from)}\nChangeNOW deposit address:\n${o.payinAddress}`+
        (o.payinExtraId?`\n⚠️ REQUIRED DEPOSIT MEMO/TAG: ${o.payinExtraId}`:'')+
        `\nRecipient: ${o.payoutAddress}\nEstimated receive: ${o.toAmount} ${assetLabel(s.to)}`+
        (o.validUntil?`\nProvider validity: ${o.validUntil}`:'')+
        '\nOnly send the selected asset on the selected network. Save this order ID. Never reuse the deposit instructions for another exchange.',buttons([['📍 Track order',`status:${o.id}`]]));
      this.store.db.exec('COMMIT');
    }catch(e){this.store.db.exec('ROLLBACK');this.store.settle(s.nonce,'uncertain',s);throw e;}
  }
  async poll(){
    for(const row of this.store.watched())try{
      const fresh=await this.provider.status(row.id);const data={...row.data,...fresh};
      this.store.changeOrder(row,data,JSON.stringify({text:statusMessage(data)}));
    }catch{this.store.audit('system','status_poll_error',row.id);}
  }
}
