import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import AppShell from '../components/AppShell';
import {ArrowRight,BrainCircuit,ChevronRight,Compass,MessageCircle,Map,ScanSearch,Sparkles} from 'lucide-react';

const actions=[
  {icon:ScanSearch,label:'AI Skill Scan',desc:'Understand your strengths and gaps',path:'/analyze',tone:'violet'},
  {icon:Map,label:'Roadmap generator',desc:'Get your personal 90-day plan',path:'/roadmap',tone:'blue'},
  {icon:MessageCircle,label:'Ask AI Mentor',desc:'Get a thoughtful answer instantly',path:'/chat',tone:'dark'}
];
const steps=[['01','Tell us where you are','Complete your profile and career goal.'],['02','Find your direction','Run a personal AI skill scan.'],['03','Build proof','Follow a roadmap and ship projects.']];

export default function Dashboard(){
  const {user}=useAuth(); const nav=useNavigate();
  const name=user?.name?.split(' ')[0]||'there'; const hasPlan=Boolean(user?.roadmap); const hasScan=Boolean(user?.skillAnalysis);
  return <AppShell><div className="apple-dashboard">
    <section className="welcome-hero fu">
      <div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
      <div className="welcome-copy"><span className="mini-label"><Sparkles size={13}/>Your private workspace</span><h1>Good to see you, {name}.</h1><p>{user?.goal?`Everything here is tailored to your goal: ${user.goal}.`:'Set your direction, build the right skills, and turn your next career move into a clear plan.'}</p><button className="apple-primary" onClick={()=>nav(hasPlan?'/roadmap':hasScan?'/roadmap':'/analyze')}>{hasPlan?'Open my roadmap':hasScan?'Create my roadmap':'Start my skill scan'}<ArrowRight size={16}/></button></div>
      <div className="hero-status"><div className="status-icon"><Compass size={25}/></div><span>Your career compass</span><strong>{hasPlan?'Plan in motion':hasScan?'Direction found':'Ready when you are'}</strong><div className="status-line"><i style={{width:hasPlan?'100%':hasScan?'66%':'18%'}}/></div><small>{hasPlan?'Your tailored plan is ready.':hasScan?'One step left: build your roadmap.':'Your next chapter starts with one scan.'}</small></div>
    </section>
    <section className="dashboard-section fu1"><div className="section-heading"><div><span className="mini-label">Your tools</span><h2>Make real progress.</h2></div><span className="quiet-stat">{user?.xp||0} XP earned</span></div><div className="action-grid">{actions.map(({icon:Icon,label,desc,path,tone})=><button key={label} className="apple-action" onClick={()=>nav(path)}><span className={'action-icon '+tone}><Icon size={19}/></span><span><b>{label}</b><small>{desc}</small></span><ChevronRight size={17}/></button>)}</div></section>
    <section className="dashboard-section fu2"><div className="section-heading"><div><span className="mini-label">Your path</span><h2>A little momentum goes a long way.</h2></div></div><div className="path-card">{steps.map(([number,title,text],index)=><div className="path-step" key={number}><div className="step-number">{hasPlan||index===0||hasScan&&index===1?'✓':number}</div><div><b>{title}</b><p>{text}</p></div>{index<steps.length-1&&<div className="step-connector"/>}</div>)}</div></section>
    <section className="insight-card fu3"><div className="insight-symbol"><BrainCircuit size={24}/></div><div><span className="mini-label">MARGDARSHAK insight</span><h3>{user?.skillAnalysis?.marketInsight||'The best career plan is the one shaped around you.'}</h3><p>{hasScan?'Your AI skill scan is already informing your roadmap and mentor sessions.':'Start with a skill scan and we’ll use your background, goal, and city to make every recommendation more relevant.'}</p></div><button className="apple-secondary" onClick={()=>nav('/chat')}><MessageCircle size={15}/>Ask Mentor</button></section>
  </div></AppShell>;
}
