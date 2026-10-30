// Local visual QA using production components and synthetic records only.
// No authentication, network data, or production writes. Not part of the app bundle.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), 'nexsyrus-workspace-preview-'),
);
const router = `import React from 'react';import {Text} from 'react-native';
const changed=()=>window.dispatchEvent(new Event('workspace-location'));
const navigate=p=>{history.pushState({},'',p.replace('/(app)','')||'/');changed();};
const subscribe=fn=>{window.addEventListener('workspace-location',fn);window.addEventListener('popstate',fn);return()=>{window.removeEventListener('workspace-location',fn);window.removeEventListener('popstate',fn);};};
export const usePathname=()=>React.useSyncExternalStore(subscribe,()=>location.pathname);
export const useSegments=()=>usePathname().split('/').filter(Boolean);
export const useRouter=()=>({push:navigate,replace:navigate,back:()=>history.back()});
export const Link=({href,children,style,asChild})=>asChild?<div onClick={()=>navigate(href)}>{children}</div>:<Text accessibilityRole="link" style={style} onPress={()=>navigate(href)}>{children}</Text>;
`;
const mocks = new Map([
  [
    path.join(root, 'src/hooks/useAuth.ts'),
    `const role=new URLSearchParams(location.search).get('role')||'FOUNDER';export const useAuth=()=>({role,roleLabel:role.replaceAll('_',' '),employeeId:'DEMO-001',isFounder:role==='FOUNDER',isSuperAdmin:role==='FOUNDER',isSales:role.startsWith('SALES'),isImplementation:role.startsWith('IMPLEMENTATION'),isSupport:role.startsWith('SUPPORT'),can:()=>role==='FOUNDER',currentAdmin:{full_name:'Demo User'},signOut:async()=>{}});`,
  ],
  [
    path.join(root, 'src/contexts/ClusterContext.tsx'),
    `export const useCluster=()=>({selectedCluster:{cluster_id:'local-fixture',label:'Primary Cluster'}});`,
  ],
  [
    path.join(root, 'src/components/auth/FingerprintSecurity.tsx'),
    `export const FingerprintSecurityControl=()=>null;`,
  ],
]);
mocks.set(
  path.join(root, 'src/hooks/useFounderAuth.ts'),
  `export const useFounderAuth=()=>({founder:{full_name:'Demo Founder',role:'FOUNDER'},isApprover:false,canApproveReject:true});`,
);
mocks.set(
  path.join(root, 'src/contexts/AuthContext.tsx'),
  `export const useAuth=()=>({refreshSessionProfile:async()=>{}});`,
);
mocks.set(
  path.join(root, 'src/services/authService.ts'),
  `export const authService={signIn:async()=>({error:{message:'Local visual fixture only.'}})};`,
);
mocks.set(
  path.join(root, 'src/services/founderSupabase.ts'),
  `export const formatInr=(n,d=0)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:d}).format(Number(n)||0);export const fetchPendingMetricsSummary=async()=>({});export const fetchMonthlyIncomeSummary=async()=>[];export const fetchMonthlyExpenseSummaryV2=async()=>[];export const fetchMonthlyEnquirySummary=async()=>[];export const fetchMonthlyClosedDeals=async()=>[];export const fetchMonthlyExpenseSummaryRoi=async()=>[];export const fetchConversionRateSeries=async()=>[];export const fetchCostPerLeadSeries=async()=>[];export const countEnquiriesCreatedToday=async()=>3;export const countUnassignedEnquiries=async()=>2;export const listBusinessUnits=async()=>[{id:'demo',name:'Demo business'}];export const getFinancialSummary=async()=>({revenue:1248000,client_billing_collected:984000,expenses:426000,net_profit:822000,profit_margin:65.8,business_unit_id:'ALL'});`,
);
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import {View,Text,Pressable,useWindowDimensions} from 'react-native';import {School,TrendingUp,Users,Wallet,Plus,ArrowRight} from 'lucide-react-native';
import {ThemeProvider,useTheme} from './src/contexts/ThemeContext';import FounderScreen from './src/screens/founder/FounderDashboardScreen';import LoginScreen from './src/screens/auth/LoginScreen';
import {DashboardLayout} from './src/components/layout/DashboardLayout';
import {ScreenHeader} from './src/components/ui/ScreenHeader';import {StatCard} from './src/components/ui/StatCard';import {Input} from './src/components/ui/Input';import {Button} from './src/components/ui/Button';import {Card} from './src/components/ui/Card';import {Badge} from './src/components/ui/Badge';import {DataTable} from './src/components/ui/DataTable';import {usePathname} from 'expo-router';
const records=[{id:'demo-1',name:'Greenwood Academy',city:'Hyderabad',status:'Active',students:1240},{id:'demo-2',name:'Oakridge Public School',city:'Bengaluru',status:'Onboarding',students:860},{id:'demo-3',name:'Hillside International',city:'Pune',status:'Active',students:1130},{id:'demo-4',name:'Maple Grove School',city:'Chennai',status:'Review needed',students:720}];
function Content(){const {colors,workspaceModule}=useTheme();const pathname=usePathname();const {width}=useWindowDimensions();const phone=width<600;const [name,setName]=React.useState('Greenwood Academy');const [notes,setNotes]=React.useState('Coordinate the next onboarding milestone with the school team.');const [saved,setSaved]=React.useState(false);const finance=workspaceModule==='finance';const team=workspaceModule==='team';const title=finance?'Books & accounting':team?'Your people':pathname==='/'?'Your business, at a glance':'Schools';const metric=[{title:finance?'Revenue this month':'Total schools',value:finance?'₹12,48,000':'128',icon:School,color:colors.primary},{title:finance?'Collected':'Active schools',value:finance?'₹9,84,000':'106',icon:TrendingUp,color:colors.success},{title:finance?'Pending review':'Onboarding',value:finance?'12':'18',icon:Users,color:colors.accent},{title:finance?'Outstanding':'Needs attention',value:finance?'₹2,64,000':'4',icon:Wallet,color:colors.warning}];return <View style={{gap:24,paddingBottom:24}}><ScreenHeader title={title} subtitle={finance?'A clear view of your finances and the work that needs your attention.':'Everything you need to move your schools and teams forward.'} rightAction={<Button title={finance?'Create invoice':'Add school'} leftIcon={<Plus size={16} color="#FFFFFF"/>} onPress={()=>document.getElementById('preview-form')?.scrollIntoView({behavior:'smooth'})}/>}/><View style={{flexDirection:'row',flexWrap:'wrap',gap:16}}>{metric.map(m=><View key={m.title} style={{flexBasis:phone?'46%':'22%',flexGrow:1,minWidth:0}}><StatCard title={m.title} value={m.value} icon={<m.icon size={20} color={m.color}/>} accentColor={m.color}/></View>)}</View><View style={{padding:phone?20:28,backgroundColor:colors.primaryMuted,borderRadius:16,flexDirection:'row',alignItems:'center',gap:16,flexWrap:'wrap'}}><View style={{flex:1,minWidth:180}}><Text style={{color:colors.primary,fontSize:12,fontWeight:'600',marginBottom:8}}>WORKSPACE PULSE</Text><Text style={{color:colors.textPrimary,fontSize:22,fontWeight:'700'}}>A little clarity. A lot of progress.</Text><Text style={{color:colors.textSecondary,fontSize:14,lineHeight:22,marginTop:8}}>Keep your team aligned, review priorities, and make the next step count.</Text></View><Button variant="outline" title="Review priorities" onPress={()=>document.getElementById('preview-form')?.scrollIntoView()}/></View><View><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:16}}><Text style={{color:colors.textPrimary,fontSize:18,fontWeight:'600'}}>School portfolio</Text><Badge label="4 schools" variant="info"/></View><DataTable data={records} keyExtractor={r=>r.id} searchPlaceholder="Search schools or city" searchKeys={['name','city']} columns={[{key:'name',title:'School',flex:2,sortable:true},{key:'city',title:'City',flex:1,sortable:true},{key:'status',title:'Status',flex:1,render:r=><Badge label={r.status} variant={r.status==='Active'?'success':r.status==='Onboarding'?'primary':'warning'} dot/>},{key:'students',title:'Students',flex:.7,sortable:true}]} /></View><View nativeID="preview-form"><Card><Text style={{color:colors.textPrimary,fontSize:18,fontWeight:'600',marginBottom:6}}>School details</Text><Text style={{color:colors.textSecondary,fontSize:14,lineHeight:21,marginBottom:22}}>Keep details accurate so your team can pick up where you left off.</Text><Input label="School name" required value={name} onChangeText={setName}/><Input label="Team notes" multiline value={notes} onChangeText={setNotes}/><View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12}}><Button title="Save details" onPress={()=>setSaved(true)}/>{saved&&<Text style={{color:colors.success}}>Saved in this local preview.</Text>}</View></Card></View></View>;}
if(new URLSearchParams(location.search).has('dark'))localStorage.setItem('superadmin-theme','dark');else localStorage.setItem('superadmin-theme','light');
createRoot(document.getElementById('app')).render(<ThemeProvider>{new URLSearchParams(location.search).get('screen')==='login'?<LoginScreen/>:<DashboardLayout>{new URLSearchParams(location.search).get('screen')==='founder'?<FounderScreen/>:<Content/>}</DashboardLayout>}</ThemeProvider>);`;
async function start() {
  await esbuild.build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: root },
    bundle: true,
    outfile: path.join(tmp, 'bundle.js'),
    platform: 'browser',
    format: 'iife',
    loader: { '.png': 'dataurl', '.js': 'jsx' },
    resolveExtensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
    alias: { 'react-native': 'react-native-web' },
    define: {
      'process.env.NODE_ENV': '"development"',
      'process.env.EXPO_OS': '"web"',
    },
    plugins: [
      {
        name: 'workspace-fixture',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path === 'react-native-reanimated')
              return { path: 'motion', namespace: 'fixture' };
            if (args.path === '@react-navigation/native')
              return { path: 'navigation', namespace: 'fixture' };
            if (args.path === 'expo-router')
              return { path: 'router', namespace: 'fixture' };
            if (args.path === 'expo-status-bar')
              return { path: 'status', namespace: 'fixture' };
            const candidate = path.resolve(args.resolveDir, args.path);
            const key = [candidate, candidate + '.ts', candidate + '.tsx'].find(
              (p) => mocks.has(p),
            );
            if (key) return { path: key, namespace: 'fixture' };
          });
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            contents:
              args.path === 'motion'
                ? "import React from 'react';import {View,Text} from 'react-native';const chain={duration:()=>chain,delay:()=>chain,springify:()=>chain};export const FadeInDown=chain,FadeInUp=chain,FadeInRight=chain,FadeIn=chain;export const useSharedValue=v=>({value:v});export const useAnimatedStyle=f=>f();export const withTiming=v=>v,withSpring=v=>v;export default {View,Text};"
                : args.path === 'navigation'
                  ? "import React from 'react';export const useFocusEffect=fn=>React.useEffect(fn,[fn]);"
                  : args.path === 'router'
                    ? router
                    : args.path === 'status'
                      ? 'export const StatusBar=()=>null;'
                      : mocks.get(args.path),
            loader: 'tsx',
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NexSyrus · local workspace preview</title><style>html,body{margin:0;height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}#app{height:100%;display:flex;flex-direction:column}*{box-sizing:border-box}</style></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>';
  http
    .createServer((req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Type',
        req.url === '/bundle.js' ? 'application/javascript' : 'text/html',
      );
      res.end(
        req.url === '/bundle.js'
          ? fs.readFileSync(path.join(tmp, 'bundle.js'))
          : html,
      );
    })
    .listen(
      Number(process.env.WORKSPACE_PREVIEW_PORT || 47932),
      '127.0.0.1',
      () => console.log('Local workspace preview: http://127.0.0.1:47932'),
    );
}
start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
