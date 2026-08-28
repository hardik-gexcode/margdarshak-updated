import{useEffect}from'react';import{useSearchParams}from'react-router-dom';
// The real login/signup experience now lives on the landing page as a modal
// (paper-roll video that resolves into the sign-in card). This route just
// forwards old/direct links to it so every entry point stays consistent.
export default function Auth(){
  const[p]=useSearchParams();
  useEffect(()=>{
    const mode=p.get('s')==='1'?'signup':'login';
    window.location.replace('/?auth='+mode);
  },[p]);
  return<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--cream)',color:'var(--muted)',fontSize:14}}>Redirecting…</div>;
}
