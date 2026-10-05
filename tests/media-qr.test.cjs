const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { loader, frontend, textOf } = require('./helpers.cjs');
const p = rel => path.join(frontend, rel);
const artifact = { modules: 73, cells: [[0,0],[1,1]], color: '#651F34', variant: 'premium-frame', logo: { x:31, y:31, size:11, imageDataUri:'data:image/png;base64,official-logo' } };
function setup(width = 1200) {
    const writes = [], reads = [], files = [], shares = [], resources = [];
    const native = { View:'View', Text:'Text', TextInput:'TextInput', Image:'Image', Pressable:'Pressable', ScrollView:'ScrollView',
        Platform:{OS:'ios'}, Alert:{alert(){}}, useWindowDimensions:()=>({width,height:800}),
        Modal:({visible,children})=>visible?React.createElement('Modal',null,children):null,
        FlatList:({data,renderItem,ListEmptyComponent,ListFooterComponent})=>React.createElement('FlatList',null,data.length?data.map((item,index)=>React.createElement(React.Fragment,{key:item.id},renderItem({item,index}))):ListEmptyComponent,ListFooterComponent),
    };
    const client = {
        async get(url, options) {
            reads.push({url,options});
            let data;
            if(url.includes('format=')) return {data:new Uint8Array([1,2,3,4]).buffer};
            if(url.endsWith('/artifact')) data = {artifact};
            else if(url.endsWith('/usage')) data = null;
            else if(url.endsWith('/resource-1')) data = {...resources[0],sources:[{id:'source-1',version:1,provider:'youtube'}],mapping:[],auditLog:[]};
            else data = {items:resources,nextCursor:null};
            return {data:{data}};
        },
        async post(url, body, options) {
            writes.push({url,body,key:options.headers['Idempotency-Key']});
            if(url.endsWith('/qr')) {
                if(client.failQr) {client.failQr=false;throw new Error('QR network interrupted');}
                resources[0].qrs=[{id:'qr-1',displayCode:body.displayCode,status:'DRAFT'}];
                return {data:{data:{id:'qr-1',status:'DRAFT'}}};
            }
            resources.push({id:'resource-1',title:body.title,description:body.description,status:'ACTIVE',sourceVersion:1,qrs:[]});
            return {data:{data:{id:'resource-1'}}};
        },
    };
    const mocks = {
        'react-native':native,
        'react-native-svg':{__esModule:true,default:'Svg',G:'G',Rect:'Rect',Path:'Path',Image:'SvgImage'},
        'expo-clipboard':{setStringAsync:async()=>{}},
        'expo-file-system':{cacheDirectory:'/cache/',EncodingType:{Base64:'base64'},writeAsStringAsync:async(...args)=>files.push(args)},
        'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async file=>shares.push(file)},
        [p('assets/logo.png')]:1,
        [p('src/contexts/ThemeContext.tsx')]:{useTheme:()=>({colors:{primary:'#123',textPrimary:'#123',textSecondary:'#456',border:'#ccc',error:'#c00'}})},
        [p('src/constants/theme.ts')]:{MEDIA_EDITORIAL:{accent:'#651F34'}},
        [p('src/components/ui/Button.tsx')]:{Button:({title,loading,disabled,...props})=>React.createElement('Pressable',{...props,disabled:disabled||loading},title)},
        [p('src/api/superAdminClient.ts')]:{superAdminClient:client},
    };
    return {Screen:loader(mocks)(p('app/(app)/media-qr.tsx')).default,client,writes,reads,files,shares};
}
const button = (tree,label) => tree.root.findAllByType('Pressable').find(n=>textOf(n)===label);
async function click(tree,label) {const b=button(tree,label);assert.ok(b,`Missing ${label}`);assert.ok(!b.props.disabled,`${label} disabled`);await act(async()=>b.props.onPress());}
async function enter(tree,label,value) {const f=tree.root.findAllByType('TextInput').find(n=>n.props.accessibilityLabel===label);assert.ok(f,`Missing ${label}`);await act(async()=>f.props.onChangeText(value));}
async function start(env) {let tree;await act(async()=>{tree=create(React.createElement(env.Screen));});return tree;}
async function prepare(tree) {
    await click(tree,'+ Create Media QR');
    await enter(tree,'Video link (HTTPS)','https://youtube.com/shorts/AbCdEfGhI_1?si=tracking');
    await click(tree,'Continue');
    await enter(tree,'Resource title','Understanding place value');
    await click(tree,'Continue');
}
test('creator requires a valid video link before details or generation and retains failed input',async()=>{
    const env=setup();const tree=await start(env);
    try {
        await click(tree,'+ Create Media QR');await click(tree,'Continue');
        assert.match(textOf(tree.toJSON()),/Paste a valid HTTPS YouTube/);
        await enter(tree,'Video link (HTTPS)','https://youtube.com.evil.test/watch?v=AbCdEfGhI_1');await click(tree,'Continue');
        assert.equal(env.writes.length,0);
        assert.ok(tree.root.findAllByType('TextInput').some(n=>n.props.accessibilityLabel==='Video link (HTTPS)'));
        await enter(tree,'Video link (HTTPS)','https://youtu.be/AbCdEfGhI_1');await click(tree,'Continue');await click(tree,'Continue');
        assert.match(textOf(tree.toJSON()),/Enter a resource title/);
        assert.equal(env.writes.length,0);
    } finally {await act(async()=>tree.unmount());}
});
test('link workflow creates one resource and branded draft, renders compact layout, exports once',async()=>{
    const env=setup(390);const tree=await start(env);
    try {
        await prepare(tree);await click(tree,'Blue');await click(tree,'Create & generate QR');
        assert.equal(env.writes.length,2);
        assert.deepEqual(env.writes[0].body.source,{provider:'youtube',url:'https://youtube.com/shorts/AbCdEfGhI_1?si=tracking'});
        assert.equal(env.writes[0].body.internalName,'Understanding place value');
        assert.equal(env.writes[1].body.style.accent,'blue');
        assert.equal(env.writes[1].body.style.variant,'premium-frame');
        assert.match(env.writes[1].body.displayCode,/^NEX-/);
        assert.match(textOf(tree.toJSON()),/DRAFT/);
        assert.ok(button(tree,'Back to library'));
        assert.equal(tree.root.findAllByType('FlatList').length,0);
        assert.equal(tree.root.findByType('SvgImage').props.href.uri,artifact.logo.imageDataUri);
        assert.equal(tree.root.findAllByType('Path').length,2);
        await click(tree,'PNG');
        const downloads=env.reads.filter(r=>r.url.includes('format=png'));
        assert.equal(downloads.length,1);assert.equal(downloads[0].options.responseType,'arraybuffer');
        assert.equal(env.files.length,1);assert.equal(env.shares.length,1);
        await click(tree,'Back to library');assert.equal(tree.root.findAllByType('FlatList').length,1);
    } finally {await act(async()=>tree.unmount());}
});
test('interrupted QR generation reuses the saved resource and idempotency key',async()=>{
    const env=setup();env.client.failQr=true;const tree=await start(env);
    try {
        await prepare(tree);await click(tree,'Create & generate QR');
        assert.match(textOf(tree.toJSON()),/QR network interrupted/);
        assert.ok(button(tree,'Back').props.disabled);
        await click(tree,'Retry QR generation');
        const creates=env.writes.filter(w=>!w.url.endsWith('/qr')),qrs=env.writes.filter(w=>w.url.endsWith('/qr'));
        assert.equal(creates.length,1);assert.equal(qrs.length,2);assert.equal(qrs[0].key,qrs[1].key);
        assert.match(textOf(tree.toJSON()),/DRAFT/);
    } finally {await act(async()=>tree.unmount());}
});
test('frontend normalizes supported YouTube links and rejects unsafe inputs',()=>{
    const {youtubeVideoId:front}=loader()(p('src/utils/mediaLinks.ts'));
    for(const url of ['https://www.youtube.com/watch?v=AbCdEfGhI_1&t=12','https://youtu.be/AbCdEfGhI_1?si=tracked','https://youtube.com/shorts/AbCdEfGhI_1','https://m.youtube.com/live/AbCdEfGhI_1','https://www.youtube-nocookie.com/embed/AbCdEfGhI_1']) assert.equal(front(url),'AbCdEfGhI_1');
    for(const url of ['AbCdEfGhI_1','https://youtube.com.evil.test/watch?v=AbCdEfGhI_1','http://youtu.be/AbCdEfGhI_1','https://youtu.be/short','https://user@youtube.com/watch?v=AbCdEfGhI_1']) {assert.throws(()=>front(url));}
});
