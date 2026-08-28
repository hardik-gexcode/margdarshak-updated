import{useNavigate,useLocation}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{LayoutDashboard,Zap,Map,TrendingUp,MessageSquare,Award,LogOut,User}from'lucide-react';
const NAV=[{path:'/dashboard',icon:LayoutDashboard,label:'Dashboard',color:'#2B9E96'},{path:'/analyze',icon:Zap,label:'AI Skill Scan',color:'#E8601A'},{path:'/roadmap',icon:Map,label:'90-Day Plan',color:'#7B6CF6'},{path:'/market',icon:TrendingUp,label:'Market Intel',color:'#E8601A'},{path:'/chat',icon:MessageSquare,label:'AI Mentor',color:'#F5C842'},{path:'/badges',icon:Award,label:'Badges & XP',color:'#4A9E3A'}];
export function Logo({size=28}){return<svg width={size} height={size} viewBox="0 0 100 100" fill="none"><path d="M15 45 Q22 72 50 80 Q28 70 20 50 Z" fill="#2B9E96"/><path d="M85 45 Q78 72 50 80 Q72 70 80 50 Z" fill="#E8601A"/><path d="M50 12 L50 78 M37 32 L50 19 L63 32 M37 50 L50 37 L63 50" stroke="#4A9E3A" strokeWidth="5.5" strokeLinecap="round"/></svg>;}
export default function AppShell({children}){
  const{user,logout}=useAuth();const navigate=useNavigate();const{pathname}=useLocation();
  const xp=user?.xp||0;const level=Math.floor(xp/100)+1;const pct=xp%100;const init=(user?.name||'U')[0].toUpperCase();
  return<div style={{minHeight:'100vh',background:'var(--cream)'}}>
    <nav className="nav">
      <div className="nav-logo" onClick={()=>navigate('/dashboard')}><Logo/>MARG<span>DARSHAK</span></div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span className="chip chip-t" style={{cursor:'default',fontWeight:800}}>⚡ {xp} XP</span>
        {user?.avatar?<div onClick={()=>navigate('/profile')} style={{width:34,height:34,borderRadius:'50%',overflow:'hidden',cursor:'pointer',border:'2px solid var(--teal)',flexShrink:0}}><img src={user.avatar} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>:<div className="ava ava-sm" onClick={()=>navigate('/profile')} style={{cursor:'pointer',width:34,height:34,fontSize:13}}>{init}</div>}
      </div>
    </nav>
    <div className="app-shell">
      <aside className="sidebar">
        <div className="ss">Main</div>
        {NAV.map(n=><button key={n.path} className={'si '+(pathname===n.path?'active':'')} onClick={()=>navigate(n.path)}><div className="si-icon" style={{background:pathname===n.path?n.color+'12':'transparent'}}><n.icon size={16} color={pathname===n.path?n.color:'var(--muted)'}/></div>{n.label}</button>)}
        <div className="ss">Account</div>
        <button className={'si '+(pathname==='/profile'?'active':'')} onClick={()=>navigate('/profile')}><div className="si-icon"><User size={16} color={pathname==='/profile'?'var(--teal)':'var(--muted)'}/></div>Profile</button>
        <button className="si" onClick={logout} style={{color:'var(--muted2)'}}><div className="si-icon"><LogOut size={16} color="var(--muted2)"/></div>Sign Out</button>
        <div style={{marginTop:'auto',padding:14,background:'var(--cream2)',borderRadius:14,border:'1px solid var(--border)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:7,fontSize:12}}><span style={{color:'var(--muted)',fontWeight:700}}>Level {level}</span><span style={{color:'var(--teal)',fontWeight:900}}>{xp} XP</span></div>
          <div className="xp-track"><div className="xp-fill" style={{width:pct+'%'}}/></div>
          <div style={{fontSize:11,color:'var(--muted2)',marginTop:5}}>{100-pct} XP to Level {level+1}</div>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  </div>;
}
