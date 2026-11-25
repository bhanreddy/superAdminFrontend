const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),crypto=require('node:crypto'),React=require('react');
const {act,create}=require('react-test-renderer');
const {uiLoader,frontend,textOf}=require('./helpers.cjs');
const row={id:'question-1',code:'Q-TS-BIO-G10-CH01-031',title:'Nutrition item 031',revision:1,checksum:'1'.repeat(64),pedagogical_type:'VSA',difficulty:'easy',bloom:'remember',review_state:'draft',marks:'1',visual:false};
const document={schemaVersion:1,title:row.title,type:'short_answer',prompt:'Where do plant raw materials come from?',answer:'Soil water and atmospheric carbon dioxide.',marks:1,language:'en',learningOutcomeIds:[],assets:[],metadata:{bank:{externalCode:row.code,pedagogicalType:'VSA',difficulty:'easy',bloom:'remember',optionIds:[],rubric:{criteria:[{criterion:'Identify both sources',marks:1}],partial_credit:'Teacher marking',accepted_alternatives:['Soil water and atmospheric CO2.']},concepts:[],sourceReferences:[],verification:{content:'author self-review',assets:'not_required'}}}};
function setup(){
  let actor={user:{id:'author'},permissions:['curriculum.questions.read','curriculum.questions.author','curriculum.questions.import'],can:p=>actor.permissions.includes(p)};
  let current=1,failSave=false,pendingSave=null,offline=false;const calls=[];
  const detail=()=>({question_id:row.id,revision:current,checksum:String(current).repeat(64),document:{...structuredClone(document),prompt:current>1?'Other author stem':document.prompt},entry:{external_code:row.code},history:[{revision:current,created_at:'2026-11-16'}],reviews:[],review_state:'draft'});
  const api={QB_PERMISSIONS:{read:'curriculum.questions.read',author:'curriculum.questions.author',import:'curriculum.questions.import',review:'curriculum.questions.review',approve:'curriculum.questions.approve'},
    qbGet:async(p)=>{calls.push(['get',p]);if(offline)throw Error('offline');if(p==='/questions')return {items:[row],total:1,next_offset:null};if(p==='/destinations')return [];if(p.startsWith('/questions/'))return detail();return [];},
    qbSave:async(id,doc,base,key)=>{calls.push(['save',structuredClone(doc),base,key]);if(pendingSave)await pendingSave;if(failSave){current=2;throw {response:{status:409,data:{error:'Conflict'}}};}current=3;document.prompt=doc.prompt;return {revision:3};},
    qbPost:async()=>({}),qbError:e=>e?.response?.data?.error||e.message||'Failed',previewBundle:async()=>({}),downloadImportReport:async()=>({}),pickedBytes:async()=>new Uint8Array(),uploadQuestionFigure:async()=>({})};
  const theme={colors:{textPrimary:'#111',textSecondary:'#555',primary:'#900',background:'#eee',card:'#fff',border:'#ddd',errorDim:'#fee',successDim:'#efe',skeleton:'#eee'},spacing:{md:16,xl:24},typography:{h1:{},h3:{},h4:{}}};
  const load=uiLoader({'react-native':{Switch:'Switch',Image:'Image',FlatList:({data,renderItem,ListEmptyComponent,...props})=>React.createElement('FlatList',props,data.length?data.map(item=>React.createElement(React.Fragment,{key:item.id},renderItem({item}))):ListEmptyComponent)},
    'expo-router':{useNavigation:()=>({addListener:()=>()=>{}})},'@react-native-picker/picker':{Picker:Object.assign(p=>React.createElement('Picker',p),{Item:'PickerItem'})},
    'expo-document-picker':{getDocumentAsync:async()=>({canceled:true})},'expo-file-system':{},'expo-sharing':{},'@react-native-async-storage/async-storage':{getItem:async()=>null,setItem:async()=>{}},
    [path.join(frontend,'src/hooks/useAuth.ts')]:{useAuth:()=>actor},[path.join(frontend,'src/contexts/ThemeContext.tsx')]:{useTheme:()=>theme},
    [path.join(frontend,'src/api/books.ts')]:{requestKey:()=>crypto.randomUUID()},[path.join(frontend,'src/api/superAdminClient.ts')]:{superAdminClient:{defaults:{baseURL:'http://isolated.test'}}},
    [path.join(frontend,'src/api/questionBank.ts')]:api,
    [path.join(frontend,'src/components/ui/Button.tsx')]:{Button:p=>React.createElement('Button',p)},[path.join(frontend,'src/components/ui/Input.tsx')]:{Input:p=>React.createElement('Input',p)},[path.join(frontend,'src/components/ui/Card.tsx')]:{Card:({children})=>React.createElement('Card',{},children)}});
  const Screen=load(path.join(frontend,'src/screens/questionBank/QuestionBankScreen.tsx')).default;
  return {Screen,calls,actor:()=>actor,setActor:v=>{actor={...actor,...v};},setFail:v=>{failSave=v;},setPending:v=>{pendingSave=v;},setOffline:v=>{offline=v;}};
}
const settle=async()=>{await act(async()=>{await new Promise(resolve=>setImmediate(resolve));});};
const button=(tree,title)=>tree.root.findAllByType('Button').find(n=>n.props.title===title);
test('portable file SHA-256 matches Node for empty, abc and binary inputs',()=>{
  const hash=uiLoader()(path.join(frontend,'src/utils/questionBankHash.ts')).questionBankSha256;
  for(const bytes of [Buffer.alloc(0),Buffer.from('abc'),crypto.randomBytes(4097)])assert.equal(hash(bytes),crypto.createHash('sha256').update(bytes).digest('hex'));
});
test('conflict recovery preserves another author’s unrelated fields and reports overlapping edits',()=>{
  const recover=uiLoader()(path.join(frontend,'src/utils/questionBankMerge.ts')).recoverQuestionEdits;
  const base={prompt:'Original',marks:1,rubric:{criterion:'Original'}},local={...base,prompt:'Mine'},current={prompt:'Theirs',marks:2,rubric:{criterion:'Improved'}};
  const result=recover(base,local,current);assert.deepEqual(result.document,{prompt:'Mine',marks:2,rubric:{criterion:'Improved'}});assert.deepEqual(result.conflicts,['prompt']);
});
test('editor preserves unsaved conflict edits, blocks duplicate in-flight saves and clears teacher state on permission loss',async()=>{
  const f=setup();let tree;await act(async()=>{tree=create(React.createElement(f.Screen));});await settle();assert.match(textOf(tree.toJSON()),/1 matching questions/);
  await act(async()=>button(tree,'Open').props.onPress());await settle();
  const input=()=>tree.root.findAllByType('Input').find(n=>n.props.label==='Question');
  await act(async()=>input().props.onChangeText('My retained edit'));f.setFail(true);
  await act(async()=>button(tree,'Save draft revision').props.onPress());await settle();assert.equal(input().props.value,'My retained edit');assert.match(textOf(tree.toJSON()),/Your edits are retained/);
  await act(async()=>button(tree,'Recover my edits onto current revision').props.onPress());assert.equal(input().props.value,'My retained edit');
  f.setFail(false);let release;f.setPending(new Promise(resolve=>{release=resolve;}));
  await act(async()=>{const save=button(tree,'Save draft revision');save.props.onPress();save.props.onPress();});assert.equal(f.calls.filter(c=>c[0]==='save').length,2);
  await act(async()=>input().props.onChangeText('Must not overwrite in-flight edit'));assert.equal(input().props.value,'My retained edit');
  await act(async()=>{release();});await settle();assert.equal(f.calls.filter(c=>c[0]==='save').at(-1)[2].revision,2);
  f.setActor({permissions:[]});await act(async()=>tree.update(React.createElement(f.Screen)));assert.match(textOf(tree.toJSON()),/do not have permission/);assert.equal(tree.root.findAllByType('Input').length,0);tree.unmount();
});
test('offline bank view gives an actionable retry and recovers without reloading the application',async()=>{
  const f=setup();f.setOffline(true);let tree;await act(async()=>{tree=create(React.createElement(f.Screen));});await settle();assert.match(textOf(tree.toJSON()),/offline/);
  f.setOffline(false);await act(async()=>button(tree,'Retry connection').props.onPress());await settle();assert.match(textOf(tree.toJSON()),/1 matching questions/);tree.unmount();
});
