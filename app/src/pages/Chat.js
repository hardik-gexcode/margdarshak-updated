import{useState,useRef,useEffect}from'react';import{useAuth}from'../context/AuthContext';import AppShell from'../components/AppShell';import toast from'react-hot-toast';import{Send,MessageSquare,AlertCircle}from'lucide-react';
const STARTERS=['What skills get me ₹10 LPA fastest?','How do I switch from non-tech to tech?','Best free certifications for Indian jobs?','How to negotiate salary at a startup?','How to build a portfolio with no experience?','MBA or AI upskilling — which is better?'];
function parseBold(text){return text.split(/(\*\*[^*]+\*\*)/g).map((p,i)=>p.startsWith('**')&&p.endsWith('**')?<strong key={i} style={{fontWeight:900}}>{p.slice(2,-2)}</strong>:p);}
function Bubble({msg}){const u=msg.role==='user';const lines=msg.content.split('\n');return<div style={{display:'flex',flexDirection:u?'row-reverse':'row',alignItems:'flex-end',gap:9,marginBottom:16}}>{!u&&<div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:12,color:'white',flexShrink:0}}>M</div>}<div className={'bubble '+(u?'user':'ai')} style={{lineHeight:1.65}}>{lines.map((line,i)=><span key={i}>{parseBold(line)}{i<lines.length-1&&<br/>}</span>)}</div></div>;}
export default function Chat(){
  const{user,api,updateUser}=useAuth();
  const[msgs,setMsgs]=useState([{role:'assistant',content:'Hey '+(user?.name?.split(' ')[0]||'there')+'! 👋 I\'m your MARGDARSHAK AI Mentor.\n\nAsk me anything — which skills to build, how to crack interviews, salary negotiation, career switches. I give honest, India-specific advice.\n\nWhat\'s on your mind?'}]);
  const[input,setInput]=useState('');const[loading,setLoading]=useState(false);const[proto,setProto]=useState(false);const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'});},[msgs]);
  const send=async(text)=>{
    const msg=text||input.trim();if(!msg||loading)return;setInput('');
    setMsgs(prev=>[...prev,{role:'user',content:msg}]);setLoading(true);
    try{
      const history=msgs.map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}));
      const data=await api('/chat',{method:'POST',body:{message:msg,history}});
      setMsgs(prev=>[...prev,{role:'assistant',content:data.reply}]);setProto(!!data.prototypeMode);updateUser({...user,xp:data.xp});
    }catch(err){toast.error('Could not reach AI mentor. Check server is running.');setMsgs(prev=>prev.slice(0,-1));}
    finally{setLoading(false);}
  };
  return<AppShell><div style={{maxWidth:740,display:'flex',flexDirection:'column',height:'calc(100vh - 130px)'}}>
    <div className="fu" style={{marginBottom:16,flexShrink:0}}><div className="eye"><MessageSquare size={11}/>AI Mentor · +5 XP per message</div><h2 style={{fontSize:22,fontWeight:900,letterSpacing:'-.03em',marginBottom:2}}>Your 24/7 career advisor.</h2><p style={{color:'var(--muted)',fontSize:13}}>India-specific, always honest, always available.</p></div>
    {proto&&<div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'rgba(245,200,66,0.1)',borderRadius:10,border:'1px solid rgba(245,200,66,0.25)',fontSize:12,color:'#7A6000',marginBottom:12,flexShrink:0}}><AlertCircle size={13}/>Smart responses active · <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{fontWeight:800,color:'var(--orange)',textDecoration:'underline'}}>Add Gemini key</a> for live AI</div>}
    {msgs.length<=1&&<div className="fu1" style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:16,flexShrink:0}}>{STARTERS.map(s=><button key={s} onClick={()=>send(s)} className="chip" style={{cursor:'pointer',transition:'all .18s',padding:'6px 14px',fontSize:12}} onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--teal)';e.currentTarget.style.color='var(--teal)';e.currentTarget.style.background='rgba(43,158,150,0.08)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='';e.currentTarget.style.color='';e.currentTarget.style.background=''}}>{s}</button>)}</div>}
    <div style={{flex:1,overflowY:'auto',padding:'4px 0',marginBottom:14}}>
      {msgs.map((m,i)=><Bubble key={i} msg={m}/>)}
      {loading&&<div style={{display:'flex',alignItems:'flex-end',gap:9,marginBottom:14}}><div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--orange))',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:12,color:'white',flexShrink:0}}>M</div><div className="bubble ai" style={{display:'flex',alignItems:'center',gap:6,padding:'14px 18px'}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:'50%',background:'var(--teal)',animation:'pulse 1.2s ease-in-out infinite',animationDelay:i*.2+'s'}}/>)}<span style={{fontSize:12,color:'var(--muted)',marginLeft:4}}>Thinking...</span></div></div>}
      <div ref={endRef}/>
    </div>
    <div className="fu" style={{flexShrink:0}}>
      <div style={{display:'flex',gap:10,background:'var(--white)',border:'1.5px solid var(--border)',borderRadius:16,padding:'8px 8px 8px 16px',boxShadow:'0 4px 16px rgba(0,0,0,0.06)',transition:'border-color .2s'}} onFocusCapture={e=>e.currentTarget.style.borderColor='var(--teal)'} onBlurCapture={e=>e.currentTarget.style.borderColor='var(--border)'}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),send())} placeholder="Ask anything about your career..." style={{flex:1,background:'none',border:'none',outline:'none',color:'var(--ink)',fontFamily:'Cabinet Grotesk,system-ui',fontSize:14,fontWeight:500}}/>
        <button onClick={()=>send()} disabled={!input.trim()||loading} style={{width:40,height:40,borderRadius:12,background:input.trim()?'var(--orange)':'var(--cream2)',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',flexShrink:0}}><Send size={16} color={input.trim()?'white':'var(--muted2)'}/></button>
      </div>
      <div style={{fontSize:11,color:'var(--muted2)',marginTop:7,textAlign:'center'}}>Press Enter to send · +5 XP per conversation</div>
    </div>
  </div></AppShell>;
}
