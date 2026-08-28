import{useState,useRef,useEffect}from'react';
import{useAuth}from'../context/AuthContext';
import AppShell from'../components/AppShell';
import toast from'react-hot-toast';
import{Camera,Save,User}from'lucide-react';

export default function Profile(){
  const{user,api,updateUser}=useAuth();
  const[f,setF]=useState({name:user?.name||'',background:user?.background||'',goal:user?.goal||'',city:user?.city||''});
  const[saving,setSaving]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[tilt,setTilt]=useState({x:0,y:0});
  const cardRef=useRef(null);
  const fileRef=useRef(null);
  const avaRef=useRef(null);
  const set=(k,v)=>setF(x=>({...x,[k]:v}));

  const level=Math.floor((user?.xp||0)/100)+1;
  const pct=(user?.xp||0)%100;
  const init=(user?.name||'U')[0].toUpperCase();

  const onMove=e=>{
    const r=cardRef.current?.getBoundingClientRect();
    if(!r)return;
    setTilt({x:(e.clientX-r.left)/r.width-.5,y:(e.clientY-r.top)/r.height-.5});
  };
  const onLeave=()=>setTilt({x:0,y:0});

  useEffect(()=>{
    const fn=()=>{
      const el=avaRef.current;
      if(!el)return;
      const r=el.getBoundingClientRect();
      const d=(r.top+r.height/2-window.innerHeight/2)/window.innerHeight;
      el.style.transform='translateY('+(d*-16)+'px) rotateY('+(d*12)+'deg) rotateX('+(d*-6)+'deg)';
    };
    window.addEventListener('scroll',fn,{passive:true});
    return()=>window.removeEventListener('scroll',fn);
  },[]);

  // FIX: properly compress image before upload and handle response URL
  const handleAvatar=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>10*1024*1024){toast.error('Image must be under 10MB.');return;}
    setUploading(true);

    // Use canvas to resize/compress large images
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=async()=>{
      URL.revokeObjectURL(url);
      const MAX=600;
      let{width:w,height:h}=img;
      if(w>MAX||h>MAX){const r=MAX/Math.max(w,h);w=Math.round(w*r);h=Math.round(h*r);}
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      const base64=canvas.toDataURL('image/jpeg',0.85);
      try{
        const data=await api('/avatar',{method:'POST',body:{base64}});
        // FIX: data.url is '/uploads/...' — no extra prefix needed
        updateUser({...user,avatar:data.url,xp:data.xp,badges:data.badges});
        toast.success('Avatar updated! +10 XP 🤳');
      }catch(err){
        toast.error(err.message||'Upload failed. Try a smaller image.');
      }finally{
        setUploading(false);
        // reset input so same file can be re-selected
        if(fileRef.current)fileRef.current.value='';
      }
    };
    img.onerror=()=>{URL.revokeObjectURL(url);setUploading(false);toast.error('Could not read image.');};
    img.src=url;
  };

  const save=async()=>{
    setSaving(true);
    try{
      const updated=await api('/me',{method:'PUT',body:f});
      updateUser(updated);
      toast.success('Profile saved!');
    }catch(err){
      toast.error(err.message);
    }finally{setSaving(false);}
  };

  const ICONS={first_analysis:'🧭',roadmap_created:'🗺️',first_chat:'💬',avatar_set:'🤳',week_streak:'🔥',top10:'⭐',skill_master:'🏆',mentor_10:'🎓'};

  return(
    <AppShell>
      <div style={{maxWidth:860}}>
        <div className="fu" style={{marginBottom:28}}>
          <div className="eye"><User size={11}/>Profile</div>
          <h2 style={{fontSize:24,fontWeight:900,letterSpacing:'-.03em',marginBottom:4}}>Your profile.</h2>
          <p style={{color:'var(--muted)',fontSize:14}}>Update your details and upload a photo — your avatar comes alive in 3D.</p>
        </div>

        <div className="g2" style={{gap:24,alignItems:'start'}}>
          {/* Card col */}
          <div>
            <div ref={cardRef} onMouseMove={onMove} onMouseLeave={onLeave} className="card"
              style={{padding:36,textAlign:'center',transformStyle:'preserve-3d',
                transition:'transform .14s ease,box-shadow .14s ease',
                transform:'perspective(900px) rotateY('+(tilt.x*22)+'deg) rotateX('+(-tilt.y*22)+'deg)',
                boxShadow:tilt.x!==0
                  ?(-tilt.x*22)+'px '+(tilt.y*16)+'px 40px rgba(43,158,150,0.13),0 20px 48px rgba(0,0,0,0.09)'
                  :'0 8px 32px rgba(0,0,0,0.07)',
                cursor:'default'}}>

              <div style={{position:'relative',width:100,height:100,margin:'0 auto 18px'}}>
                <div ref={avaRef} style={{width:100,height:100,borderRadius:'50%',overflow:'hidden',
                  background:'linear-gradient(135deg,var(--teal),var(--orange),#90EE90)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:38,fontWeight:900,color:'white',
                  boxShadow:'0 12px 32px rgba(43,158,150,0.35)',
                  animation:'avaFloat 4s ease-in-out infinite',transition:'transform .35s ease'}}>
                  {user?.avatar
                    ?<img src={user.avatar} alt="avatar"
                        style={{width:'100%',height:'100%',objectFit:'cover'}}
                        onError={e=>{e.target.style.display='none';}}/>
                    :init}
                </div>
                <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                  style={{position:'absolute',bottom:0,right:0,width:32,height:32,
                    borderRadius:'50%',background:'var(--teal)',border:'3px solid var(--white)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 8px rgba(43,158,150,0.4)'}}
                  onMouseEnter={e=>e.currentTarget.style.transform='scale(1.18)'}
                  onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                  {uploading
                    ?<div className="spinner" style={{width:14,height:14,borderTopColor:'white'}}/>
                    :<Camera size={14} color="white"/>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{display:'none'}}/>
              </div>

              <div style={{fontWeight:900,fontSize:20,letterSpacing:'-.02em',marginBottom:4}}>{user?.name}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:22}}>{user?.goal||'No career goal set yet'}</div>

              <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:20}}>
                {[['XP',user?.xp||0,'var(--teal)'],['Level',level,'var(--orange)'],['Badges',user?.badges?.length||0,'var(--purple)']].map(([l,v,c])=>(
                  <div key={l} style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Instrument Serif,Georgia,serif',fontSize:24,fontWeight:700,color:c,fontStyle:'italic'}}>{v}</div>
                    <div style={{fontSize:11,color:'var(--muted2)'}}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="xp-track" style={{height:6,marginBottom:6}}>
                <div className="xp-fill" style={{width:pct+'%'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--muted2)',marginBottom:18}}>{100-pct} XP to Level {level+1}</div>

              {user?.badges?.length>0&&(
                <div style={{display:'flex',gap:6,justifyContent:'center',flexWrap:'wrap',marginBottom:16}}>
                  {user.badges.slice(0,6).map(b=>(
                    <span key={b} title={b.replace(/_/g,' ')} style={{fontSize:20}}>{ICONS[b]||'🏅'}</span>
                  ))}
                </div>
              )}
              <p style={{fontSize:11,color:'var(--muted2)'}}>Hover for 3D · scrolls with depth ↑</p>
            </div>

            <div style={{marginTop:14,padding:16,background:'rgba(43,158,150,0.06)',borderRadius:14,border:'1px solid rgba(43,158,150,0.15)'}}>
              <div style={{fontWeight:800,fontSize:13.5,marginBottom:6,letterSpacing:'-.01em'}}>🤳 Upload Profile Photo</div>
              <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6,marginBottom:10}}>
                Your avatar floats, tilts with your cursor, and scrolls with depth. Earn <strong style={{color:'var(--teal)'}}>+10 XP</strong>.
              </p>
              <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current?.click()} disabled={uploading}>
                {uploading?<><div className="spinner"/>Uploading...</>:<><Camera size={13}/>Upload Photo</>}
              </button>
            </div>
          </div>

          {/* Edit col */}
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card" style={{padding:28,boxShadow:'0 4px 16px rgba(0,0,0,0.06)'}}>
              <div style={{fontWeight:900,fontSize:16,letterSpacing:'-.02em',marginBottom:20}}>Edit Profile</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                <div>
                  <label className="lbl">Full Name</label>
                  <input className="inp" value={f.name} onChange={e=>set('name',e.target.value)} placeholder="Your name"/>
                </div>
                <div>
                  <label className="lbl">Background</label>
                  <textarea className="inp" placeholder="2nd year B.Com student, Jaipur..." value={f.background} onChange={e=>set('background',e.target.value)} style={{minHeight:72}}/>
                </div>
                <div>
                  <label className="lbl">Career Goal</label>
                  <input className="inp" placeholder="Data Analyst at a startup..." value={f.goal} onChange={e=>set('goal',e.target.value)}/>
                </div>
                <div>
                  <label className="lbl">City</label>
                  <input className="inp" placeholder="Jaipur" value={f.city} onChange={e=>set('city',e.target.value)}/>
                </div>
                <button className="btn btn-ink" onClick={save} disabled={saving} style={{width:'fit-content'}}>
                  {saving?<><div className="spinner" style={{borderTopColor:'white'}}/>Saving...</>:<><Save size={15}/>Save Changes</>}
                </button>
              </div>
            </div>

            <div className="card" style={{padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.04)'}}>
              <div style={{fontWeight:800,fontSize:13.5,marginBottom:12}}>Account Info</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  ['Email',user?.email],
                  ['Member since',user?.createdAt?new Date(user.createdAt).toLocaleDateString('en-IN',{month:'long',year:'numeric'}):'Today'],
                  ['Total XP',(user?.xp||0)+' XP']
                ].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <span style={{color:'var(--muted)'}}>{l}</span>
                    <span style={{fontWeight:700,color:l==='Total XP'?'var(--teal)':'var(--ink)'}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{padding:20,background:'rgba(43,158,150,0.03)',border:'1px solid rgba(43,158,150,0.12)',boxShadow:'none'}}>
              <div style={{fontWeight:800,fontSize:13.5,marginBottom:8}}>🔐 Password Security</div>
              <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.6}}>
                Your password is stored as a <strong>salted cryptographic hash</strong> (scrypt) — never in plain text. Even the platform cannot see your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
