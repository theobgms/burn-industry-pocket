'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePocket } from '@/lib/usePocket';

const C = { bg:'#0D0D0D', card:'#111', border:'#1e1e1e', gold:'#FFD60A', orange:'#ff6b35', red:'#D91F26', blue:'#7eb8f7', green:'#3ddc84', text:'#F2F2F2', muted:'#666', dim:'#2a2a2a', purple:'#c084fc' };
const display = { fontFamily:"'Anton',sans-serif", letterSpacing:'0.02em', textTransform:'uppercase' as const };
const pixel   = { fontFamily:"'Press Start 2P',monospace" };
const mono    = { fontFamily:"'Space Mono',monospace" };
const base    = { fontFamily:"'Space Mono',monospace", boxSizing:'border-box' as const };
const card    = { ...base, background:C.card, border:`1px solid ${C.border}`, borderRadius:4, padding:16, marginBottom:10 };
const lbl     = { fontSize:9, letterSpacing:'0.35em', color:C.muted, marginBottom:6, textTransform:'uppercase' as const, ...mono };

const ROOMS = [
  { key:'overview', label:'THE BOOKS',   sub:'P&L · Cash · Where it went',    color:C.gold   },
  { key:'shows',    label:'SHOWS',       sub:'Settle the night · Guarantees', color:C.red    },
  { key:'inbox',    label:'REVIEW',      sub:'Uncategorized transactions',    color:C.orange },
  { key:'owed',     label:"WHAT'S OWED", sub:'Receivables · Payables',        color:C.blue   },
];

let _ac: AudioContext|null = null;
function ac(){ if(!_ac){try{_ac=new(window.AudioContext||(window as any).webkitAudioContext)();}catch{return null;}} if(_ac.state==='suspended')_ac.resume(); return _ac; }
function blip(f=440,d=0.08,t='square' as OscillatorType,v=0.13){const c=ac();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=t;o.frequency.value=f;g.gain.setValueAtTime(v,c.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d);}
const sfxTap  =()=>blip(660,0.06,'square',0.11);
const sfxOpen =()=>{blip(330,0.05,'sawtooth',0.10);setTimeout(()=>blip(495,0.06,'sawtooth',0.10),50);};
const sfxCash =()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>blip(f,0.14,'square',0.14),i*80));
const sfxWar  =()=>{[110,146,196,261].forEach((f,i)=>setTimeout(()=>blip(f,0.18,'sawtooth',0.15),i*70));setTimeout(()=>blip(523,0.5,'square',0.13),320);};

const money  = (n:number)=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const money0 = (n:number)=>`$${Math.round(Number(n||0)).toLocaleString('en-US')}`;
function fmtDate(s:string){ if(!s)return ''; const[,m,d]=s.split('-').map(Number); const M=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']; return `${M[m-1]} ${d}`; }

export default function Pocket(){
  const db = usePocket();
  const [screen,setScreen] = useState<'cold'|'hub'|'room'>('cold');
  const [room,setRoom]     = useState('overview');
  const [drawer,setDrawer] = useState(false);
  const [shake,setShake]   = useState(false);
  const [authed,setAuthed] = useState<boolean|null>(null);

  useEffect(()=>{(async()=>{
    const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){ window.location.href='/login'; return; }
    setAuthed(true);
  })();},[]);

  if(authed===null) return <div style={{minHeight:'100vh',background:C.bg}}/>;

  const org = db.orgs.find((o:any)=>o.id===db.orgId);

  // ── COLD ──
  if(screen==='cold') return(
    <div onClick={()=>{sfxWar();setShake(true);setTimeout(()=>setShake(false),420);setTimeout(()=>setScreen('hub'),260);}}
      style={{minHeight:'100vh',background:C.bg,color:C.text,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',padding:24,textAlign:'center',...base,animation:shake?'biShake 0.4s':'none'}}>
      <div style={{...mono,fontSize:10,letterSpacing:'0.45em',color:C.muted,marginBottom:24}}>BURN INDUSTRY</div>
      <div style={{...display,fontSize:'clamp(44px,13vw,92px)',lineHeight:0.92}}>EVERY</div>
      <div style={{...display,fontSize:'clamp(44px,13vw,92px)',lineHeight:0.92,color:C.red}}>DOLLAR</div>
      <div style={{...display,fontSize:'clamp(44px,13vw,92px)',lineHeight:0.92,color:C.gold}}>COUNTED</div>
      <div style={{...mono,fontSize:12,color:C.muted,maxWidth:300,marginTop:28,lineHeight:1.7}}>No shoebox. No guessing. The books stay clean.</div>
      <div style={{...pixel,fontSize:9,color:C.gold,marginTop:36}}>TAP TO ENTER</div>
    </div>
  );

  // ── HUB ──
  if(screen==='hub') return(
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,padding:'28px 20px 60px',...base}}>
      <div style={{...mono,fontSize:9,letterSpacing:'0.45em',color:C.muted,marginBottom:8}}>BURN INDUSTRY POCKET</div>
      <div style={{...display,fontSize:'clamp(34px,9vw,56px)',lineHeight:0.95,marginBottom:6}}>THE<br/><span style={{color:C.gold}}>LEDGER</span></div>

      <div style={{display:'flex',gap:8,margin:'18px 0 22px',flexWrap:'wrap' as const}}>
        {db.orgs.map((o:any)=>(
          <button key={o.id} onClick={()=>{sfxTap();db.setOrgId(o.id);}}
            style={{...mono,padding:'8px 14px',borderRadius:3,border:`1px solid ${db.orgId===o.id?C.gold:C.border}`,background:db.orgId===o.id?C.gold:'transparent',color:db.orgId===o.id?'#0D0D0D':C.muted,fontSize:10,letterSpacing:'0.12em',fontWeight:700,cursor:'pointer'}}>
            {o.name.toUpperCase()}
          </button>
        ))}
        {db.orgs.length===0&&db.loaded&&<div style={{...mono,fontSize:11,color:C.red,lineHeight:1.6}}>No orgs linked to your account. Run the seed, then add yourself to org_members.</div>}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:22}}>
        {[
          {l:'NET PROFIT',v:money0(db.netProfit),c:db.netProfit>=0?C.green:C.red},
          {l:'CASH',v:money0(db.cashOnHand),c:C.gold},
          {l:'TO REVIEW',v:String(db.unreviewed.length),c:db.unreviewed.length?C.orange:C.muted},
        ].map(b=>(
          <div key={b.l} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:3,padding:'10px 12px'}}>
            <div style={{...lbl,marginBottom:4}}>{b.l}</div>
            <div style={{...display,fontSize:20,color:b.c}}>{b.v}</div>
          </div>
        ))}
      </div>

      <div style={{display:'grid',gap:10}}>
        {ROOMS.map(r=>(
          <button key={r.key} onClick={()=>{sfxOpen();setRoom(r.key);setScreen('room');}}
            style={{...base,textAlign:'left',background:C.card,border:`1px solid ${C.border}`,borderLeft:`4px solid ${r.color}`,borderRadius:6,padding:'18px',cursor:'pointer',color:C.text,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{...display,fontSize:22,color:r.color,lineHeight:1}}>{r.label}</div>
              <div style={{...mono,fontSize:11,color:C.muted,marginTop:5}}>{r.sub}</div>
            </div>
            <span style={{...display,fontSize:24,color:C.dim}}>→</span>
          </button>
        ))}
      </div>
      <button onClick={db.signOut} style={{...mono,marginTop:24,background:'transparent',border:'none',color:C.dim,fontSize:10,cursor:'pointer',letterSpacing:'0.2em'}}>SIGN OUT</button>
    </div>
  );

  const activeRoom = ROOMS.find(r=>r.key===room)||ROOMS[0];

  return(
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,paddingBottom:80,...base}}>
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'16px 18px',borderBottom:`1px solid ${C.border}`,position:'sticky',top:0,background:C.bg,zIndex:40}}>
        <button onClick={()=>{sfxTap();setDrawer(true);}} style={{...base,background:'transparent',border:'none',color:C.text,fontSize:22,cursor:'pointer',padding:0}}>≡</button>
        <div style={{...display,fontSize:20,color:activeRoom.color,lineHeight:1}}>{activeRoom.label}</div>
        <div style={{...mono,fontSize:9,color:C.dim,letterSpacing:'0.2em'}}>{org?.name?.toUpperCase()||''}</div>
        <button onClick={()=>{sfxTap();setScreen('hub');}} style={{...mono,marginLeft:'auto',background:'transparent',border:`1px solid ${C.border}`,color:C.muted,fontSize:9,letterSpacing:'0.2em',padding:'6px 10px',borderRadius:3,cursor:'pointer'}}>HUB</button>
      </div>

      {drawer&&(
        <div onClick={()=>setDrawer(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:60}}>
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',left:0,top:0,bottom:0,width:268,maxWidth:'82vw',background:C.card,borderRight:`1px solid ${C.border}`,padding:'24px 18px',overflowY:'auto'}}>
            <div style={{...lbl,marginBottom:14}}>ORG</div>
            {db.orgs.map((o:any)=>(
              <button key={o.id} onClick={()=>{db.setOrgId(o.id);setDrawer(false);}}
                style={{...mono,display:'block',width:'100%',textAlign:'left',background:db.orgId===o.id?'#0a0a0a':'transparent',border:`1px solid ${db.orgId===o.id?C.gold:C.border}`,borderRadius:4,padding:'10px 12px',marginBottom:6,cursor:'pointer',color:db.orgId===o.id?C.gold:C.muted,fontSize:11}}>{o.name}</button>
            ))}
            <div style={{...lbl,margin:'20px 0 12px'}}>JUMP TO</div>
            {ROOMS.map(r=>(
              <button key={r.key} onClick={()=>{sfxOpen();setRoom(r.key);setDrawer(false);}}
                style={{...base,display:'block',width:'100%',textAlign:'left',background:room===r.key?'#0a0a0a':'transparent',border:`1px solid ${room===r.key?r.color:C.border}`,borderRadius:5,padding:'12px 14px',marginBottom:8,cursor:'pointer'}}>
                <div style={{...display,fontSize:16,color:r.color}}>{r.label}</div>
                <div style={{...mono,fontSize:10,color:C.muted,marginTop:2}}>{r.sub}</div>
              </button>
            ))}
            <button onClick={db.signOut} style={{...mono,marginTop:16,background:'transparent',border:'none',color:C.dim,fontSize:10,cursor:'pointer',letterSpacing:'0.2em',padding:0}}>SIGN OUT</button>
          </div>
        </div>
      )}

      <div style={{padding:'20px 20px 0',opacity:db.loaded?1:0,transition:'opacity 0.4s'}}>
        {room==='overview'&&<OverviewRoom db={db}/>}
        {room==='shows'&&<ShowsRoom db={db}/>}
        {room==='inbox'&&<InboxRoom db={db}/>}
        {room==='owed'&&<OwedRoom db={db}/>}
      </div>
    </div>
  );
}

/* ═══════════════ THE BOOKS ═══════════════ */
function OverviewRoom({db}:{db:any}){
  const rev=db.income, cogs=db.cogs, exp=db.expense, net=db.netProfit;
  const margin = rev>0 ? (net/rev)*100 : 0;
  const barPct = rev>0 ? Math.min(100,((cogs+exp)/rev)*100) : 0;

  const incomeAccts  = db.accountsByType('income').map((a:any)=>({...a,bal:db.balanceOf(a.id)})).filter((a:any)=>a.bal!==0).sort((a:any,b:any)=>b.bal-a.bal);
  const expenseAccts = [...db.accountsByType('cogs'),...db.accountsByType('expense')].map((a:any)=>({...a,bal:db.balanceOf(a.id)})).filter((a:any)=>a.bal!==0).sort((a:any,b:any)=>b.bal-a.bal);

  return(<>
    <div style={{...card,borderLeft:`3px solid ${net>=0?C.green:C.red}`}}>
      <div style={{...lbl,color:net>=0?C.green:C.red}}>NET PROFIT</div>
      <div style={{...display,fontSize:'clamp(38px,11vw,58px)',lineHeight:1,color:net>=0?C.green:C.red}}>{money(net)}</div>
      <div style={{...mono,fontSize:11,color:C.muted,marginTop:6}}>
        {rev>0?`${margin.toFixed(1)}% margin on ${money0(rev)} revenue`:'No revenue booked yet'}
      </div>
      <div style={{background:'#0a0a0a',border:`1px solid ${C.border}`,borderRadius:3,height:14,overflow:'hidden',marginTop:14}}>
        <div style={{height:'100%',width:`${barPct}%`,background:barPct>90?C.red:`linear-gradient(90deg,${C.orange},${C.gold})`,transition:'width .4s'}}/>
      </div>
      <div style={{...mono,fontSize:10,color:C.dim,marginTop:6}}>{barPct.toFixed(0)}% of revenue eaten by costs</div>
    </div>

    <div style={{display:'flex',gap:8,marginBottom:12}}>
      {[{l:'CASH ON HAND',v:money0(db.cashOnHand),c:C.gold},{l:'OWED TO YOU',v:money0(db.arOpen),c:C.blue},{l:'YOU OWE',v:money0(db.apOpen),c:C.red}].map(b=>(
        <div key={b.l} style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:3,padding:'10px 12px'}}>
          <div style={{...lbl,marginBottom:4}}>{b.l}</div>
          <div style={{...display,fontSize:18,color:b.c}}>{b.v}</div>
        </div>
      ))}
    </div>

    <div style={{...card,borderLeft:`3px solid ${C.green}`}}>
      <div style={{...lbl,color:C.green}}>MONEY IN</div>
      {incomeAccts.length===0&&<div style={{...mono,fontSize:12,color:C.dim,fontStyle:'italic'}}>Nothing booked yet.</div>}
      {incomeAccts.map((a:any)=>(
        <div key={a.id} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${C.border}`}}>
          <span style={{...mono,fontSize:12,color:C.text}}>{a.name}</span>
          <span style={{...mono,fontSize:12,color:C.green,fontWeight:700}}>{money(a.bal)}</span>
        </div>
      ))}
    </div>

    <div style={{...card,borderLeft:`3px solid ${C.red}`}}>
      <div style={{...lbl,color:C.red}}>MONEY OUT</div>
      {expenseAccts.length===0&&<div style={{...mono,fontSize:12,color:C.dim,fontStyle:'italic'}}>Nothing booked yet.</div>}
      {expenseAccts.map((a:any)=>{
        const pct = rev>0 ? (a.bal/rev)*100 : 0;
        return(
          <div key={a.id} style={{padding:'9px 0',borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{...mono,fontSize:12,color:C.text}}>{a.name}</span>
              <span style={{...mono,fontSize:12,color:C.red,fontWeight:700}}>{money(a.bal)}</span>
            </div>
            {rev>0&&<div style={{background:'#0a0a0a',borderRadius:2,height:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.min(100,pct)}%`,background:C.red,opacity:0.7}}/>
            </div>}
          </div>
        );
      })}
    </div>
  </>);
}

/* ═══════════════ SHOWS ═══════════════ */
function ShowsRoom({db}:{db:any}){
  const [openId,setOpenId] = useState<string|null>(null);
  const [adding,setAdding] = useState(false);
  const [f,setF] = useState<any>({date:'',venue_name:'',city:'',deal_type:'flat_guarantee',guarantee_amount:''});
  const [s,setS] = useState<any>({guarantee_received:'',door_split_received:'',merch_gross:'',merch_venue_cut_amount:'',other_income:'',notes:''});
  const input={...mono,width:'100%',background:'#0a0a0a',border:`1px solid ${C.border}`,borderRadius:3,padding:'10px 12px',fontSize:13,color:C.text,marginBottom:8};

  const settledFor=(showId:string)=>db.settlements.find((x:any)=>x.show_id===showId);
  const netOf=(st:any)=>!st?0:Number(st.guarantee_received||0)+Number(st.door_split_received||0)+Number(st.merch_gross||0)-Number(st.merch_venue_cut_amount||0)+Number(st.other_income||0);
  const totalSettled = db.settlements.reduce((a:number,st:any)=>a+netOf(st),0);

  return(<>
    <div style={{...card,borderLeft:`3px solid ${C.red}`}}>
      <div style={{...lbl,color:C.red}}>THE ROAD</div>
      <div style={{...display,fontSize:32,color:C.gold,lineHeight:1}}>{money0(totalSettled)}</div>
      <div style={{...mono,fontSize:11,color:C.muted,marginTop:5}}>{db.settlements.length} of {db.shows.length} shows settled</div>
      <button onClick={()=>{sfxTap();setAdding((a:boolean)=>!a);}} style={{...mono,marginTop:14,width:'100%',background:adding?'transparent':C.red,border:`1px solid ${C.red}`,borderRadius:3,color:adding?C.red:'#fff',fontSize:10,letterSpacing:'0.2em',fontWeight:700,padding:'11px',cursor:'pointer'}}>
        {adding?'✕ CANCEL':'+ ADD A SHOW'}
      </button>
    </div>

    {adding&&(
      <div style={{...card,borderLeft:`3px solid ${C.red}`,background:'#0d0000'}}>
        <div style={{...lbl,color:C.red,marginBottom:12}}>NEW SHOW</div>
        <input type="date" value={f.date} onChange={e=>setF({...f,date:e.target.value})} style={input}/>
        <input placeholder="Venue name" value={f.venue_name} onChange={e=>setF({...f,venue_name:e.target.value})} style={input}/>
        <input placeholder="City" value={f.city} onChange={e=>setF({...f,city:e.target.value})} style={input}/>
        <select value={f.deal_type} onChange={e=>setF({...f,deal_type:e.target.value})} style={{...input,cursor:'pointer'}}>
          <option value="flat_guarantee">Flat guarantee</option>
          <option value="guarantee_vs_door">Guarantee vs door</option>
          <option value="door_split">Door split</option>
          <option value="other">Other</option>
        </select>
        <input placeholder="Guarantee amount" type="number" value={f.guarantee_amount} onChange={e=>setF({...f,guarantee_amount:e.target.value})} style={input}/>
        <button onClick={async()=>{
          if(!f.date||!f.venue_name)return;
          sfxCash();
          await db.addShow({...f,guarantee_amount:f.guarantee_amount?Number(f.guarantee_amount):null});
          setF({date:'',venue_name:'',city:'',deal_type:'flat_guarantee',guarantee_amount:''});setAdding(false);
        }} style={{...mono,width:'100%',background:C.red,border:'none',borderRadius:3,color:'#fff',fontSize:10,letterSpacing:'0.2em',fontWeight:700,padding:'12px',cursor:'pointer'}}>BOOK IT</button>
      </div>
    )}

    {db.shows.length===0&&<div style={card}><div style={{...mono,fontSize:12,color:C.dim,fontStyle:'italic'}}>No shows yet. Add your first one above.</div></div>}

    {db.shows.map((show:any)=>{
      const st = settledFor(show.id);
      const isOpen = openId===show.id;
      return(
        <div key={show.id} style={{...card,borderLeft:`3px solid ${st?C.green:C.red}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
            <div style={{flex:1}}>
              <div style={{...mono,fontSize:9,letterSpacing:'0.2em',color:st?C.green:C.red,fontWeight:700,marginBottom:5}}>
                {fmtDate(show.date)} · {st?'SETTLED':String(show.status).toUpperCase()}
              </div>
              <div style={{...display,fontSize:20,lineHeight:1.1}}>{show.venue_name}</div>
              <div style={{...mono,fontSize:11,color:C.muted,marginTop:4}}>
                {show.city?`${show.city} · `:''}{String(show.deal_type).replace(/_/g,' ')}
                {show.guarantee_amount?` · ${money0(show.guarantee_amount)} gtd`:''}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              {st?(
                <div style={{...display,fontSize:20,color:C.green}}>{money0(netOf(st))}</div>
              ):(
                <button onClick={()=>{sfxTap();setOpenId(isOpen?null:show.id);}}
                  style={{...mono,background:'transparent',border:`1px solid ${C.gold}`,borderRadius:3,color:C.gold,fontSize:9,letterSpacing:'0.12em',fontWeight:700,padding:'8px 10px',cursor:'pointer',whiteSpace:'nowrap'}}>
                  {isOpen?'CLOSE':'SETTLE →'}
                </button>
              )}
            </div>
          </div>

          {st&&(
            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
              {([['Guarantee',st.guarantee_received],['Door split',st.door_split_received],['Merch gross',st.merch_gross],['Venue merch cut',-st.merch_venue_cut_amount],['Other',st.other_income]] as any[])
                .filter(([,v]:any)=>Number(v)!==0).map(([l,v]:any)=>(
                <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'5px 0'}}>
                  <span style={{...mono,fontSize:11,color:C.muted}}>{l}</span>
                  <span style={{...mono,fontSize:11,color:Number(v)<0?C.red:C.text}}>{money(Number(v))}</span>
                </div>
              ))}
              {st.notes&&<div style={{...mono,fontSize:11,color:C.dim,marginTop:8,fontStyle:'italic'}}>{st.notes}</div>}
            </div>
          )}

          {isOpen&&!st&&(
            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
              <div style={{...lbl,color:C.gold,marginBottom:10}}>SETTLE THE NIGHT</div>
              {([['guarantee_received','Guarantee received'],['door_split_received','Door split received'],['merch_gross','Merch gross'],['merch_venue_cut_amount','Venue merch cut'],['other_income','Other income']] as any[]).map(([k,l]:any)=>(
                <div key={k} style={{marginBottom:8}}>
                  <div style={{...mono,fontSize:9,color:C.muted,letterSpacing:'0.15em',marginBottom:4}}>{String(l).toUpperCase()}</div>
                  <input type="number" value={s[k]} onChange={e=>setS({...s,[k]:e.target.value})} placeholder="0.00" style={{...input,marginBottom:0}}/>
                </div>
              ))}
              <input placeholder="Notes (optional)" value={s.notes} onChange={e=>setS({...s,notes:e.target.value})} style={{...input,marginTop:8}}/>
              <button onClick={async()=>{
                sfxCash();
                await db.settleShow(show.id,{
                  guarantee_received:Number(s.guarantee_received||0),
                  door_split_received:Number(s.door_split_received||0),
                  merch_gross:Number(s.merch_gross||0),
                  merch_venue_cut_amount:Number(s.merch_venue_cut_amount||0),
                  other_income:Number(s.other_income||0),
                  notes:s.notes||null,
                });
                setS({guarantee_received:'',door_split_received:'',merch_gross:'',merch_venue_cut_amount:'',other_income:'',notes:''});
                setOpenId(null);
              }} style={{...mono,width:'100%',background:C.gold,border:'none',borderRadius:3,color:'#0D0D0D',fontSize:10,letterSpacing:'0.2em',fontWeight:700,padding:'13px',cursor:'pointer'}}>
                ✓ LOCK THE SETTLEMENT
              </button>
            </div>
          )}
        </div>
      );
    })}
  </>);
}

/* ═══════════════ REVIEW ═══════════════ */
function InboxRoom({db}:{db:any}){
  const queue = db.unreviewed;
  const [pick,setPick] = useState<Record<string,string>>({});

  return(<>
    <div style={{...card,borderLeft:`3px solid ${C.orange}`}}>
      <div style={{...lbl,color:C.orange}}>REVIEW QUEUE</div>
      <div style={{...display,fontSize:32,color:queue.length?C.orange:C.green,lineHeight:1}}>{queue.length}</div>
      <div style={{...mono,fontSize:11,color:C.muted,marginTop:5}}>
        {queue.length?'transactions waiting to be categorized':'Inbox zero. Books are clean.'}
      </div>
    </div>

    {queue.length===0&&(
      <div style={{...card,textAlign:'center',borderColor:C.green,background:'#0a1005'}}>
        <div style={{...pixel,fontSize:12,color:C.green,marginBottom:10}}>ALL CLEAR</div>
        <div style={{...mono,fontSize:11,color:C.muted}}>Nothing to review. Import a statement to bring more in.</div>
      </div>
    )}

    {queue.map((t:any)=>{
      const suggested = t.suggested_account_id ? db.accounts.find((a:any)=>a.id===t.suggested_account_id) : null;
      const chosen = pick[t.id] || t.suggested_account_id || '';
      return(
        <div key={t.id} style={{...card,borderLeft:`3px solid ${C.orange}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:12}}>
            <div style={{flex:1}}>
              <div style={{...mono,fontSize:9,letterSpacing:'0.2em',color:C.dim,marginBottom:5}}>{fmtDate(t.date)}</div>
              <div style={{...mono,fontSize:13,color:C.text,lineHeight:1.4}}>{t.normalized_vendor||t.description}</div>
            </div>
            <div style={{...display,fontSize:20,color:Number(t.amount)<0?C.red:C.green,whiteSpace:'nowrap'}}>{money(t.amount)}</div>
          </div>

          {suggested&&(
            <div style={{...mono,fontSize:10,color:C.purple,marginBottom:8,letterSpacing:'0.1em'}}>
              SUGGESTED: {suggested.name}{t.suggested_confidence?` · ${Math.round(t.suggested_confidence*100)}% SURE`:''}
            </div>
          )}

          <select value={chosen} onChange={e=>setPick({...pick,[t.id]:e.target.value})}
            style={{...mono,width:'100%',background:'#0a0a0a',border:`1px solid ${C.border}`,borderRadius:3,padding:'10px 12px',fontSize:12,color:C.text,marginBottom:8,cursor:'pointer'}}>
            <option value="">Choose an account…</option>
            {db.accounts.map((a:any)=><option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>

          <div style={{display:'flex',gap:8}}>
            <button disabled={!chosen} onClick={()=>{sfxCash();db.categorizeTxn(t.id,chosen);}}
              style={{...mono,flex:1,background:chosen?C.orange:C.dim,border:'none',borderRadius:3,color:chosen?'#0D0D0D':C.muted,fontSize:10,letterSpacing:'0.2em',fontWeight:700,padding:'11px',cursor:chosen?'pointer':'not-allowed'}}>CATEGORIZE</button>
            <button onClick={()=>{sfxTap();db.ignoreTxn(t.id);}}
              style={{...mono,background:'transparent',border:`1px solid ${C.border}`,borderRadius:3,color:C.muted,fontSize:9,letterSpacing:'0.1em',padding:'11px 14px',cursor:'pointer'}}>IGNORE</button>
          </div>
        </div>
      );
    })}
  </>);
}

/* ═══════════════ WHAT'S OWED ═══════════════ */
function OwedRoom({db}:{db:any}){
  const [adding,setAdding] = useState(false);
  const [f,setF] = useState<any>({description:'',amount_expected:'',due_date:''});
  const input={...mono,width:'100%',background:'#0a0a0a',border:`1px solid ${C.border}`,borderRadius:3,padding:'10px 12px',fontSize:13,color:C.text,marginBottom:8};
  const today = new Date().toISOString().slice(0,10);

  const open = db.receivables.filter((r:any)=>r.status!=='paid');
  const paid = db.receivables.filter((r:any)=>r.status==='paid');

  return(<>
    <div style={{display:'flex',gap:8,marginBottom:12}}>
      <div style={{flex:1,background:C.card,border:`1px solid ${C.blue}`,borderRadius:3,padding:'14px'}}>
        <div style={{...lbl,color:C.blue,marginBottom:4}}>OWED TO YOU</div>
        <div style={{...display,fontSize:26,color:C.blue}}>{money0(db.arOpen)}</div>
      </div>
      <div style={{flex:1,background:C.card,border:`1px solid ${C.red}`,borderRadius:3,padding:'14px'}}>
        <div style={{...lbl,color:C.red,marginBottom:4}}>YOU OWE</div>
        <div style={{...display,fontSize:26,color:C.red}}>{money0(db.apOpen)}</div>
      </div>
    </div>

    <div style={{...card,borderLeft:`3px solid ${C.blue}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{...lbl,color:C.blue,marginBottom:0}}>RECEIVABLES</div>
        <button onClick={()=>{sfxTap();setAdding((a:boolean)=>!a);}}
          style={{...mono,background:'transparent',border:`1px solid ${C.blue}`,borderRadius:3,color:C.blue,fontSize:9,letterSpacing:'0.12em',fontWeight:700,padding:'6px 12px',cursor:'pointer'}}>{adding?'✕ CLOSE':'+ ADD'}</button>
      </div>
      {adding&&(
        <div style={{marginTop:14}}>
          <input placeholder="Who owes you, and for what?" value={f.description} onChange={e=>setF({...f,description:e.target.value})} style={input}/>
          <input type="number" placeholder="Amount expected" value={f.amount_expected} onChange={e=>setF({...f,amount_expected:e.target.value})} style={input}/>
          <input type="date" value={f.due_date} onChange={e=>setF({...f,due_date:e.target.value})} style={input}/>
          <button onClick={async()=>{
            if(!f.description||!f.amount_expected)return;
            sfxCash();
            await db.addReceivable({description:f.description,amount_expected:Number(f.amount_expected),due_date:f.due_date||null});
            setF({description:'',amount_expected:'',due_date:''});setAdding(false);
          }} style={{...mono,width:'100%',background:C.blue,border:'none',borderRadius:3,color:'#0D0D0D',fontSize:10,letterSpacing:'0.2em',fontWeight:700,padding:'12px',cursor:'pointer'}}>TRACK IT</button>
        </div>
      )}
    </div>

    {open.length===0&&<div style={card}><div style={{...mono,fontSize:12,color:C.dim,fontStyle:'italic'}}>Nobody owes you anything — or nothing is tracked yet.</div></div>}

    {open.map((r:any)=>{
      const outstanding = Number(r.amount_expected)-Number(r.amount_received);
      const overdue = r.due_date && r.due_date < today;
      return(
        <div key={r.id} style={{...card,borderLeft:`3px solid ${overdue?C.red:C.blue}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10}}>
            <div style={{flex:1}}>
              <div style={{...mono,fontSize:13,color:C.text,lineHeight:1.4}}>{r.description||'Untitled'}</div>
              <div style={{...mono,fontSize:10,color:overdue?C.red:C.muted,marginTop:5,letterSpacing:'0.1em'}}>
                {overdue?'OVERDUE · ':''}{r.due_date?`DUE ${fmtDate(r.due_date)}`:'NO DUE DATE'}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{...display,fontSize:20,color:overdue?C.red:C.blue}}>{money0(outstanding)}</div>
              <button onClick={()=>{sfxCash();db.markReceived(r.id,Number(r.amount_expected));}}
                style={{...mono,marginTop:8,background:'transparent',border:`1px solid ${C.green}`,borderRadius:3,color:C.green,fontSize:9,letterSpacing:'0.12em',fontWeight:700,padding:'6px 10px',cursor:'pointer',whiteSpace:'nowrap'}}>✓ GOT PAID</button>
            </div>
          </div>
        </div>
      );
    })}

    {paid.length>0&&(
      <div style={{...card,marginTop:20}}>
        <div style={{...lbl,color:C.green,marginBottom:10}}>COLLECTED ({paid.length})</div>
        {paid.map((r:any)=>(
          <div key={r.id} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
            <span style={{...mono,fontSize:11,color:C.muted,textDecoration:'line-through'}}>{r.description}</span>
            <span style={{...mono,fontSize:11,color:C.green}}>{money(r.amount_received)}</span>
          </div>
        ))}
      </div>
    )}

    {db.payables.length>0&&(
      <div style={{...card,borderLeft:`3px solid ${C.red}`,marginTop:20}}>
        <div style={{...lbl,color:C.red,marginBottom:10}}>PAYABLES</div>
        {db.payables.map((p:any)=>(
          <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:`1px solid ${C.border}`}}>
            <div>
              <div style={{...mono,fontSize:12,color:C.text}}>{p.description||'Untitled'}</div>
              {p.due_date&&<div style={{...mono,fontSize:10,color:C.muted,marginTop:3}}>DUE {fmtDate(p.due_date)}</div>}
            </div>
            <span style={{...mono,fontSize:12,color:C.red,fontWeight:700}}>{money(p.amount_expected||p.amount||0)}</span>
          </div>
        ))}
      </div>
    )}
  </>);
}
