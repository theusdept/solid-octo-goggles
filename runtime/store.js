import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export class Store {
  constructor(path=':memory:') {
    if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, session TEXT NOT NULL, accepted TEXT, touched INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS admins(id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS updates(id INTEGER PRIMARY KEY, state TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, state TEXT NOT NULL, result TEXT, created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,data TEXT NOT NULL,status TEXT NOT NULL,touched INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,user_id TEXT NOT NULL,body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT,created INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS limits(user_id TEXT NOT NULL, bucket INTEGER NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(user_id,bucket));
      CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS orders_user ON orders(user_id);
    `);
    // A process can crash after a provider accepted POST: never repeat it automatically.
    this.db.exec("UPDATE attempts SET state='uncertain' WHERE state='creating'; UPDATE updates SET state='interrupted' WHERE state='processing';");
  }
  get(id) {const r=this.db.prepare('SELECT * FROM users WHERE id=?').get(id);return r?{session:JSON.parse(r.session),accepted:r.accepted}:{session:{},accepted:null};}
  save(id,s,accepted=this.get(id).accepted) {this.db.prepare('INSERT INTO users VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET session=excluded.session,accepted=excluded.accepted,touched=excluded.touched').run(id,JSON.stringify(s),accepted,Date.now());}
  claimUpdate(id) {return this.db.prepare("INSERT OR IGNORE INTO updates VALUES(?,'processing',?)").run(id,Date.now()).changes===1;}
  finishUpdate(id) {this.db.prepare("UPDATE updates SET state='done' WHERE id=?").run(id);}
  attempt(id) {const r=this.db.prepare('SELECT * FROM attempts WHERE id=?').get(id);return r?{...r,result:r.result?JSON.parse(r.result):null}:null;}
  begin(id,user) {return this.db.prepare("INSERT OR IGNORE INTO attempts VALUES(?,?,'creating',NULL,?)").run(id,user,Date.now()).changes===1;}
  settle(id,state,result=null) {this.db.prepare('UPDATE attempts SET state=?,result=? WHERE id=?').run(state,result?JSON.stringify(result):null,id);}
  blocked(user) {return this.db.prepare("SELECT id FROM attempts WHERE user_id=? AND state IN ('creating','uncertain') LIMIT 1").get(user);}
  order(id,user) {const r=this.db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(id,user);return r?{...r,data:JSON.parse(r.data)}:null;}
  putOrder(user,data) {const prior=this.db.prepare('SELECT user_id FROM orders WHERE id=?').get(data.id);if(prior&&prior.user_id!==user)throw new Error('Order ownership conflict');this.db.prepare('INSERT INTO orders VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status,touched=excluded.touched').run(data.id,user,JSON.stringify(data),data.status||'waiting',Date.now());}
  list(user) {return this.db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY touched DESC LIMIT 20').all(user);}
  watched() {return this.db.prepare("SELECT * FROM orders WHERE status NOT IN ('finished','refunded') ORDER BY touched LIMIT 100").all().map(r=>({...r,data:JSON.parse(r.data)}));}
  changeOrder(row,data,message) {
    this.db.exec('BEGIN IMMEDIATE');try {
      this.putOrder(row.user_id,data);
      if(data.status!==row.status)this.db.prepare('INSERT INTO notifications(user_id,body) VALUES(?,?)').run(row.user_id,message);
      this.db.exec('COMMIT');
    }catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  notify(user,body) {this.db.prepare('INSERT INTO notifications(user_id,body) VALUES(?,?)').run(user,body);}
  pending() {return this.db.prepare('SELECT * FROM notifications ORDER BY id LIMIT 100').all();}
  sent(id) {this.db.prepare('DELETE FROM notifications WHERE id=?').run(id);}
  isAdmin(id) {return Boolean(this.db.prepare('SELECT 1 FROM admins WHERE id=?').get(id));}
  admin(id,add) {this.db.prepare(add?'INSERT OR IGNORE INTO admins VALUES(?)':'DELETE FROM admins WHERE id=?').run(id);}
  admins() {return this.db.prepare('SELECT id FROM admins').all().map(x=>x.id);}
  audit(actor,action,target='') {this.db.prepare('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)').run(actor,action,target,Date.now());}
  pause(value) {if(value!==undefined)this.db.prepare("INSERT INTO settings VALUES('paused',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(value));return this.db.prepare("SELECT value FROM settings WHERE key='paused'").get()?.value==='true';}
  counts() {return {users:this.db.prepare('SELECT count(*) n FROM users').get().n,orders:this.db.prepare('SELECT count(*) n FROM orders').get().n,uncertain:this.db.prepare("SELECT count(*) n FROM attempts WHERE state='uncertain'").get().n};}
  allow(user, now=Date.now()) {
    const bucket=Math.floor(now/60000);
    this.db.prepare('INSERT INTO limits VALUES(?,?,1) ON CONFLICT(user_id,bucket) DO UPDATE SET count=count+1').run(user,bucket);
    return this.db.prepare('SELECT count FROM limits WHERE user_id=? AND bucket=?').get(user,bucket).count<=20;
  }
  cleanup(now=Date.now()) {
    this.db.prepare('DELETE FROM limits WHERE bucket<?').run(Math.floor(now/60000)-10);
    this.db.prepare('DELETE FROM updates WHERE created<?').run(now-30*86400000);
    this.db.prepare("DELETE FROM orders WHERE status IN ('finished','refunded') AND touched<?").run(now-90*86400000);
    this.db.prepare("DELETE FROM attempts WHERE state IN ('created','rejected') AND created<?").run(now-90*86400000);
    this.db.prepare('DELETE FROM audit WHERE created<?').run(now-90*86400000);
    this.db.prepare("DELETE FROM users WHERE touched<? AND id NOT IN (SELECT user_id FROM orders UNION SELECT user_id FROM attempts WHERE state IN ('uncertain','creating'))").run(now-90*86400000);
  }
  close(){this.db.close();}
}
