export class UserError extends Error {}
export function decimal(value, allowZero = false) {
  const s = String(value);
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,18})?$/.test(s) || (!allowZero && !/[1-9]/.test(s)))
    throw new UserError('Enter a positive decimal amount, without commas or exponent notation (up to 18 decimal places).');
  return s;
}
export function compare(a, b) {
  const scaled = x => { const [i, f=''] = decimal(x, true).split('.'); return BigInt(i + f.padEnd(18,'0')); };
  const x = scaled(a), y = scaled(b);
  return x < y ? -1 : x > y ? 1 : 0;
}
export function providerDecimal(x, zero=false) {
  if (typeof x === 'number') {
    if (!Number.isFinite(x) || x < 0) throw new Error('Invalid provider amount');
    const [m,e='0'] = String(x).split('e');
    if (e !== '0') {
      const [i,f=''] = m.split('.'), digits=i+f, pos=i.length+Number(e);
      x=pos<=0?'0.'+'0'.repeat(-pos)+digits:pos>=digits.length?digits+'0'.repeat(pos-digits.length):digits.slice(0,pos)+'.'+digits.slice(pos);
    }
  }
  return decimal(String(x),zero);
}
export function field(s, label='Address or memo') {
  if (typeof s !== 'string' || !/^[\x21-\x7e]{1,256}$/.test(s)) throw new UserError(`${label} must be 1–256 visible characters with no spaces.`);
  return s;
}
export function userId(s) {
  if (!/^[1-9]\d{0,15}$/.test(String(s)) || !Number.isSafeInteger(Number(s))) throw new UserError('Invalid Telegram user ID.');
  return String(s);
}
export const assetKey = a => `${a.ticker}:${a.network}`;
export const assetLabel = a => `${a.ticker.toUpperCase()} on ${a.network.toUpperCase()}`;
export function pair(a,b,flow='standard') {
  return {fromCurrency:a.ticker,fromNetwork:a.network,toCurrency:b.ticker,toNetwork:b.network,flow};
}
export function config(env=process.env) {
  const required=k=>{if(!env[k])throw new Error(`Missing ${k}`);return env[k];};
  const flag=k=>{if(env[k] && !['true','false'].includes(env[k]))throw new Error(`Invalid ${k}`);return env[k]==='true';};
  const url=new URL(required('PUBLIC_URL'));
  if(url.protocol!=='https:')throw new Error('PUBLIC_URL must use HTTPS');
  const secret=required('TELEGRAM_WEBHOOK_SECRET');
  if(!/^[A-Za-z0-9_-]{32,256}$/.test(secret))throw new Error('Invalid TELEGRAM_WEBHOOK_SECRET');
  const c={token:required('TELEGRAM_BOT_TOKEN'),key:env.CHANGENOW_API_KEY||'',owner:userId(required('OWNER_TELEGRAM_ID')),
    url:url.origin,secret,db:env.DB_PATH||'/data/fastcoinswap.sqlite',port:Number(env.PORT||3000),
    support:required('SUPPORT_CONTACT'),operator:required('OPERATOR_NAME'),live:flag('LIVE_EXCHANGES_ENABLED'),
    approved:flag('PROVIDER_ACCESS_CONFIRMED')&&flag('POLICIES_APPROVED'),fixed:flag('FIXED_RATE_ENABLED')};
  if(!/^\d+:[\w-]{20,}$/.test(c.token))throw new Error('Invalid TELEGRAM_BOT_TOKEN');
  if(!Number.isInteger(c.port)||c.port<1||c.port>65535)throw new Error('Invalid PORT');
  if(c.live && (!c.approved||!c.key))throw new Error('Live exchange prerequisites missing');
  if(c.fixed && !flag('FIXED_RATE_ACCESS_CONFIRMED'))throw new Error('Fixed-rate permission not confirmed');
  return c;
}
