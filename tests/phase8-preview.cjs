// Render actual route components against explicit, disposable HTTP fixtures.
// This is visual/interaction QA, not live API or native-device acceptance.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'nexsyrus-phase8-preview-'));
const routes = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filename = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(filename);
    else if (entry.name.endsWith('.tsx') && !entry.name.startsWith('_') && !entry.name.startsWith('+') && filename !== path.join(root, 'app/index.tsx')) {
      const source = path.relative(root, filename).split(path.sep).join('/');
      const route = '/' + source.replace(/^app\//, '').replace(/\([^/]+\)\//g, '').replace(/(?:\/)?index\.tsx$/, '').replace(/\.tsx$/, '');
      const url = route.replace(/\[id\]/g, '101');
      routes.push({ source, route, url, index: routes.length });
    }
  }
}
walk(path.join(root, 'app'));
const router = `import React from 'react';import {Text} from 'react-native';
const changed=()=>window.dispatchEvent(new Event('qa-location'));
const normalize=p=>{if(typeof p==='object'){const q=new URLSearchParams(p.params||{});const route=p.pathname.replace(/\\[([^\\]]+)\\]/g,(_,key)=>{const value=q.get(key);q.delete(key);return encodeURIComponent(value||'');});return route.replace('/(app)','').replace('/(auth)','')+'?'+q;}return p.replace('/(app)','').replace('/(auth)','')||'/';};
const navigate=(p,replace=false)=>{const u=new URL(normalize(p),location.origin);for(const key of ['dark','role','state'])if(!u.searchParams.has(key)&&new URLSearchParams(location.search).has(key))u.searchParams.set(key,new URLSearchParams(location.search).get(key));history[replace?'replaceState':'pushState']({},'',u);changed();};
const subscribe=fn=>{window.addEventListener('qa-location',fn);window.addEventListener('popstate',fn);return()=>{window.removeEventListener('qa-location',fn);window.removeEventListener('popstate',fn);};};
export const usePathname=()=>React.useSyncExternalStore(subscribe,()=>location.pathname);
export const useFocusEffect=fn=>React.useEffect(fn,[fn]);
export const useSegments=()=>usePathname().split('/').filter(Boolean);
export const useLocalSearchParams=()=>{usePathname();return {id:'101',...Object.fromEntries(new URLSearchParams(location.search))};};
export const useGlobalSearchParams=useLocalSearchParams;
const currentRouter={push:navigate,navigate,replace:p=>navigate(p,true),back:()=>history.back(),canGoBack:()=>history.length>1,setParams:p=>navigate({pathname:location.pathname,params:{...Object.fromEntries(new URLSearchParams(location.search)),...p}},true)};export const useRouter=()=>currentRouter;
export const Link=({href,children,style,asChild})=>asChild?<div onClick={()=>navigate(href)}>{children}</div>:<Text accessibilityRole="link" style={style} onPress={()=>navigate(href)}>{children}</Text>;
export const Redirect=({href})=>{React.useEffect(()=>navigate(href,true),[]);return null;};
export const Stack=Object.assign(({children})=>children,{Screen:()=>null});export const router={push:navigate,replace:p=>navigate(p,true)};`;
const { getRolePermissions, ROLES } = require('../../SuperAdminBackend/src/config/rbac');
const rolePermissions = Object.fromEntries(Object.values(ROLES).map(role => [role, getRolePermissions(role)]));
const permissionSource = `const rolePermissions=${JSON.stringify(rolePermissions)};const getRolePermissions=role=>rolePermissions[role]||[];`;
const client = fs.readFileSync(path.join(__dirname, 'fixtures/phase8-client.js'), 'utf8').replace("import { getRolePermissions } from './src/constants/rbac';", permissionSource);
const auth = `${permissionSource}
const role=new URLSearchParams(location.search).get('role')||'FOUNDER';
const permissions=getRolePermissions(role);const isFounder=role==='FOUNDER'||role==='SUPER_ADMIN';
const user={id:'10000000-0000-4000-8000-000000000001',full_name:'QA Demo User',fullName:'QA Demo User',email:'qa@example.invalid',role,employee_id:'QA-001',status:'ACTIVE'};
const value={user,session:{access_token:'local-fixture-only'},currentAdmin:user,founder:isFounder?{...user,role:'FOUNDER'}:null,role,permissions,isFounder,isSuperAdmin:isFounder,roleLabel:role.replaceAll('_',' '),employeeId:'QA-001',assignedSchools:[101],status:'ACTIVE',loading:false,mustChangePassword:false,isSales:role.startsWith('SALES'),isImplementation:role.startsWith('IMPLEMENTATION'),isSupport:role.startsWith('SUPPORT'),can:p=>isFounder||permissions.includes(p),refreshSessionProfile:async()=>{},signOut:async()=>{},signIn:async()=>{}};
export const useAuth=()=>value;export const AuthProvider=({children})=>children;`;
const mocks = new Map([
  ['src/api/superAdminClient.ts', client],
  ['src/api/crmClient.ts', `export {superAdminClient as crmClient} from './src/api/superAdminClient';export const getCrmBaseUrl=()=>location.origin;`],
  ['src/api/tokens.ts', `export const getStoredAccessToken=async()=>null,getStoredRefreshToken=async()=>null,storeTokens=async()=>{},clearTokens=async()=>{},setTokenClusterPrefix=()=>{};export const TokenStore={};`],
  ['src/hooks/useAuth.ts', auth],
  ['src/contexts/AuthContext.tsx', auth],
  ['src/contexts/ClusterContext.tsx', `const c={cluster_id:'101',label:'QA local cluster',status:'active',school_count:1,max_schools:40,school_db:{backend_url:location.origin},medical_db:{backend_url:location.origin}};export const useCluster=()=>({selectedCluster:c,clusters:[c],setSelectedCluster:async()=>{},refreshClusters:async()=>{},isClusterReady:true});`],
  ['src/services/authService.ts', `export const authService={signIn:async()=>({error:{message:'QA fixture: sign-in is intentionally unavailable.'}}),signInCA:async()=>({error:{message:'QA fixture: sign-in is intentionally unavailable.'}}),changePassword:async()=>{throw Error('QA fixture: no credential changes.')}};`],
  ['src/contexts/FingerprintContext.tsx', `export const useFingerprint=()=>({supported:false,ready:true,enabled:false,locked:false,covered:false});`],
  ['src/services/connect/realtime.ts', `export function watchConnect(e,state){state('offline','Local QA fixture');return()=>{};}export const reconcileHistory=async(id,rows)=>rows;`],
  ['src/services/connect/files.ts', `export const pickConnectFile=async()=>null;export const downloadConnectFile=async()=>{};`],
  ['src/services/clusterConfigService.ts', `import {useCluster} from './src/contexts/ClusterContext';export const loadClusters=async()=>useCluster().clusters,getAllClusters=loadClusters,fetchRemoteClusters=loadClusters,invalidateClusterCache=async()=>{},createCluster=async()=>{throw Error('QA fixture is read only')},updateCluster=createCluster,updateClusterStatus=createCluster,validateClusterUrls=async()=>({school:true,medical:true});`],
].map(([name, source]) => [path.join(root, name), source]));
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {View,Text} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppRouteGuard} from './src/components/auth/AppRouteGuard';import {ThemeProvider} from './src/contexts/ThemeContext';import {DashboardLayout} from './src/components/layout/DashboardLayout';import {ToastProvider} from './src/components/ui/Toast';import {usePathname} from 'expo-router';
${routes.map(r => `import Screen${r.index} from ${JSON.stringify('./' + r.source)};`).join('\n')}
const routes=${JSON.stringify(routes.map(({ index, ...r }) => r))};const screens=[${routes.map(r => `Screen${r.index}`).join(',')}];
class Boundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return {error};}render(){return this.state.error?<View style={{padding:24}}><Text accessibilityRole="alert" style={{color:'#BF3547',fontSize:18}}>QA render failed: {String(this.state.error.message)}</Text></View>:this.props.children;}}
function App(){const pathname=usePathname();React.useLayoutEffect(()=>{document.getElementById('app').setAttribute('data-qa-path',pathname);},[pathname]);const i=routes.findIndex(r=>r.url===pathname);const Screen=screens[i];const content=Screen?<Boundary key={pathname}><Screen/></Boundary>:<Text>Route not found in QA inventory: {pathname}</Text>;return <SafeAreaProvider><ThemeProvider><ToastProvider>{pathname==='/login'||pathname==='/ca-login'||pathname==='/cluster-selector'?content:<DashboardLayout><AppRouteGuard>{content}</AppRouteGuard></DashboardLayout>}</ToastProvider></ThemeProvider></SafeAreaProvider>;}
localStorage.setItem('superadmin-theme',new URLSearchParams(location.search).has('dark')?'dark':'light');
createRoot(document.getElementById('app')).render(<App/>);`;
async function start() {
  await esbuild.build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: root }, bundle: true,
    outfile: path.join(output, 'bundle.js'), platform: 'browser', format: 'iife', jsx: 'automatic',
    loader: { '.png': 'dataurl', '.js': 'jsx' },
    resolveExtensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: { 'react-native': 'react-native-web' },
    define: { 'process.env.NODE_ENV': '"development"', 'process.env.EXPO_OS': '"web"', 'process.env': '{}', '__DEV__': 'true', global: 'globalThis' },
    plugins: [{ name: 'qa-fixtures', setup(build) {
      build.onLoad({ filter: /\.tsx?$/, namespace: 'file' }, async args => {
        if (!args.path.startsWith(path.join(root, 'src')) && !args.path.startsWith(path.join(root, 'app'))) return;
        const result = await require('@babel/core').transformAsync(fs.readFileSync(args.path, 'utf8'), { filename: args.path, configFile: false, babelrc: false, parserOpts: { plugins: ['typescript', 'jsx'] }, plugins: [require.resolve('react-native-reanimated/plugin')] });
        return { contents: result.code, loader: 'tsx', resolveDir: path.dirname(args.path) };
      });
      build.onResolve({ filter: /.*/ }, args => {
        if (args.path === 'crypto') return { path: 'crypto', namespace: 'fixture' };
        if (args.path === 'expo-router') return { path: 'router', namespace: 'fixture' };
        if (args.path === '@react-navigation/native') return { path: 'navigation', namespace: 'fixture' };
        if (args.path === 'expo-status-bar') return { path: 'status', namespace: 'fixture' };
        const candidate = path.resolve(args.resolveDir, args.path);
        const key = [candidate, candidate + '.ts', candidate + '.tsx'].find(p => mocks.has(p));
        if (key) return { path: key, namespace: 'fixture' };
      });
      build.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({
        contents: args.path === 'crypto' ? 'export const randomUUID=()=>globalThis.crypto.randomUUID();export const randomFillSync=a=>globalThis.crypto.getRandomValues(a);' : args.path === 'router' ? router : args.path === 'navigation'
          ? `import React from 'react';export const useFocusEffect=fn=>React.useEffect(fn,[fn]);`
          : args.path === 'status' ? 'export const StatusBar=()=>null;' : mocks.get(args.path),
        loader: 'tsx', resolveDir: root,
      }));
    } }],
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexSyrus Phase 8 — local synthetic fixture</title><style>html,body{margin:0;height:100%;font-family:system-ui,sans-serif}#app{height:calc(100% - 22px);display:flex;flex-direction:column}*{box-sizing:border-box}#qa-label{height:22px;background:#17243A;color:#F1F5FC;font:11px/22px system-ui;padding:0 10px;overflow:hidden}</style></head><body><div id="qa-label">LOCAL QA · synthetic data · web rendering · no production requests</div><div id="qa-alert" role="alert" style="color:#BF3547;background:#FCEEF0;font:12px system-ui"></div><div id="app"></div><script>window.alert=message=>{document.getElementById('qa-alert').textContent=String(message)};</script><script src="/bundle.js"></script></body></html>`;
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    // Any unmocked API request is blocked even if a screen uses native fetch.
    res.setHeader('Content-Security-Policy', "connect-src 'none'; img-src 'self' data: blob:; object-src 'none'");
    const isBundle = req.url === '/bundle.js';
    res.setHeader('Content-Type', isBundle ? 'application/javascript' : req.url === '/routes.json' ? 'application/json' : 'text/html');
    res.end(isBundle ? fs.readFileSync(path.join(output, 'bundle.js')) : req.url === '/routes.json' ? JSON.stringify(routes, null, 2) : html);
  });
  server.listen(Number(process.env.PHASE8_PREVIEW_PORT || 47938), '127.0.0.1', () => console.log(`Phase 8 QA (${routes.length} routes): http://127.0.0.1:${server.address().port}`));
}
start().catch(error => { console.error(error); process.exitCode = 1; });
