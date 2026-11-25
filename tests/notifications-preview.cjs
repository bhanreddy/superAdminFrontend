// Synthetic local UI fixture; never contacts a real service.
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  esbuild = require("esbuild");
const root = path.resolve(__dirname, ".."),
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "notifications-qa-"));
const channels =
  require("../../SuperAdminBackend/src/services/notifications/catalog").CHANNELS;
const api = `const channels=${JSON.stringify(channels)}.map(c=>({...c,total:0,unread:0,inbox_enabled:true,email_enabled:false,push_enabled:false,sms_enabled:false}));
const params=new URLSearchParams(location.search);let rows=params.has('empty')?[]:[
{id:'demo-1',event_id:'1',channel:'support',kind:'complaints.update',priority:'high',title:'Support ticket escalated: payment reconciliation',body:'',action_path:'/complaints',read_at:null,created_at:'2026-11-02T15:45:00Z'},
{id:'demo-2',event_id:'2',channel:'assignments',kind:'checklist.update',priority:'normal',title:'Onboarding task updated: complete school launch review',body:'',action_path:'/checklist',read_at:null,created_at:'2026-11-02T14:00:00Z'},
{id:'demo-3',event_id:'3',channel:'announcements',kind:'announcement',priority:'normal',title:'November operations briefing',body:'Review your assigned schools before Friday. Keep blockers updated so your manager can help resolve them.',action_path:null,read_at:null,created_at:'2026-11-02T13:30:00Z'},
{id:'demo-4',event_id:'4',channel:'security',kind:'account',priority:'normal',title:'Account access updated',body:'',action_path:null,read_at:'2026-11-02T12:00:00Z',created_at:'2026-11-02T11:30:00Z'}];
function ready(){if(params.has('error'))throw Error('offline');}export const notificationError=()=> 'Unable to reach notifications. Check your connection and retry.';
export const notificationApi={async bootstrap(){ready();return {channels:channels.map(c=>({...c,total:rows.filter(n=>n.channel===c.id).length,unread:rows.filter(n=>n.channel===c.id&&!n.read_at).length})),unread:rows.filter(n=>!n.read_at).length,capabilities:{email:false,push:false,sms:false},registered_devices:0};},async list(p){ready();return {data:rows.filter(n=>(!p.channel||n.channel===p.channel)&&(!p.unread||!n.read_at)),next_cursor:null};},async update(id,op){rows=op==='archive'?rows.filter(n=>n.id!==id):rows.map(n=>n.id===id?{...n,read_at:op==='read'?new Date().toISOString():null}:n);},async readAll(){rows=rows.map(n=>({...n,read_at:new Date().toISOString()}));},async preferences(id,v){Object.assign(channels.find(c=>c.id===id),v);},async publish(input){rows.unshift({...input,id:crypto.randomUUID(),event_id:crypto.randomUUID(),channel:'announcements',read_at:null,created_at:new Date().toISOString()});}};`;
const mocks = new Map(
  [
    ["src/api/notifications.ts", api],
    [
      "src/hooks/useAuth.ts",
      `const role=new URLSearchParams(location.search).get('role')||'FOUNDER';const auth={user:{id:'demo'},role,roleLabel:role.replaceAll('_',' '),loading:false,isFounder:role==='FOUNDER'};export const useAuth=()=>auth;`,
    ],
    [
      "src/contexts/ThemeContext.tsx",
      `import {lightTheme,darkTheme} from ${JSON.stringify(path.join(root, "src/constants/theme.ts"))};const isDark=new URLSearchParams(location.search).has('dark');export const useTheme=()=>({colors:(isDark?darkTheme:lightTheme).colors,isDark,reducedMotion:true});`,
    ],
  ].map(([p, s]) => [path.join(root, p), s]),
);
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';import Screen from './src/screens/notifications/NotificationCenterScreen';import {NotificationProvider} from './src/contexts/NotificationContext';import {lightTheme,darkTheme} from './src/constants/theme';document.body.style.backgroundColor=(new URLSearchParams(location.search).has('dark')?darkTheme:lightTheme).colors.background;createRoot(document.getElementById('app')).render(<NotificationProvider><Screen/></NotificationProvider>);`;
(async () => {
  await esbuild.build({
    stdin: { contents: entry, loader: "tsx", resolveDir: root },
    bundle: true,
    outfile: path.join(tmp, "bundle.js"),
    platform: "browser",
    format: "iife",
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".json",
    ],
    alias: { "react-native": "react-native-web" },
    define: {
      global: "globalThis",
      "process.env": "{}",
      __DEV__: "true",
      "process.env.NODE_ENV": '"development"',
      "process.env.EXPO_OS": '"web"',
    },
    plugins: [
      {
        name: "fixture",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (a) => {
            if (
              a.path === "react-native-reanimated" ||
              a.path === "expo-router" ||
              a.path === "@react-navigation/native"
            )
              return { path: a.path, namespace: "fixture" };
            const base = path.resolve(a.resolveDir, a.path),
              found = [base, base + ".ts", base + ".tsx"].find((p) =>
                mocks.has(p),
              );
            if (found) return { path: found, namespace: "fixture" };
          });
          build.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
            contents:
              a.path === "react-native-reanimated"
                ? "import React from 'react';import {View} from 'react-native';export default {View,createAnimatedComponent:c=>c};export const useSharedValue=v=>React.useRef({value:v}).current;export const useAnimatedStyle=f=>f();export const withTiming=v=>v;export const withSpring=v=>v;export const withRepeat=v=>v;export const cancelAnimation=()=>{};"
                : a.path === "expo-router"
                  ? "export const useRouter=()=>({push:p=>window.lastNavigation=p});"
                  : a.path === "@react-navigation/native"
                    ? "import {useEffect} from 'react';export const useFocusEffect=fn=>useEffect(fn,[fn]);"
                    : mocks.get(a.path),
            loader: "tsx",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Notification centre · local QA</title><style>html,body{height:100%;margin:0;font-family:system-ui,sans-serif}*{box-sizing:border-box}#app{height:100%;display:flex;flex-direction:column;padding:24px}@media(max-width:640px){#app{padding:16px 12px}}</style></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>';
  http
    .createServer((q, r) => {
      r.setHeader("Cache-Control", "no-store");
      r.setHeader(
        "Content-Type",
        q.url === "/bundle.js" ? "application/javascript" : "text/html",
      );
      r.end(
        q.url === "/bundle.js"
          ? fs.readFileSync(path.join(tmp, "bundle.js"))
          : html,
      );
    })
    .listen(47935, "127.0.0.1", () =>
      console.log("Notification visual QA: http://127.0.0.1:47935"),
    );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
