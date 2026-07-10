'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const C={bg:'#0D0D0D',card:'#111',border:'#1e1e1e',gold:'#FFD60A',red:'#D91F26',text:'#F2F2F2',muted:'#666'};
const display={fontFamily:"'Anton',sans-serif",textTransform:'uppercase' as const,letterSpacing:'0.02em'};
const mono={fontFamily:"'Space Mono',monospace"};

export default function Login(){
  const [email,setEmail]=useState('');
  const [sent,setSent]=useState(false);
  const [err,setErr]=useState('');
  const [loading,setLoading]=useState(false);

  async function send(){
    if(!email.trim())return;
    setLoading(true);setErr('');
    const supabase=createClient();
    const {error}=await supabase.auth.signInWithOtp({
      email:email.trim(),
      options:{emailRedirectTo:`${window.location.origin}/auth/callback`}
    });
    setLoading(false);
    if(error)setErr(error.message); else setSent(true);
  }

  return(
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{...mono,fontSize:9,letterSpacing:'0.45em',color:C.muted,marginBottom:10}}>BURN INDUSTRY</div>
        <div style={{...display,fontSize:'clamp(38px,11vw,60px)',lineHeight:0.92,color:C.text}}>POCKET</div>
        <div style={{...mono,fontSize:12,color:C.muted,marginTop:12,marginBottom:32,lineHeight:1.7}}>Every dollar accounted for. Sign in to continue.</div>
        {!sent?(<>
          <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send();}}
            type="email" placeholder="you@burnindustry.com"
            style={{...mono,width:'100%',background:'#0a0a0a',border:`1px solid ${C.border}`,borderRadius:3,padding:'13px 14px',fontSize:13,color:C.text,marginBottom:10}}/>
          <button onClick={send} disabled={loading}
            style={{...mono,width:'100%',background:loading?C.border:C.gold,border:'none',borderRadius:3,color:loading?C.muted:'#0D0D0D',fontSize:11,letterSpacing:'0.25em',fontWeight:700,padding:'14px',cursor:loading?'wait':'pointer'}}>
            {loading?'SENDING…':'SEND MAGIC LINK'}
          </button>
          {err&&<div style={{...mono,fontSize:11,color:C.red,marginTop:12}}>{err}</div>}
        </>):(
          <div style={{background:C.card,border:`1px solid ${C.gold}`,borderRadius:4,padding:20}}>
            <div style={{...mono,fontSize:10,letterSpacing:'0.2em',color:C.gold,fontWeight:700,marginBottom:8}}>CHECK YOUR EMAIL</div>
            <div style={{...mono,fontSize:12,color:C.muted,lineHeight:1.7}}>A sign-in link is on its way to {email}.</div>
          </div>
        )}
      </div>
    </div>
  );
}
