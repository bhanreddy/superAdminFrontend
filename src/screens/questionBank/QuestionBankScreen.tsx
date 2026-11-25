import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {View,Text,FlatList,ScrollView,Modal,Image,StyleSheet,Platform,Switch,useWindowDimensions,ActivityIndicator} from 'react-native';
import {Picker} from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {useNavigation} from 'expo-router';
import {useTheme} from '../../contexts/ThemeContext';
import {useAuth} from '../../hooks/useAuth';
import {Button} from '../../components/ui/Button';
import {Input} from '../../components/ui/Input';
import {Card} from '../../components/ui/Card';
import {requestKey} from '../../api/books';
import {superAdminClient} from '../../api/superAdminClient';
import {questionBankSha256} from '../../utils/questionBankHash';
import {recoverQuestionEdits} from '../../utils/questionBankMerge';
import {qbGet,qbPost,qbSave,qbError,previewBundle,downloadImportReport,pickedBytes,uploadQuestionFigure,QB_PERMISSIONS,
  type BankRow,type QuestionDetail,type QuestionDocument,type Destination,type ImportJob,type AssetLink} from '../../api/questionBank';

const formats=['MCQ','VSA','SA','LA'];
const states=['draft','changes_requested','reviewed','approved'];
const difficulties=['easy','medium','hard'];
const blooms=['remember','understand','apply','analyze','evaluate','create'];
type FilterKey='productId'|'versionId'|'board'|'grade'|'subject'|'language'|'pedagogicalType'|'difficulty'|'bloom'|'state'|'visual';
type Filter=Partial<Record<FilterKey,string>>;
function Choice({label,value,options,onChange}:{label:string;value:string;options:{label:string;value:string}[];onChange:(v:string)=>void}) {
  const {colors}=useTheme();return <View style={styles.choice}><Text style={{color:colors.textSecondary,fontSize:13}}>{label}</Text><Picker accessibilityLabel={label} selectedValue={value} onValueChange={onChange} style={{color:colors.textPrimary,backgroundColor:colors.inputBg,minHeight:44,width:'100%'}}>{options.map(o=><Picker.Item key={o.value} label={o.label} value={o.value}/>)}</Picker></View>;
}
const options=(values:string[],all='All')=>[{label:all,value:''},...values.map(value=>({label:value.replace(/_/g,' '),value}))];
const QuestionRow=React.memo(function QuestionRow({item,selected,onSelect,onOpen}:{item:BankRow;selected:boolean;onSelect:(q:BankRow)=>void;onOpen:(q:BankRow)=>void}){
  const {colors}=useTheme();return <View style={[styles.row,{borderBottomColor:colors.border}]}><Switch accessibilityLabel={`Select ${item.code}`} value={selected} onValueChange={()=>onSelect(item)}/><View style={{flex:1,minWidth:120}}><Text style={{color:colors.textPrimary,fontWeight:'600'}}>{item.code}</Text><Text style={{color:colors.textSecondary,marginTop:4}}>{item.title}</Text><Text style={{color:colors.textSecondary,fontSize:12,marginTop:4}}>{item.pedagogical_type} · {item.marks} marks · {item.review_state.replace(/_/g,' ')} · Revision {item.revision}{item.visual?' · Figure available':''}</Text></View><Button title="Open" variant="ghost" onPress={()=>onOpen(item)}/></View>;
});

export default function QuestionBankScreen(){
  const auth=useAuth();
  // A permission/account change unmounts all teacher payloads and in-flight
  // view state. Persisted storage contains only actor-scoped job IDs.
  return <QuestionBankWorkspace key={`${auth.user?.id||'signed-out'}:${auth.permissions.join(',')}:${superAdminClient.defaults.baseURL}`}/>;
}
function QuestionBankWorkspace(){
  const {colors,spacing,typography}=useTheme(),{width}=useWindowDimensions(),auth=useAuth(),navigation=useNavigation();
  const can=useCallback((name:keyof typeof QB_PERMISSIONS)=>auth.can(QB_PERMISSIONS[name]),[auth]);
  const [tab,setTab]=useState('bank'),[rows,setRows]=useState<BankRow[]>([]),[total,setTotal]=useState(0),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null);
  const [filters,setFilters]=useState<Filter>({}),[search,setSearch]=useState(''),[query,setQuery]=useState(''),[destinations,setDestinations]=useState<Destination[]>([]),[destinationId,setDestinationId]=useState('');
  const [summary,setSummary]=useState<{draft:number;reviewed:number;approved:number;visual:number}|null>(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[progress,setProgress]=useState('');
  const [selected,setSelected]=useState<Record<string,BankRow>>({}),[paperTitle,setPaperTitle]=useState('Nutrition — question paper'),[resolutionReason,setResolutionReason]=useState(''),[conflicts,setConflicts]=useState<any[]>([]);
  const [file,setFile]=useState<DocumentPicker.DocumentPickerAsset|null>(null),[job,setJob]=useState<ImportJob|null>(null),[history,setHistory]=useState<any[]>([]),[acceptUpdates,setAcceptUpdates]=useState(false);
  const [detail,setDetail]=useState<QuestionDetail|null>(null),[draft,setDraft]=useState<QuestionDocument|null>(null),[dirty,setDirty]=useState(false),[conflict,setConflict]=useState<QuestionDetail|null>(null),[discard,setDiscard]=useState(false);
  const [teacherView,setTeacherView]=useState(false),[urls,setUrls]=useState<Record<string,string>>({}),[reviewReason,setReviewReason]=useState(''),[contentChecked,setContentChecked]=useState(false),[assetsChecked,setAssetsChecked]=useState(false);
  const [historical,setHistorical]=useState(false);
  const [paper,setPaper]=useState<{html:string;teacher:boolean}|null>(null),[assets,setAssets]=useState<any[]>([]),[usage,setUsage]=useState<any>(null);
  const saveKey=useRef(requestKey()),importKey=useRef(requestKey()),pendingActions=useRef<Record<string,string>>({}),alive=useRef(true),querySequence=useRef(0);
  const busyRef=useRef(false);
  const userId=String((auth.user as any)?.id||'');
  const storageKey=`question-bank-job:${superAdminClient.defaults.baseURL}:${userId}`;
  const destination=destinations.find(d=>d.chapter_id===destinationId);
  const picked=useMemo(()=>Object.values(selected),[selected]),marks=useMemo(()=>picked.reduce((sum,q)=>sum+Number(q.marks),0),[picked]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setOffset(0);},300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{const stop=navigation.addListener('beforeRemove',(e:any)=>{if(dirty){e.preventDefault();setError('Save your edits, or close the editor and choose Discard changes before leaving.');}});return stop;},[navigation,dirty]);
  useEffect(()=>{if(Platform.OS!=='web'||!dirty)return;const fn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',fn);return()=>window.removeEventListener('beforeunload',fn);},[dirty]);
  useEffect(()=>{if(!auth.user||!can('read')){setDetail(null);setDraft(null);setUrls({});setPaper(null);setJob(null);setRows([]);setSelected({});setDirty(false);}},[auth.user,auth.permissions]);
  const load=useCallback(async()=>{
    const sequence=++querySequence.current;setLoading(true);setError('');
    try{const q=Object.fromEntries(Object.entries(filters).filter(([,v])=>v));const result=await qbGet<{items:BankRow[];total:number;next_offset:number|null;summary?:typeof summary}>('/questions',{...q,search:query,offset,limit:30,...(destinationId?{chapterId:destinationId}:{})});if(alive.current&&sequence===querySequence.current){setRows(result.items);setTotal(result.total);setNext(result.next_offset);setSummary(result.summary||null);}}
    catch(e){if(alive.current&&sequence===querySequence.current)setError(qbError(e));}finally{if(alive.current&&sequence===querySequence.current)setLoading(false);}
  },[filters,query,offset,destinationId]);
  useEffect(()=>{if(can('read'))void load();},[load,can]);
  useEffect(()=>{if(!can('read'))return;qbGet<Destination[]>('/destinations').then(d=>{if(alive.current)setDestinations(d);}).catch(e=>setError(qbError(e)));},[auth.user,auth.permissions]);
  useEffect(()=>{if(!paper)return;const timer=setTimeout(()=>setPaper(null),280000);return()=>clearTimeout(timer);},[paper]);
  useEffect(()=>{if(!can('import'))return;AsyncStorage.getItem(storageKey).then(id=>{if(id&&alive.current)qbGet<ImportJob>(`/imports/${id}`).then(j=>{if(alive.current)setJob(j);}).catch(()=>{});});},[storageKey,auth.permissions]);
  useEffect(()=>{if(!job||!['QUEUED','RUNNING'].includes(job.status)||!can('import'))return;const timer=setInterval(()=>{qbGet<ImportJob>(`/imports/${job.id}`,{brief:'true'}).then(async j=>{if(alive.current){if(['QUEUED','RUNNING'].includes(j.status))setJob(previous=>previous?{...previous,status:j.status,counts:j.counts}:previous);else{setJob(await qbGet(`/imports/${job.id}`));void load();}}}).catch(e=>setError(`Status unavailable. Your import continues; retry to reconnect. ${qbError(e)}`));},5000);return()=>clearInterval(timer);},[job?.id,job?.status,auth.permissions]);
  const act=async(fn:()=>Promise<void>)=>{if(busyRef.current)return;busyRef.current=true;setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(qbError(e));}finally{busyRef.current=false;if(alive.current){setBusy(false);setProgress('');}}};
  const onSelect=useCallback((q:BankRow)=>setSelected(prior=>{const copy={...prior};if(copy[q.id])delete copy[q.id];else if(Object.keys(copy).length<100)copy[q.id]=q;return copy;}),[]);
  const openQuestion=useCallback((q:BankRow)=>{void act(async()=>{const loaded=await qbGet<QuestionDetail>(`/questions/${q.id}`);setDetail(loaded);setDraft(loaded.document);setDirty(false);setConflict(null);setDiscard(false);setUrls({});setTeacherView(false);setReviewReason('');setContentChecked(false);setAssetsChecked(false);saveKey.current=requestKey();});},[busy]);
  const change=(fn:(d:QuestionDocument)=>void,fromOperation=false)=>{if(busyRef.current&&!fromOperation)return;setDraft(prior=>{if(!prior)return prior;const next=JSON.parse(JSON.stringify(prior));fn(next);return next;});setDirty(true);saveKey.current=requestKey();};
  useEffect(()=>{
    if(!detail||!draft)return;let cancelled=false;setUrls({});
    const links=(draft.assets||[]).filter(a=>teacherView||a.role==='student');
    Promise.all(links.map(async a=>[`${a.assetId}:${a.revision}`,await qbGet<{url:string}>(`/questions/${detail.question_id}/assets/${a.assetId}/${a.revision}/download`,{questionRevision:detail.revision})] as const)).then(results=>{if(!cancelled)setUrls(Object.fromEntries(results.map(([k,v])=>[k,v.url])));}).catch(e=>{if(!cancelled)setError(qbError(e));});
    const timer=setTimeout(()=>{if(!cancelled)setUrls({});},280000);return()=>{cancelled=true;clearTimeout(timer);};
  },[detail?.question_id,detail?.revision,teacherView]);
  const save=()=>void act(async()=>{
    if(!detail||!draft)return;
    try{await qbSave(detail.question_id,draft,{revision:detail.revision,checksum:detail.checksum},saveKey.current);const loaded=await qbGet<QuestionDetail>(`/questions/${detail.question_id}`);setDetail(loaded);setDraft(loaded.document);setDirty(false);setConflict(null);setNotice('Draft revision saved. Approval remains a separate decision.');void load();}
    catch(e:any){if(e.response?.status===409){setHistorical(false);setConflict(await qbGet<QuestionDetail>(`/questions/${detail.question_id}`));setError('Another author saved a revision. Your edits are retained. Compare the current version, then reload or explicitly recover your edits.');}else throw e;}
  });
  const chooseBundle=()=>void act(async()=>{const result=await DocumentPicker.getDocumentAsync({type:Platform.OS==='web'?['application/zip','application/x-zip-compressed','application/json']: '*/*',copyToCacheDirectory:true});if(!result.canceled){setFile(result.assets[0]);setJob(null);importKey.current=requestKey();setAcceptUpdates(false);}});
  const preview=()=>void act(async()=>{if(!file||!destination)throw new Error('Choose the review bundle and its exact destination.');const loaded=await previewBundle(file,destination,importKey.current,n=>setProgress(`Uploading bundle · ${n}%`));setJob(loaded);await AsyncStorage.setItem(storageKey,loaded.id);});
  const jobAction=(action:string)=>void act(async()=>{if(!job)return;const key=`${job.id}:${action}:${acceptUpdates}`;pendingActions.current[key]||=requestKey();await qbPost(`/imports/${job.id}/${action}`,{acceptUpdates},pendingActions.current[key]);setJob(await qbGet(`/imports/${job.id}`));});
  const exportFile=async(name:string,contents:string,mime:string)=>{
    if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([contents],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else{const path=`${FileSystem.cacheDirectory}${name}`;await FileSystem.writeAsStringAsync(path,contents);try{await Sharing.shareAsync(path,{mimeType:mime});}finally{await FileSystem.deleteAsync(path,{idempotent:true});}}
  };
  const makePaper=(teacher:boolean)=>void act(async()=>{
    if(!picked.length)throw new Error('Select questions from the bank first.');
    try{const result=await qbPost('/paper-preview',{title:paperTitle,teacherKey:teacher,questions:picked.map(q=>({id:q.id,revision:q.revision})),resolutions:conflicts.length&&resolutionReason.trim().length>=10?conflicts.map(c=>({groupId:c.groupId,reason:resolutionReason})):[]});setPaper({html:result.html,teacher});setConflicts([]);}
    catch(e:any){if(e.response?.data?.code==='SELECTION_REVIEW_REQUIRED'){setConflicts(e.response.data.details);setError('Some selected questions assess overlapping objectives. Remove them, or record your review of their independence.');}else throw e;}
  });
  const replaceFigure=(link:AssetLink)=>void act(async()=>{
    if(!detail)return;const picked=await DocumentPicker.getDocumentAsync({type:'image/png',copyToCacheDirectory:true});if(picked.canceled)return;
    const asset=picked.assets[0],bytes=await pickedBytes(asset);if(bytes.length>25*1024*1024)throw new Error('PNG must be under 25 MB');
    const uploaded=await uploadQuestionFigure(asset,link,questionBankSha256(bytes),bytes,setProgress);
    change(doc=>{const selected=(doc.assets||[]).find(a=>a===link||a.assetId===link.assetId&&a.revision===link.revision&&a.role===link.role);if(selected){selected.revision=uploaded.revision;selected.checksum=uploaded.checksum;selected.printHeightMm=selected.printWidthMm*uploaded.height_px/uploaded.width_px;
      const logical=doc.metadata.bank.assetIdentity[`${link.assetId}:${link.revision}`];doc.metadata.bank.assetIdentity[`${link.assetId}:${uploaded.revision}`]=logical;}},true);
    setNotice('Verified image revision uploaded. Save to link and preview it, then check the student/teacher pairing before approval. Existing papers retain their original image.');
  });
  const review=(action:string)=>void act(async()=>{if(!detail||dirty)throw new Error('Save or discard edits before reviewing the saved revision.');await qbPost(`/questions/${detail.question_id}/${action}`,{revision:detail.revision,base:{revision:detail.revision,checksum:detail.checksum},reason:reviewReason,contentChecked,assetsChecked});setDetail(await qbGet(`/questions/${detail.question_id}`));setNotice('Review decision recorded for this revision.');void load();});
  const changeFilter=(key:FilterKey,value:string)=>{setFilters(p=>({...p,[key]:value}));setOffset(0);};
  const renderRow=useCallback(({item}:{item:BankRow})=><QuestionRow item={item} selected={!!selected[item.id]} onSelect={onSelect} onOpen={openQuestion}/>,[selected,onSelect,openQuestion]);
  const text=(value:React.ReactNode,secondary=false)=><Text style={{color:secondary?colors.textSecondary:colors.textPrimary,lineHeight:22}}>{value}</Text>;
  if(!can('read'))return <View style={styles.page}>{text('You do not have permission to open the question bank.')}</View>;
  return <View style={[styles.page,{backgroundColor:colors.background,padding:width<600?spacing.md:spacing.xl}]}>
    <View style={styles.heading}><View style={{flex:1}}><Text style={[typography.h1,{color:colors.textPrimary}]}>Question Bank</Text>{text('Reusable chapter questions, verified figures and independent review.',true)}</View><Button title="Refresh" variant="ghost" onPress={()=>void load()} disabled={loading}/></View>
    <View style={styles.wrap}>{['bank',...(can('import')?['import','history']:[]),'paper','assets'].map(name=><Button key={name} title={name[0].toUpperCase()+name.slice(1)} variant={tab===name?'primary':'ghost'} onPress={()=>{setTab(name);if(name==='history')void act(async()=>setHistory(await qbGet('/imports')));if(name==='assets')void act(async()=>setAssets((await qbGet('/assets')).items));}}/>)}</View>
    {error?<View accessibilityRole="alert" style={[styles.alert,{backgroundColor:colors.errorDim}]}>{text(error)}<Button title="Retry connection" variant="ghost" onPress={()=>{void load();if(job)void act(async()=>setJob(await qbGet(`/imports/${job.id}`)));}}/></View>:null}
    {notice?<View accessibilityLiveRegion="polite" style={[styles.alert,{backgroundColor:colors.successDim}]}>{text(notice)}</View>:null}
    {busy?<View style={styles.wrap}><ActivityIndicator color={colors.primary}/>{text(progress||'Working…',true)}</View>:null}
    {tab==='bank'?<>
      <View style={[styles.wrap,{alignItems:'flex-start'}]}><Input label="Search questions" value={search} onChangeText={setSearch} containerStyle={{flex:1,minWidth:200}}/><Choice label="Book and chapter" value={destinationId} options={[{label:'All chapters',value:''},...destinations.map(d=>({label:`${d.product} · ${d.release_name||d.version_label} · ${d.chapter_title}`,value:d.chapter_id}))]} onChange={v=>{setDestinationId(v);setOffset(0);}}/></View>
      <ScrollView horizontal style={{maxHeight:96}} contentContainerStyle={{gap:12}}>
        <Choice label="Book" value={filters.productId||''} options={[{label:'All books',value:''},...destinations.filter((d,i,all)=>d.product_id&&all.findIndex(x=>x.product_id===d.product_id)===i).map(d=>({label:d.product,value:d.product_id!}))]} onChange={v=>{changeFilter('productId',v);changeFilter('versionId','');setDestinationId('');}}/>
        <Choice label="Edition / version" value={filters.versionId||''} options={[{label:'All editions',value:''},...destinations.filter((d,i,all)=>(!filters.productId||d.product_id===filters.productId)&&all.findIndex(x=>x.version_id===d.version_id)===i).map(d=>({label:d.release_name||d.version_label,value:d.version_id}))]} onChange={v=>{changeFilter('versionId',v);setDestinationId('');}}/>
        {(['board','grade','subject','language'] as FilterKey[]).map(key=><View key={key} style={{width:150}}><Input label={key[0].toUpperCase()+key.slice(1)} value={filters[key]||''} onChangeText={v=>changeFilter(key,v)}/></View>)}
        <Choice label="Format" value={filters.pedagogicalType||''} options={options(formats)} onChange={v=>changeFilter('pedagogicalType',v)}/>
        <Choice label="Difficulty" value={filters.difficulty||''} options={options(difficulties)} onChange={v=>changeFilter('difficulty',v)}/>
        <Choice label="Bloom" value={filters.bloom||''} options={options(blooms)} onChange={v=>changeFilter('bloom',v)}/>
        <Choice label="Review" value={filters.state||''} options={options(states)} onChange={v=>changeFilter('state',v)}/>
        <Choice label="Figures" value={filters.visual||''} options={[{label:'All',value:''},{label:'Available',value:'yes'},{label:'Text only',value:'no'}]} onChange={v=>changeFilter('visual',v)}/>
      </ScrollView>
      {text(`${total} matching questions · ${picked.length} selected · ${marks} marks${summary?` · ${summary.approved} approved · ${summary.visual} with figures`:''}`,true)}
      <FlatList data={rows} keyExtractor={q=>q.id} renderItem={renderRow} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7} style={{flex:1,marginTop:12}}
        ListEmptyComponent={loading?<View style={[styles.alert,{backgroundColor:colors.skeleton}]}>{text('Loading the chapter bank…')}</View>:<View style={styles.alert}>{text('No matching questions. Change the filters or import a prepared chapter bundle.')}</View>}/>
      <View style={styles.wrap}><Button title="Previous" variant="ghost" disabled={!offset||loading} onPress={()=>setOffset(Math.max(0,offset-30))}/>{text(`Page ${Math.floor(offset/30)+1}`)}<Button title="Next" variant="ghost" disabled={next===null||loading} onPress={()=>setOffset(next||0)}/><Button title={`Review selection · ${marks} marks`} onPress={()=>setTab('paper')} disabled={!picked.length}/></View>
    </>:<ScrollView style={{flex:1}} contentContainerStyle={{gap:16,paddingBottom:32}}>
      {tab==='import'?<Card><Text style={[typography.h3,{color:colors.textPrimary}]}>Import a review bundle</Text>{text('Choose the teacher review ZIP to include all questions and PNG figures. JSON imports can block questions whose images are missing.',true)}
        <Choice label="Destination book, edition and chapter" value={destinationId} options={[{label:'Choose exact destination',value:''},...destinations.filter(d=>['DRAFT','CHANGES_REQUESTED','PUBLISHED','SUPERSEDED'].includes(d.version_status)).map(d=>({label:`${d.product} · ${d.release_name||d.version_label} · Grade ${d.grade} · ${d.subject} · ${d.chapter_title} · ${d.language}`,value:d.chapter_id}))]} onChange={v=>{setDestinationId(v);setJob(null);importKey.current=requestKey();}}/>
        <View style={styles.wrap}><Button title={file?file.name:'Choose ZIP or JSON'} variant="secondary" disabled={busy} onPress={chooseBundle}/><Button title="Validate and preview" disabled={busy||!file||!destination} onPress={preview}/></View>
        {job?<View style={{gap:12,marginTop:20}}><Text style={[typography.h4,{color:colors.textPrimary}]}>Import {job.status.toLowerCase()}</Text>{text(`${job.preview?.total||0} questions · ${job.preview?.visual||0} visual · ${job.preview?.logicalAssets||0} student/teacher assets`)}
          {text(Object.entries(job.preview?.distribution||{}).map(([k,v])=>`${k}: ${v}`).join(' · '))}
          {text(`Author content checks: ${job.preview?.contentVerified||0} · Asset ready: ${job.preview?.assetReady||0} · Human reviewed: 0 · Human approved: 0`)}
          {text(`Drafted/imported: ${job.counts?.imported??Object.values(job.results||{}).filter((r:any)=>r.status!=='blocked').length} · Blocked: ${job.counts?.blocked??(Object.values(job.results||{}).filter((r:any)=>r.status==='blocked').length||job.preview?.blocked||0)}`)}
          {(job.preview?.errors||[]).concat(job.preview?.assetErrors||[]).map((e:any,i:number)=><Text key={i} style={{color:colors.error}}>{e.code||e.asset_id} · {e.field}: {e.message}</Text>)}
          {(job.preview?.rows||[]).filter((r:any)=>r.change==='update'||r.blocked?.length).map((r:any)=><View key={r.code} style={styles.alert}>{text(`${r.code} · ${r.change}`)}{(r.blocked||[]).map((b:any,i:number)=>text(`${b.field}: ${b.message}`))}{(r.diff||[]).map((d:any,i:number)=><Text key={i} style={{color:colors.textSecondary}}>{d.field}: {JSON.stringify(d.before)} → {JSON.stringify(d.after)}</Text>)}</View>)}
          {Object.entries(job.results||{}).filter(([,r]:any)=>r.status==='blocked').map(([code,r]:any)=><View key={code}>{text(`${code}: ${r.message}`)}{(r.details||[]).map((d:any)=>text(`${d.field}: ${d.message}`))}</View>)}
          <View style={styles.wrap}><Switch accessibilityLabel="Accept corrected draft changes" value={acceptUpdates} onValueChange={setAcceptUpdates}/>{text('I reviewed and accept the changed draft fields.')}</View>
          <View style={styles.wrap}><Button title="Commit to drafts" disabled={busy||job.status!=='PREVIEW'||job.preview?.errors?.length>0} onPress={()=>jobAction('commit')}/><Button title="Retry / resume" variant="secondary" disabled={busy||!['FAILED','PARTIAL','CANCELLED'].includes(job.status)} onPress={()=>jobAction('retry')}/><Button title="Cancel" variant="ghost" disabled={busy||['CANCELLED','COMPLETED'].includes(job.status)} onPress={()=>jobAction('cancel')}/><Button title="Download result report" variant="ghost" onPress={()=>void act(async()=>exportFile('question-import-report.json',JSON.stringify(await downloadImportReport(job.id),null,2),'application/json'))}/></View>
          {text('Importing creates drafts. Academic approval and assignment to schools require separate authorized actions.',true)}
          {job.preview?.releaseFrozen?text('This chapter is already released. Corrections create new draft revisions; released questions and existing papers stay frozen.',true):null}
        </View>:null}
      </Card>:null}
      {tab==='history'?<Card><Text style={[typography.h3,{color:colors.textPrimary}]}>Your imports</Text>{history.length?history.map(h=><View key={h.id} style={styles.row}><View style={{flex:1}}>{text(h.package_id)}{text(`${h.status} · ${h.created_at}`,true)}</View><Button title="Resume / report" variant="ghost" onPress={()=>void act(async()=>{setJob(await qbGet(`/imports/${h.id}`));await AsyncStorage.setItem(storageKey,h.id);setTab('import');})}/></View>):text('No imports yet.')}</Card>:null}
      {tab==='paper'?<Card><Text style={[typography.h3,{color:colors.textPrimary}]}>Paper selection</Text><Input label="Paper title" value={paperTitle} onChangeText={setPaperTitle}/>{text(`${picked.length} questions · ${marks} marks`)}{picked.map(q=><View key={q.id} style={styles.row}>{text(`${q.code} · ${q.pedagogical_type} · ${q.marks} marks`)}<Button title="Remove" variant="ghost" onPress={()=>onSelect(q)}/></View>)}
        {conflicts.length?<View style={{gap:8}}>{conflicts.map(c=><View key={c.groupId}>{text(c.codes.join(', '))}{text(c.reason,true)}</View>)}<Input label="Explain why these questions can be selected together (at least 10 characters)" multiline value={resolutionReason} onChangeText={setResolutionReason}/></View>:null}
        <View style={styles.wrap}><Button title="Student paper preview" disabled={busy||!picked.length} onPress={()=>makePaper(false)}/><Button title="Protected teacher key" variant="secondary" disabled={busy||!picked.length} onPress={()=>makePaper(true)}/><Button title="Clear selection" variant="ghost" onPress={()=>{setSelected({});setConflicts([]);}}/></View>
      </Card>:null}
      {tab==='assets'?<Card><Text style={[typography.h3,{color:colors.textPrimary}]}>Verified figures</Text>{text('Replace an image from its question editor. A replacement creates a new revision; existing papers keep their original figures.',true)}{assets.map(a=><View key={a.id} style={styles.row}><View style={{flex:1}}>{text(a.title)}{text(`Revision ${a.revision||'pending'} · ${a.mime_type||''} · ${a.size_bytes||0} bytes`,true)}</View><Button title="View usage" variant="ghost" onPress={()=>void act(async()=>setUsage(await qbGet(`/assets/${a.id}/usage`)))}/></View>)}{usage?text(`${usage.questions.length} question revisions · ${usage.releases.length} published references`):null}</Card>:null}
    </ScrollView>}
    <Modal visible={!!detail&&!!draft} transparent animationType="fade" onRequestClose={()=>busy?undefined:dirty?setDiscard(true):(setDetail(null),setDraft(null),setUrls({}))}>
      <View style={[styles.overlay,{backgroundColor:colors.overlay}]}><View style={[styles.editor,{backgroundColor:colors.card,width:width<700?'100%':Math.min(width-64,1100)}]}>
        <View style={[styles.heading,{padding:16}]}><View style={{flex:1}}><Text style={[typography.h3,{color:colors.textPrimary}]}>{detail?.entry.external_code}</Text>{text(`Revision ${detail?.revision} · ${detail?.review_state.replace(/_/g,' ')}`,true)}</View><Button title="Close" disabled={busy} variant="ghost" onPress={()=>dirty?setDiscard(true):(setDetail(null),setDraft(null),setUrls({}))}/></View>
        {error?<View style={[styles.alert,{backgroundColor:colors.errorDim}]}>{text(error)}</View>:null}{notice?<View style={styles.alert}>{text(notice)}</View>:null}
        <ScrollView contentContainerStyle={{padding:20,gap:12}}>
          {draft&&detail?<>
            {discard?<Card>{text('Unsaved changes are still in this editor.')}<View style={styles.wrap}><Button title="Keep editing" onPress={()=>setDiscard(false)}/><Button title="Discard changes" variant="danger" onPress={()=>{setDirty(false);setDetail(null);setDraft(null);setUrls({});setDiscard(false);}}/></View></Card>:null}
            {conflict?<Card>{text(`Compare saved revision ${conflict.revision}`)}{(['title','prompt','type','options','answer','marks','assets'] as const).filter(k=>JSON.stringify(conflict.document[k])!==JSON.stringify(draft[k])).map(k=><View key={k}>{text(`${k==='prompt'?'Question':k}: saved ${JSON.stringify(conflict.document[k])}`)}{text(`Your edit: ${JSON.stringify(draft[k])}`,true)}</View>)}{!historical?<View style={styles.wrap}><Button title="Reload saved version" onPress={()=>{setDetail(conflict);setDraft(conflict.document);setConflict(null);setDirty(false);}}/><Button title="Recover my edits onto current revision" variant="secondary" onPress={()=>{const recovered=recoverQuestionEdits(detail.document,draft,conflict.document);setDraft(recovered.document);setDetail(conflict);setConflict(null);saveKey.current=requestKey();setNotice(`Your edits were recovered; unrelated changes by the other author were preserved.${recovered.conflicts.length?' Both authors changed: '+recovered.conflicts.join(', ')+'. Your values are selected; review before saving.':''}`);}}/></View>:<Button title="Close comparison" variant="ghost" onPress={()=>setConflict(null)}/>}</Card>:null}
            <Input label="Title" editable={can('author')&&!busy} value={draft.title} onChangeText={v=>change(d=>{d.title=v;})}/>
            <Input label="Question" multiline editable={can('author')&&!busy} value={draft.prompt} onChangeText={v=>change(d=>{d.prompt=v;})}/>
            <View style={styles.wrap}><Choice label="Format" value={draft.metadata.bank.pedagogicalType} options={formats.map(value=>({value,label:value}))} onChange={v=>{if(can('author'))change(d=>{d.metadata.bank.pedagogicalType=v;d.type={MCQ:'mcq',VSA:'short_answer',SA:'short_answer',LA:'long_answer'}[v]||'short_answer';if(v==='MCQ'){d.options=d.options||['Option A','Option B','Option C','Option D'];d.metadata.bank.optionIds=['A','B','C','D'];d.answer=0;}else{d.options=undefined;d.answer=typeof d.answer==='string'?d.answer:'';d.metadata.bank.optionIds=[];}});}}/>
              <Input label="Marks" editable={can('author')&&!busy} keyboardType="decimal-pad" value={String(draft.marks)} onChangeText={v=>change(d=>{d.marks=Number(v);})} containerStyle={{width:130}}/>
              <Choice label="Difficulty" value={draft.metadata.bank.difficulty} options={difficulties.map(v=>({label:v,value:v}))} onChange={v=>can('author')&&change(d=>{d.metadata.bank.difficulty=v;})}/><Choice label="Bloom" value={draft.metadata.bank.bloom} options={blooms.map(v=>({label:v,value:v}))} onChange={v=>can('author')&&change(d=>{d.metadata.bank.bloom=v;})}/></View>
            {draft.type==='mcq'?<View>{(draft.options||[]).map((o,i)=><Input key={i} editable={can('author')&&!busy} label={`Option ${draft.metadata.bank.optionIds[i]}`} value={o} onChangeText={v=>change(d=>{d.options![i]=v;})}/>)}<Choice label="Correct option" value={String(typeof draft.answer==='number'?draft.answer:draft.options?.indexOf(draft.answer))} options={(draft.options||[]).map((o,i)=>({label:`${draft.metadata.bank.optionIds[i]} · ${o}`,value:String(i)}))} onChange={v=>can('author')&&change(d=>{d.answer=Number(v);})}/></View>:<Input label="Model answer (teacher only)" multiline editable={can('author')&&!busy} value={String(draft.answer)} onChangeText={v=>change(d=>{d.answer=v;})}/>}
            <Text style={[typography.h4,{color:colors.textPrimary}]}>Marking criteria</Text>
            {(draft.metadata.bank.rubric.criteria||[]).map((c:any,i:number)=><View key={i} style={[styles.wrap,{alignItems:'flex-start'}]}><Input label={`Criterion ${i+1}`} multiline editable={can('author')&&!busy} value={c.criterion} onChangeText={v=>change(d=>{d.metadata.bank.rubric.criteria[i].criterion=v;})} containerStyle={{flex:1,minWidth:200}}/><Input label="Credit" editable={can('author')&&!busy} value={String(c.marks)} keyboardType="decimal-pad" onChangeText={v=>change(d=>{d.metadata.bank.rubric.criteria[i].marks=Number(v);})} containerStyle={{width:110}}/>{can('author')?<Button title="Remove criterion" variant="ghost" onPress={()=>change(d=>{d.metadata.bank.rubric.criteria.splice(i,1);})}/>:null}</View>)}
            {can('author')?<Button title="Add criterion" variant="ghost" onPress={()=>change(d=>{d.metadata.bank.rubric.criteria.push({criterion:'',marks:1});})}/>:null}
            <Input label="Partial-credit guidance" multiline editable={can('author')&&!busy} value={draft.metadata.bank.rubric.partial_credit} onChangeText={v=>change(d=>{d.metadata.bank.rubric.partial_credit=v;})}/>
            <Input label="Accepted alternatives (one per line)" multiline editable={can('author')&&!busy} value={draft.metadata.bank.rubric.accepted_alternatives.join('\n')} onChangeText={v=>change(d=>{d.metadata.bank.rubric.accepted_alternatives=v.split('\n').filter(Boolean);})}/>
            <Input label="Concept references (one per line)" multiline editable={can('author')&&!busy} value={draft.metadata.bank.concepts.join('\n')} onChangeText={v=>change(d=>{d.metadata.bank.concepts=v.split('\n').filter(Boolean);})}/>
            <Text style={[typography.h4,{color:colors.textPrimary}]}>Sources</Text>{draft.metadata.bank.sourceManifest?text(`${draft.metadata.bank.sourceManifest.title_on_title_page} · ${draft.metadata.bank.sourceManifest.edition_evidence} · ${draft.metadata.bank.sourceManifest.medium}`,true):null}{(draft.metadata.bank.sourceReferences||[]).map((r:any,i:number)=><View key={i}>{text(`${r.source_id} · printed p. ${r.printed_page} · PDF p. ${r.pdf_page_1_based}`)}</View>)}
            {text('Working marks follow the authoring plan; they are not an official board marking pattern.',true)}
            <Text style={[typography.h4,{color:colors.textPrimary}]}>Figures</Text><View style={styles.wrap}><Switch accessibilityLabel="Show protected teacher figures" value={teacherView} onValueChange={setTeacherView}/>{text(teacherView?'Teacher figures and annotations are visible':'Student figure preview')}</View>
            {(draft.assets||[]).filter(a=>teacherView||a.role==='student').map((a,i)=><Card key={`${a.assetId}:${a.role}`}><Text style={{color:colors.textPrimary,fontWeight:'600'}}>{a.role==='teacher'?'Teacher annotation — restricted':'Student figure'} · Revision {a.revision}</Text>
              {urls[`${a.assetId}:${a.revision}`]?<Image source={{uri:urls[`${a.assetId}:${a.revision}`]}} accessibilityLabel={a.alt} resizeMode="contain" style={{width:'100%',aspectRatio:a.printWidthMm/a.printHeightMm}}/>:text('Image link expired or not loaded. Close and reopen the question to refresh.',true)}
              <Input label="Accessible description" multiline editable={can('author')&&!busy} value={a.alt} onChangeText={v=>change(d=>{d.assets!.find(x=>x.assetId===a.assetId&&x.role===a.role)!.alt=v;})}/>
              <Choice label="Placement" value={a.placement} options={[{label:'Below question',value:'below_question'},{label:'Above question',value:'above_question'}]} onChange={v=>can('author')&&change(d=>{d.assets!.find(x=>x.assetId===a.assetId&&x.role===a.role)!.placement=v;})}/>
              <View style={styles.wrap}><Input label="Print width (mm)" editable={can('author')&&!busy} value={String(a.printWidthMm)} onChangeText={v=>change(d=>{const l=d.assets!.find(x=>x.assetId===a.assetId&&x.role===a.role)!;l.printWidthMm=Number(v);l.printHeightMm=Number(v)*a.printHeightMm/a.printWidthMm;})}/><Input label="Order" editable={can('author')&&!busy} value={String(a.order)} onChangeText={v=>change(d=>{d.assets!.find(x=>x.assetId===a.assetId&&x.role===a.role)!.order=Number(v);})}/>{can('author')?<Button title="Upload next PNG revision" variant="secondary" disabled={busy} onPress={()=>replaceFigure(a)}/>:null}</View>
            </Card>)}
            {text(`Author content check: ${draft.metadata.bank.verification.content} · Asset check: ${draft.metadata.bank.verification.assets}`,true)}
            <Text style={[typography.h4,{color:colors.textPrimary}]}>Review this saved revision</Text><View style={styles.wrap}><Switch accessibilityLabel="Content checked" value={contentChecked} onValueChange={setContentChecked}/>{text('Content and marking checked')}<Switch accessibilityLabel="Figures checked" value={assetsChecked} onValueChange={setAssetsChecked}/>{text('Student / teacher figures checked')}</View>
            <Input label="Review decision and reason" multiline value={reviewReason} onChangeText={setReviewReason}/><View style={styles.wrap}>{can('review')?<><Button title="Record review" variant="secondary" disabled={busy||dirty||!reviewReason.trim()} onPress={()=>review('reviewed')}/><Button title="Request changes" variant="ghost" disabled={busy||dirty||!reviewReason.trim()} onPress={()=>review('changes_requested')}/></>:null}{can('approve')?<Button title="Approve academically" disabled={busy||dirty||!reviewReason.trim()||!contentChecked||!assetsChecked||detail.review_state!=='reviewed'} onPress={()=>review('approved')}/>:null}</View>
            <Text style={[typography.h4,{color:colors.textPrimary}]}>Revision history</Text>{detail.history.map(h=><View key={h.revision} style={styles.row}>{text(`Revision ${h.revision} · ${h.created_at}`)}<Button title="Compare revision" variant="ghost" disabled={busy} onPress={()=>void act(async()=>{setHistorical(true);setConflict(await qbGet(`/questions/${detail.question_id}`,{revision:h.revision}));})}/></View>)}
            {detail.reviews.map(r=><View key={r.id}>{text(`Revision ${r.revision}: ${r.action} · ${r.reason}`,true)}</View>)}
          </>:null}
        </ScrollView>
        <View style={[styles.wrap,{padding:16,borderTopWidth:1,borderColor:colors.border}]}>{text(dirty?'Unsaved edits':'Saved revision')}{can('author')?<Button title="Save draft revision" disabled={!dirty||busy} loading={busy} onPress={save}/>:null}{progress?text(progress):null}</View>
      </View></View>
    </Modal>
    <Modal visible={!!paper} animationType="slide" onRequestClose={()=>setPaper(null)}><View style={[styles.page,{backgroundColor:colors.background}]}><View style={styles.wrap}><Button title="Close preview" variant="ghost" onPress={()=>setPaper(null)}/><Button title="Download A4 HTML" onPress={()=>paper&&void act(()=>exportFile(paper.teacher?'teacher-key.html':'student-paper.html',paper.html,'text/html'))}/>{text(paper?.teacher?'Protected teacher key':'Student paper')}</View>
      {Platform.OS==='web'&&paper?React.createElement('iframe',{title:'A4 question paper',srcDoc:paper.html,sandbox:'allow-same-origin allow-modals',style:{flex:1,width:'100%',border:0}}):<View style={styles.alert}>{text('Download the A4 HTML to open in your browser and print or save as PDF.')}</View>}
    </View></Modal>
  </View>;
}
const styles=StyleSheet.create({page:{flex:1,minHeight:0,padding:16,gap:14},heading:{flexDirection:'row',alignItems:'center',gap:16},wrap:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12},choice:{minWidth:160,maxWidth:'100%',flexGrow:1,gap:4,marginBottom:12},row:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:12,paddingVertical:14,borderBottomWidth:StyleSheet.hairlineWidth},alert:{padding:14,borderRadius:12,gap:8},overlay:{flex:1,alignItems:'center',justifyContent:'center',padding:12},editor:{maxHeight:'96%',borderRadius:20,overflow:'hidden',flex:1}});
