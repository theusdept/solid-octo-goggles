import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function server(bot,c,{enqueue=fn=>fn(),healthy=()=>true,onCallback=async()=>{}}={}) {
  return createServer(async(req,res)=>{
    const path=(req.url||'').split('?')[0];
    res.setHeader('x-content-type-options','nosniff');res.setHeader('cache-control','no-store');
    res.setHeader('content-security-policy',"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'");
    if(req.method==='GET'&&path==='/health'){
      res.writeHead(healthy()?200:503,{'content-type':'application/json'});res.end(JSON.stringify({status:healthy()?'ok':'busy',liveOrders:bot.ready(),product:'FASTCOINSWAPbot'}));return;
    }
    if(req.method==='GET'&&['/','/terms','/privacy','/refunds'].includes(path)){
      const key=path==='/'?'terms':path.slice(1);
      res.writeHead(200,{'content-type':'text/html; charset=utf-8'});
      res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>FAST COIN SWAP</title><style>body{max-width:760px;margin:40px auto;padding:20px;background:#071626;color:#eef7ff;font:17px/1.7 system-ui}a{color:#54e3ce}pre{white-space:pre-wrap;font:inherit}</style><nav><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/refunds">Refunds</a></nav><pre>${escape(bot.policy[key])}</pre></html>`);return;
    }
    if(req.method!=='POST'||path!=='/telegram'){res.writeHead(404);res.end();return;}
    const supplied=Buffer.from(String(req.headers['x-telegram-bot-api-secret-token']||'')),expected=Buffer.from(c.secret);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){res.writeHead(403);res.end();return;}
    if(!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(415);res.end();return;}
    if(!healthy()){res.writeHead(503);res.end();return;}
    try{
      let size=0;const chunks=[];req.setTimeout(10000,()=>req.destroy());
      for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end();return;}chunks.push(chunk);}
      let update;try{update=JSON.parse(Buffer.concat(chunks).toString());}catch{res.writeHead(400);res.end();return;}
      if(!update||!Number.isSafeInteger(update.update_id)){res.writeHead(400);res.end();return;}
      if(typeof update.callback_query?.id==='string')await onCallback(update.callback_query.id);
      await enqueue(()=>bot.receive(update));res.writeHead(200);res.end('ok');
    }catch{if(!res.headersSent)res.writeHead(500);res.end();}
  });
}
