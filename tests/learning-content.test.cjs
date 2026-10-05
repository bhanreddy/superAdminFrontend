const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const React=require('react');
const {create,act}=require('react-test-renderer');
const {loader,frontend,textOf}=require('./helpers.cjs');
const p=rel=>path.join(frontend,rel);
function setup(width=1200){
  const memory=new Map(),saves=[];
  const native={View:'View',Text:'Text',Image:'Image',ScrollView:'ScrollView',TextInput:'TextInput',Pressable:'Pressable',
    Platform:{OS:'web'},useWindowDimensions:()=>({width,height:900}),Modal:({visible,children})=>visible?React.createElement('Modal',null,children):null,
    FlatList:({data,renderItem,ListEmptyComponent,ListFooterComponent})=>React.createElement('FlatList',null,data.length?data.map((item,index)=>React.createElement(React.Fragment,{key:item.id},renderItem({item,index}))):ListEmptyComponent,ListFooterComponent)};
  const mocks={
    'react-native':native,'expo-router':{useRouter:()=>({push:()=>{}})},'expo-file-system':{},'expo-document-picker':{getDocumentAsync:async()=>({canceled:true})},
    '@react-native-picker/picker':{Picker:Object.assign('Picker',{Item:'PickerItem'})},
    '@react-native-async-storage/async-storage':{getItem:async k=>memory.get(k)||null,setItem:async(k,v)=>memory.set(k,v),removeItem:async k=>memory.delete(k)},
    'lucide-react-native':new Proxy({},{get:(_,key)=>key==='__esModule'?true:()=>null}),
    [p('src/contexts/AuthContext.tsx')]:{useAuth:()=>({user:{id:'test-founder'}})},
    [p('src/contexts/ThemeContext.tsx')]:{useTheme:()=>({colors:{primary:'#123',textPrimary:'#123',textSecondary:'#456',border:'#ccc'},spacing:{xs:4,sm:8,md:16,xl:24},borderRadius:{md:16,lg:20},typography:{body:{},caption:{},label:{},h3:{},h4:{}}})},
    [p('src/components/ui/Button.tsx')]:{Button:({title,children,...props})=>React.createElement('Pressable',props,title||children)},
    [p('src/components/ui/Input.tsx')]:{Input:props=>React.createElement('TextInput',props)},
    [p('src/components/ui/Card.tsx')]:{Card:({children})=>React.createElement('Card',null,children)},
    [p('src/components/ui/ScreenHeader.tsx')]:{ScreenHeader:({title,rightAction})=>React.createElement('Header',null,title,rightAction)},
    [p('src/components/ui/EmptyState.tsx')]:{EmptyState:({title})=>React.createElement('Empty',null,title)},
    [p('src/components/ui/Skeleton.tsx')]:{Skeleton:()=>React.createElement('Skeleton')},
    [p('src/components/ui/Toast.tsx')]:{useToast:()=>({showToast:()=>{}})},
    [p('src/api/superAdminClient.ts')]:{superAdminClient:{}},
  };
  // Picker is a host component with a usable Item member.
  const Picker=props=>React.createElement('Picker',props,props.children);Picker.Item=props=>React.createElement('PickerItem',props);mocks['@react-native-picker/picker']={Picker};
  const helpers=loader(mocks)(p('src/api/learningContent.ts'));
  const api={schema:async()=>({ready:true,missing:[]}),list:async()=>({data:[],next_cursor:null}),imageUrl:async()=>'',
    save:async(doc,key,id,revision)=>{saves.push({doc:helpers.documentPayload(doc),key,id,revision});return {...helpers.documentPayload(doc),id:id||helpers.newId(),revision:(revision||0)+1,updated_at:new Date().toISOString()};}};
  mocks[p('src/api/learningContent.ts')]={...helpers,learningContentApi:api};
  const Screen=loader(mocks)(p('app/(app)/manage-content.tsx')).default;
  return {Screen,memory,saves,api};
}
const button=(root,title)=>root.findAllByType('Pressable').find(n=>textOf(n)===title);
const field=(root,label)=>root.findAllByType('TextInput').find(n=>n.props.label===label);
async function click(tree,label){const b=button(tree.root,label);assert.ok(b,`Missing ${label}`);assert.ok(!b.props.disabled,`${label} disabled`);await act(async()=>b.props.onPress());}
async function enter(tree,label,value){await act(async()=>field(tree.root,label).props.onChangeText(value));}
async function start(env){let tree;await act(async()=>{tree=create(React.createElement(env.Screen));});await act(async()=>new Promise(r=>setTimeout(r,350)));return tree;}
test('editor saves topic, subtopic and all Q&A categories with stable links and metadata',async()=>{
  const env=setup();const tree=await start(env);
  try{
    await click(tree,'New topic');await enter(tree,'Topic','Fractions');await enter(tree,'Definition','Parts of a whole');await enter(tree,'Subject','Math');await enter(tree,'Grade / level','6');
    await enter(tree,'Tags (comma separated)','fractions, equivalent,');await enter(tree,'Learning objectives (one per line)','Compare fractions\n');
    await click(tree,'Add subtopic');await enter(tree,'Subtopic','Equivalent fractions');await enter(tree,'Definition','Fractions with equal values');
    for(const label of ['Examples','Activities','Exercises','Long answers']){
      await click(tree,label);await click(tree,'Add question');await enter(tree,'Question / activity instructions',`${label} question`);await enter(tree,'Answer / expected outcome','Model answer');
      await enter(tree,'Marks','1.');assert.equal(field(tree.root,'Marks').props.value,'1.');await enter(tree,'Marks','1.5');
    }
    await act(async()=>tree.root.findAllByType('Picker').find(n=>n.props.accessibilityLabel==='Content status').props.onValueChange('ready'));
    await click(tree,'Preview');assert.match(textOf(tree.toJSON()),/Model answer/);await click(tree,'Save ready content');
    assert.equal(env.saves.length,1);const saved=env.saves[0];assert.equal(saved.doc.questions.length,4);assert.equal(saved.doc.subtopics.length,1);
    for(const q of saved.doc.questions)assert.equal(q.subtopic_id,saved.doc.subtopics[0].id);
    for(const q of saved.doc.questions)assert.equal(q.marks,1.5);
    assert.deepEqual(saved.doc.tags,['fractions','equivalent']);assert.equal(saved.doc.status,'ready');assert.ok(saved.key);
    assert.match(textOf(tree.toJSON()),/Revision 1/);
  }finally{await act(async()=>tree.unmount());}
});
test('mobile editor retains input after failed saves and reuses its retry key',async()=>{
  const env=setup(390);const tree=await start(env);const attempted=[];
  env.api.save=async(doc,key)=>{attempted.push(key);throw new Error('Network unavailable');};
  try{
    await click(tree,'New topic');await enter(tree,'Topic','Draft topic');await click(tree,'Save to database');
    assert.match(textOf(tree.toJSON()),/Network unavailable/);assert.equal(field(tree.root,'Topic').props.value,'Draft topic');
    await click(tree,'Save to database');assert.equal(attempted[0],attempted[1]);
    await enter(tree,'Definition','New definition');await click(tree,'Save to database');assert.notEqual(attempted[2],attempted[1]);
    await act(async()=>new Promise(r=>setTimeout(r,850)));assert.ok(env.memory.get('learning-content-draft:test-founder'));
    await click(tree,'Back to library');assert.match(textOf(tree.toJSON()),/Discard your unsaved changes/);await click(tree,'Cancel');assert.ok(field(tree.root,'Topic'));
  }finally{await act(async()=>tree.unmount());}
});
