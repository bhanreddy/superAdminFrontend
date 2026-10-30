// Local visual fixture. Uses the actual screen and API client with synthetic
// responses. No credentials, production requests, or persistent writes.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexsyrus-connect-preview-'));
const ids = {
  self: '10000000-0000-4000-8000-000000000001',
  other: '10000000-0000-4000-8000-000000000002',
  general: '20000000-0000-4000-8000-000000000001',
  project: '20000000-0000-4000-8000-000000000002',
};
const fixture = `
const ids=${JSON.stringify(ids)};
const sparse=new URLSearchParams(location.search).has('empty');
const channels=[{id:ids.general,name:'general',purpose:'A shared space for company updates and everyday collaboration',description:'Keep everyone in the loop.',visibility:'public',category:'company',joined:true,can_manage:true,archived_at:null,unread_count:2},{id:ids.project,name:'schoolims-development',purpose:'Build, review and ship together',description:'Product delivery',visibility:'public',category:'project',joined:true,can_manage:true,archived_at:null,unread_count:0}];
const people=[{id:ids.self,full_name:'Demo Founder',employee_id:'DEMO-001',role:'FOUNDER'},{id:ids.other,full_name:'Demo Engineer',employee_id:'DEMO-002',role:'QA'}];
let messages=[{id:'30000000-0000-4000-8000-000000000001',sequence:1,body:'Welcome to Connect. This is our place to share updates and keep decisions easy to find.',sender_id:ids.self,sender_name:'Demo Founder',reply_count:1,reactions:[{user_id:ids.other,emoji:'👍'}]},{id:'30000000-0000-4000-8000-000000000002',sequence:2,body:'Payment module testing is ready for review. I will keep the test results in this thread.',sender_id:ids.other,sender_name:'Demo Engineer',reply_count:0,reactions:[]},{id:'30000000-0000-4000-8000-000000000003',sequence:3,body:'Thanks. Let’s keep follow-ups attached to the original message.',sender_id:ids.other,sender_name:'Demo Engineer',reply_count:0,reactions:[],parent_id:'30000000-0000-4000-8000-000000000001'}].map(m=>({conversation_id:ids.general,parent_id:null,mentions:[],attachments:[],created_at:'2026-10-30T08:30:00Z',edited_at:null,deleted_at:null,revision:0,...m}));
if(sparse) messages=[];
const context={organization:{id:'org',name:'NexSyrus'},self:people[0],can_manage:true,channels:sparse?[]:channels,direct_messages:sparse?[{id:ids.general,name:'Arun',employee_id:ids.other,unread_count:0}]:[],unread_notifications:0,preferences:{mode:'mentions',push_enabled:false}};
const response=data=>Promise.resolve({data});
export const superAdminClient={
get(url,options={}){const p=options.params||{};
if(url.endsWith('/bootstrap'))return response(context);
if(url.endsWith('/employees'))return response(people.filter(e=>!p.q||e.full_name.toLowerCase().includes(p.q.toLowerCase())));
if(url.includes('/conversations/')&&url.endsWith('/messages'))return response({messages:messages.filter(m=>m.conversation_id===url.split('/')[5]&&(p.after!==undefined||m.parent_id===(p.parent||null))),has_more:false,last_sequence:3});
if(url.includes('/messages/'))return response(messages.find(m=>m.id===url.split('/').pop()));
if(url.endsWith('/schools'))return response([{id:101,name:'Demo School'}]);
if(url.endsWith('/presence')||url.endsWith('/saved')||url.endsWith('/pins')||url.endsWith('/notifications'))return response([]);
if(url.endsWith('/search'))return response({messages:messages.filter(m=>m.body.toLowerCase().includes((p.q||'').toLowerCase())),channels:[],employees:[]});
if(url.endsWith('/members'))return response(people.map(e=>({user_id:e.id,full_name:e.full_name,employee_id:e.employee_id,role:e.id===ids.self?'manager':'member'})));
return response({});},
post(url,body={}){if(url.includes('/conversations/')&&url.endsWith('/messages')){const m={conversation_id:url.split('/')[5],parent_id:null,mentions:[],attachments:[],edited_at:null,deleted_at:null,revision:0,...body,id:crypto.randomUUID(),sequence:messages.length+1,sender_id:ids.self,sender_name:'Demo Founder',reply_count:0,reactions:[],created_at:new Date().toISOString()};messages.push(m);return response(m);}return response({});},
put:()=>response({}),patch:()=>response({}),delete:()=>response({})};
`;
const mocks = new Map(
  [
    ['src/api/superAdminClient.ts', fixture],
    [
      'src/hooks/useAuth.ts',
      `export const useAuth=()=>({user:{id:'${ids.self}'},role:'FOUNDER',isFounder:true,can:()=>true});`,
    ],
    [
      'src/contexts/ClusterContext.tsx',
      "export const useCluster=()=>({selectedCluster:{cluster_id:'visual-fixture'}});",
    ],
    [
      'src/contexts/ThemeContext.tsx',
      `import {lightTheme,darkTheme} from ${JSON.stringify(path.join(root, 'src/constants/theme.ts'))};const isDark=new URLSearchParams(location.search).has('dark');export const useTheme=()=>({colors:(isDark?darkTheme:lightTheme).colors,isDark});`,
    ],
    [
      'src/services/connect/realtime.ts',
      "export function watchConnect(e,state){state('offline','Local visual fixture · synthetic data');return()=>{};}export const reconcileHistory=async(id,rows)=>rows;",
    ],
    [
      'src/services/connect/files.ts',
      'export const pickConnectFile=async()=>null;export const downloadConnectFile=async()=>{};',
    ],
  ].map(([name, source]) => [path.join(root, name), source]),
);
async function start() {
  await esbuild.build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Screen from ${JSON.stringify(path.join(root, 'src/screens/connect/ConnectScreen.tsx'))};createRoot(document.getElementById('app')).render(<Screen/>);`,
      loader: 'tsx',
      resolveDir: root,
    },
    bundle: true,
    outfile: path.join(tmp, 'bundle.js'),
    platform: 'browser',
    format: 'iife',
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
        name: 'connect-fixture',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path === 'expo-router')
              return { path: 'router', namespace: 'fixture' };
            if (args.path === 'expo-clipboard')
              return { path: 'clipboard', namespace: 'fixture' };
            if (args.path === 'expo-linking')
              return { path: 'linking', namespace: 'fixture' };
            const candidate = path.resolve(args.resolveDir, args.path);
            const key = [candidate, candidate + '.ts', candidate + '.tsx'].find(
              (p) => mocks.has(p),
            );
            if (key) return { path: key, namespace: 'fixture' };
          });
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            contents:
              args.path === 'router'
                ? 'export const useLocalSearchParams=()=>({});export const useRouter=()=>({push:()=>{},setParams:()=>{}});'
                : args.path === 'clipboard'
                  ? 'export const setStringAsync=async()=>{};'
                  : args.path === 'linking'
                    ? 'export const createURL=p=>p;export const openURL=async()=>{};'
                    : mocks.get(args.path),
            loader: 'tsx',
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect — local visual fixture</title><style>html,body{margin:0;height:100%;font-family:system-ui,sans-serif}#app{height:100%;display:flex;flex-direction:column}*{box-sizing:border-box}</style></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>';
  const server = http.createServer((req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.end(fs.readFileSync(path.join(tmp, 'bundle.js')));
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.end(html);
    }
  });
  server.listen(
    Number(process.env.CONNECT_PREVIEW_PORT || 47931),
    '127.0.0.1',
    () =>
      console.log(
        `Connect visual fixture: http://127.0.0.1:${server.address().port}`,
      ),
  );
}
start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
