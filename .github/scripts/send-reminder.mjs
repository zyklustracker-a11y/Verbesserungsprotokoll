/* ═══════════════════════════════════════════════════════════════════
   Tägliche To-do-Erinnerung · Versand

   Läuft im Workflow „To-do-Erinnerung“ alle 15 Minuten und entscheidet
   selbst, ob gerade etwas zu verschicken ist. Warum nicht einfach ein
   Cron auf die Wunschuhrzeit? Weil GitHub Cron-Läufe in UTC plant und
   sie unter Last auch mal deutlich später startet. Deshalb: oft laufen,
   selten senden.

   Gesendet wird, wenn ALLE Punkte zutreffen:
     · settings/notifications.enabled ist true
     · die Ortszeit liegt zwischen der Wunschuhrzeit und zwei Stunden
       danach (das fängt verspätete Läufe ab, verhindert aber, dass ein
       am Nachmittag gesetzter Haken sofort eine Mitteilung auslöst)
     · heute wurde noch nichts verschickt (lastSentDate)

   Bewusst ohne npm-Pakete: Node bringt alles mit, was gebraucht wird
   (crypto zum Signieren, fetch für die Aufrufe).
   ═══════════════════════════════════════════════════════════════════ */

import crypto from 'node:crypto';

const PROJECT_ID = 'verbesserungsprotokoll';
const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FCM_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

// Wie lange nach der Wunschuhrzeit noch gesendet werden darf.
const FENSTER_MINUTEN = 120;

function log(...a){ console.log(...a); }

// ── Zugang ────────────────────────────────────────────────────────
// Dienstkonto-Schlüssel → kurzlebiges Zugriffstoken (JWT-Bearer-Fluss).
async function accessToken(sa){
  const b64url = (v)=>Buffer.from(v).toString('base64url');
  const now = Math.floor(Date.now()/1000);
  const scopes = [
    'https://www.googleapis.com/auth/datastore',
    'https://www.googleapis.com/auth/firebase.messaging'
  ];
  const unsigned =
    b64url(JSON.stringify({alg:'RS256', typ:'JWT'})) + '.' +
    b64url(JSON.stringify({
      iss: sa.client_email,
      scope: scopes.join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600
    }));
  const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
  const res = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({
      grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: unsigned + '.' + b64url(sig)
    })
  });
  if(!res.ok) throw new Error('Anmeldung bei Google fehlgeschlagen: '+res.status+' '+await res.text());
  return (await res.json()).access_token;
}

// ── Firestore über die REST-Schnittstelle ─────────────────────────
// Firestore verpackt jeden Wert in einen Typ-Umschlag – hier wieder auspacken.
function unwrap(fields){
  const out = {};
  for(const [k,v] of Object.entries(fields||{})){
    if('stringValue'    in v) out[k] = v.stringValue;
    else if('booleanValue' in v) out[k] = v.booleanValue;
    else if('integerValue' in v) out[k] = Number(v.integerValue);
    else if('doubleValue'  in v) out[k] = v.doubleValue;
    else if('timestampValue' in v) out[k] = v.timestampValue;
    else if('nullValue' in v) out[k] = null;
  }
  return out;
}

async function fsGet(token,path){
  const res = await fetch(`${FS_BASE}/${path}`,{headers:{Authorization:'Bearer '+token}});
  if(res.status===404) return null;
  if(!res.ok) throw new Error('Firestore-Abfrage fehlgeschlagen ('+path+'): '+res.status+' '+await res.text());
  return await res.json();
}

async function fsList(token,collection,pageSize=300){
  const out = [];
  let pageToken = '';
  do{
    const url = `${FS_BASE}/${collection}?pageSize=${pageSize}`+(pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:'');
    const res = await fetch(url,{headers:{Authorization:'Bearer '+token}});
    if(!res.ok) throw new Error('Firestore-Liste fehlgeschlagen ('+collection+'): '+res.status+' '+await res.text());
    const data = await res.json();
    (data.documents||[]).forEach(d=>{
      out.push({ name:d.name, id:String(d.name||'').split('/').pop(), data:unwrap(d.fields) });
    });
    pageToken = data.nextPageToken || '';
  }while(pageToken);
  return out;
}

async function fsSetField(token,path,field,stringValue){
  const res = await fetch(`${FS_BASE}/${path}?updateMask.fieldPaths=${field}`,{
    method:'PATCH',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({fields:{[field]:{stringValue}}})
  });
  if(!res.ok) throw new Error('Firestore-Schreiben fehlgeschlagen: '+res.status+' '+await res.text());
}

async function fsDelete(token,name){
  const res = await fetch(`https://firestore.googleapis.com/v1/${name}`,{
    method:'DELETE', headers:{Authorization:'Bearer '+token}
  });
  if(!res.ok) log('  Hinweis: Token konnte nicht entfernt werden ('+res.status+')');
}

// ── Ortszeit ──────────────────────────────────────────────────────
// Über Intl, damit Sommer- und Winterzeit automatisch stimmen.
function ortszeit(timezone){
  let parts;
  try{
    parts = new Intl.DateTimeFormat('en-CA',{
      timeZone: timezone, year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12:false
    }).formatToParts(new Date());
  }catch(err){
    log('Unbekannte Zeitzone „'+timezone+'“ – es wird Europe/Zurich benutzt.');
    return ortszeit('Europe/Zurich');
  }
  const p = {};
  parts.forEach(x=>{ p[x.type] = x.value; });
  const stunde = p.hour==='24' ? '00' : p.hour;     // manche Umgebungen liefern 24
  return {
    datum: `${p.year}-${p.month}-${p.day}`,
    minuten: Number(stunde)*60 + Number(p.minute),
    uhrzeit: `${stunde}:${p.minute}`,
    zone: timezone
  };
}

// ── Nachrichtentext ───────────────────────────────────────────────
function nachricht(todos){
  if(todos.length===0){
    return { title:'Keine offenen To-dos', body:'Alles abgehakt – nichts zu tun.' };
  }
  const namen = todos
    .slice()
    .sort((a,b)=>(a.data.order??0)-(b.data.order??0))
    .map(t=>String(t.data.text||'').replace(/\s+/g,' ').trim())
    .filter(Boolean);
  const titel = todos.length===1 ? '1 offenes To-do' : todos.length+' offene To-dos';
  let body = namen.slice(0,3).join(' · ');
  if(namen.length>3) body += ' · und '+(namen.length-3)+' weitere';
  if(body.length>180) body = body.slice(0,179)+'…';
  return { title:titel, body: body || 'Schau in deine Liste.' };
}

// ── Versand ───────────────────────────────────────────────────────
async function sende(token,geraetToken,text){
  const res = await fetch(FCM_URL,{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({
      message:{
        token: geraetToken,
        // Bewusst nur data: der Service Worker zeigt dann genau eine
        // Benachrichtigung an. Bei notification käme eine zweite dazu.
        data:{ title:text.title, body:text.body, url:'./#/todos' },
        webpush:{ headers:{ Urgency:'normal', TTL:'86400' } }
      }
    })
  });
  if(res.ok) return {ok:true};
  const body = await res.text();
  // Abgelaufene oder zurückgezogene Anmeldungen dürfen weg.
  const abgelaufen = res.status===404
    || /UNREGISTERED|NOT_FOUND|INVALID_ARGUMENT/.test(body);
  return {ok:false, abgelaufen, body:body.slice(0,300)};
}

// ── Ablauf ────────────────────────────────────────────────────────
async function main(){
  const roh = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!roh || !roh.trim()){
    log('Kein Dienstkonto hinterlegt (Secret FIREBASE_SERVICE_ACCOUNT fehlt).');
    log('Solange das so ist, wird nichts verschickt – der Lauf gilt trotzdem als erfolgreich.');
    return;
  }
  let sa;
  try{ sa = JSON.parse(roh); }
  catch(err){ throw new Error('Das Secret FIREBASE_SERVICE_ACCOUNT ist kein gültiges JSON.'); }
  if(!sa.client_email || !sa.private_key){
    throw new Error('Im Dienstkonto fehlen client_email oder private_key.');
  }

  const token = await accessToken(sa);

  const doc = await fsGet(token,'settings/notifications');
  const s = doc ? unwrap(doc.fields) : {};
  if(s.enabled!==true){ log('Die tägliche Erinnerung ist ausgeschaltet – nichts zu tun.'); return; }

  const zeit = ortszeit(s.timezone || 'Europe/Zurich');
  const wunsch = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.time||'')) ? String(s.time) : '09:00';
  const wunschMinuten = Number(wunsch.slice(0,2))*60 + Number(wunsch.slice(3,5));
  const abstand = zeit.minuten - wunschMinuten;

  log(`Ortszeit ${zeit.uhrzeit} (${zeit.zone}), gewünscht ${wunsch}, zuletzt ${s.lastSentDate||'nie'}.`);

  if(s.lastSentDate === zeit.datum){ log('Heute wurde bereits erinnert.'); return; }
  if(abstand < 0){ log('Noch zu früh.'); return; }
  if(abstand > FENSTER_MINUTEN){ log('Das Zeitfenster für heute ist vorbei.'); return; }

  const geraete = await fsList(token,'pushTokens');
  if(geraete.length===0){ log('Kein Gerät angemeldet – nichts zu senden.'); return; }

  const todos = await fsList(token,'todos');
  const text = nachricht(todos);
  log(`Sende an ${geraete.length} Gerät(e): „${text.title} – ${text.body}“`);

  let erfolge = 0;
  for(const g of geraete){
    const t = String(g.data.token||'');
    if(!t){ await fsDelete(token,g.name); continue; }
    const r = await sende(token,t,text);
    if(r.ok){ erfolge++; log('  ✓ '+(g.data.label||g.id)); }
    else if(r.abgelaufen){
      log('  – '+(g.data.label||g.id)+': Anmeldung abgelaufen, wird entfernt');
      await fsDelete(token,g.name);
    }else{
      log('  ✗ '+(g.data.label||g.id)+': '+r.body);
    }
  }

  if(erfolge>0){
    await fsSetField(token,'settings/notifications','lastSentDate',zeit.datum);
    log(`Fertig – an ${erfolge} Gerät(e) zugestellt.`);
  }else{
    // Nicht als gesendet markieren: dann versucht es der nächste Lauf erneut.
    log('An kein Gerät zugestellt – der nächste Lauf versucht es noch einmal.');
  }
}

main().catch(err=>{
  console.error(String((err && err.message) || err));
  process.exit(1);
});
