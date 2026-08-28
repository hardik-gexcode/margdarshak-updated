import{BrowserRouter,Routes,Route,Navigate}from'react-router-dom';
import{Toaster}from'react-hot-toast';
import{AuthProvider,useAuth}from'./context/AuthContext';
import Auth from'./pages/Auth';
import Dashboard from'./pages/Dashboard';
import Analyze from'./pages/Analyze';
import Roadmap from'./pages/Roadmap';
import Market from'./pages/Market';
import Chat from'./pages/Chat';
import Badges from'./pages/Badges';
import Profile from'./pages/Profile';
const TS={background:'#fff',color:'#141210',border:'1px solid #D8D0C4',fontFamily:'Cabinet Grotesk,system-ui,sans-serif',fontSize:'14px',fontWeight:'700',borderRadius:'12px',boxShadow:'0 4px 20px rgba(0,0,0,0.08)'};
function Guard({children}){const{user,ready}=useAuth();if(!ready)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#F5F0E8'}}><div className="spinner" style={{width:32,height:32}}/></div>;return user?children:<Navigate to="/auth" replace/>;}
function AppRoutes(){const{user}=useAuth();return<Routes><Route path="/" element={<Navigate to={user?'/dashboard':'/auth'} replace/>}/><Route path="/auth" element={user?<Navigate to="/dashboard"/>:<Auth/>}/><Route path="/dashboard" element={<Guard><Dashboard/></Guard>}/><Route path="/analyze" element={<Guard><Analyze/></Guard>}/><Route path="/roadmap" element={<Guard><Roadmap/></Guard>}/><Route path="/market" element={<Guard><Market/></Guard>}/><Route path="/chat" element={<Guard><Chat/></Guard>}/><Route path="/badges" element={<Guard><Badges/></Guard>}/><Route path="/profile" element={<Guard><Profile/></Guard>}/></Routes>;}
export default function App(){return<BrowserRouter><AuthProvider><AppRoutes/><Toaster position="top-right" toastOptions={{style:TS,success:{iconTheme:{primary:'#2B9E96',secondary:'#fff'}},error:{iconTheme:{primary:'#E8601A',secondary:'#fff'}}}}/></AuthProvider></BrowserRouter>;}
