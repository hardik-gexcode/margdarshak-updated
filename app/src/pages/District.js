import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import AppShell from '../components/AppShell';
import {ArrowRight,BarChart3,ClipboardCheck,MapPinned,UsersRound} from 'lucide-react';

export default function District(){
  const {api}=useAuth(); const nav=useNavigate(); const [data,setData]=useState(null); const [error,setError]=useState('');
  useEffect(()=>{api('/district/overview').then(setData).catch(e=>setError(e.message));},[api]);
  const stats=data?[['Learners reached',data.totalLearners,UsersRound],['Skill scans completed',data.scansCompleted,ClipboardCheck],['Roadmaps created',data.roadmapsCreated,BarChart3],['Districts represented',data.activeCities,MapPinned]]:[];
  return <AppShell><div className="officer-dashboard">
    <section className="officer-hero"><span className="mini-label">District officer workspace</span><h1>Career progress, at a glance.</h1><p>A privacy-first overview of learner adoption and career interests across your district. Individual learner data is never shown here.</p><button className="apple-primary" onClick={()=>nav('/dashboard')}>Open learner workspace <ArrowRight size={16}/></button></section>
    {error&&<div className="officer-error">Could not load the district overview: {error}</div>}
    {!data&&!error?<div className="officer-loading">Loading district insights…</div>:<><div className="officer-grid">{stats.map(([label,value,Icon])=><article key={label} className="officer-stat"><span><Icon size={18}/></span><strong>{value}</strong><p>{label}</p></article>)}</div><section className="goals-panel"><div><span className="mini-label">Demand signals</span><h2>What learners are working toward</h2></div><div className="goal-list">{data.topGoals.length?data.topGoals.map((item,index)=><div className="goal-row" key={item.goal}><span className="goal-rank">0{index+1}</span><b>{item.goal}</b><em>{item.learners} learner{item.learners===1?'':'s'}</em></div>):<p className="empty-goals">Career goals will appear here once learners complete their profiles.</p>}</div></section></>}
  </div></AppShell>;
}
