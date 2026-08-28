import{useEffect,useRef,useState}from'react';

// Same cinematic HQ video used on the landing page, now as a self-contained
// widget: auto-advances through the 3 HQ chapters, and scrolling/hovering
// over it nudges the video forward — echoing the landing-page scroll effect
// inside the dashboard/market pages after login.

const CHAPTERS=[
  {logo:'/assets/logo-google.png',loc:'Mountain View · Google',role:'Data & AI roles',brief:'Google is actively hiring Data Analysts and ML engineers for teams that ship to a billion users.',tags:['Python','SQL','Cloud'],range:[0.15,2.3]},
  {logo:'/assets/logo-spacex.png',loc:'Hawthorne · SpaceX',role:'Deep-tech engineering',brief:'Aerospace-grade software and systems roles are opening for engineers with strong CS fundamentals.',tags:['C++','Systems','Physics'],range:[3.9,5.7]},
  {logo:'/assets/logo-microsoft.png',loc:'Redmond · Microsoft',role:'Software & cloud roles',brief:'Microsoft keeps growing its Azure and Copilot teams — one of the largest recruiters of Indian grads.',tags:['C#','Azure','React'],range:[7.65,9.85]}
];

export default function HQExplorer(){
  const videoRef=useRef(null);
  const wrapRef=useRef(null);
  const [idx,setIdx]=useState(0);
  const [ready,setReady]=useState(false);
  const localP=useRef(0);
  const holdTimer=useRef(null);

  const goTo=(i,p=0.5)=>{
    setIdx(i);
    localP.current=p;
    const v=videoRef.current;
    if(!v||!ready)return;
    const ch=CHAPTERS[i];
    v.currentTime=ch.range[0]+(ch.range[1]-ch.range[0])*p;
  };

  useEffect(()=>{
    const v=videoRef.current;
    if(!v)return;
    const onMeta=()=>{setReady(true);v.pause();};
    v.addEventListener('loadedmetadata',onMeta);
    return()=>v.removeEventListener('loadedmetadata',onMeta);
  },[]);

  // auto-advance every 4.5s unless the user is actively scrubbing with wheel
  useEffect(()=>{
    const t=setInterval(()=>{goTo((idx+1)%CHAPTERS.length,0.5)},4500);
    return()=>clearInterval(t);
  },[idx,ready]);

  const onWheel=e=>{
    e.preventDefault();
    const dir=e.deltaY>0?1:-1;
    let p=localP.current+dir*0.12;
    let i=idx;
    if(p>1){p=0;i=(idx+1)%CHAPTERS.length;}
    if(p<0){p=1;i=(idx-1+CHAPTERS.length)%CHAPTERS.length;}
    goTo(i,p);
    clearTimeout(holdTimer.current);
  };

  const ch=CHAPTERS[idx];

  return(
    <div ref={wrapRef} onWheel={onWheel} style={{position:'relative',borderRadius:20,overflow:'hidden',height:340,boxShadow:'0 8px 30px rgba(0,0,0,0.12)',background:'#0D0D0B'}}>
      <video ref={videoRef} muted playsInline preload="auto" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}}>
        <source src="/videos/hq-map-scrub.mp4" type="video/mp4"/>
      </video>
      <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(4,6,4,.55) 0%,rgba(4,6,4,.05) 35%,rgba(4,6,4,.65) 100%)'}}/>
      <div style={{position:'absolute',top:18,left:20,zIndex:2,color:'#fff'}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'.1em',textTransform:'uppercase',opacity:.7,marginBottom:2}}>Companies hiring right now</div>
        <div style={{fontSize:17,fontWeight:900,letterSpacing:'-.02em'}}>Your skills. Their offices.</div>
      </div>
      <div style={{position:'absolute',bottom:18,left:20,right:20,zIndex:2,display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
        <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',maxWidth:280,boxShadow:'0 14px 40px rgba(0,0,0,.35)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
            <div style={{width:32,height:32,borderRadius:8,background:'var(--cream,#F4F3EF)',display:'flex',alignItems:'center',justifyContent:'center',padding:5,flexShrink:0}}><img src={ch.logo} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}}/></div>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--muted,#8A8880)'}}>{ch.loc}</div>
          </div>
          <p style={{fontSize:12.5,lineHeight:1.5,fontWeight:600,marginBottom:8}}>{ch.brief}</p>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {ch.tags.map(t=><span key={t} style={{fontSize:10,fontWeight:700,padding:'3px 9px',borderRadius:100,background:'var(--cream,#F4F3EF)',border:'1px solid var(--border,#E8E6E1)'}}>{t}</span>)}
          </div>
        </div>
        <div style={{display:'flex',gap:6,paddingBottom:4}}>
          {CHAPTERS.map((c,i)=>(
            <button key={c.loc} onClick={()=>goTo(i,0.5)} aria-label={'Show '+c.loc}
              style={{width:i===idx?20:7,height:7,borderRadius:5,border:'none',cursor:'pointer',background:i===idx?'#fff':'rgba(255,255,255,.35)',transition:'all .2s'}}/>
          ))}
        </div>
      </div>
    </div>
  );
}
