import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookOpen, ImagePlus, Plus, Save, Layers, Eye } from 'lucide-react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Card } from '../../src/components/ui/Card';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { useToast } from '../../src/components/ui/Toast';
import { ContentDocument, ContentQuestion, ContentSummary, QuestionKind, contentError, documentPayload, emptyDocument, learningContentApi, newId } from '../../src/api/learningContent';

const CATEGORIES: {key:QuestionKind;label:string;hint:string}[] = [
  {key:'example',label:'Examples',hint:'A worked example with its question, answer and explanation.'},
  {key:'activity',label:'Activities',hint:'A hands-on task with the expected answer or outcome.'},
  {key:'exercise',label:'Exercises',hint:'Practice questions with complete answers.'},
  {key:'long_answer',label:'Long answers',hint:'Extended questions with complete model answers.'},
];
type Panel = 'definition' | QuestionKind | 'images' | 'preview' | 'history';
type Identity = {id:string;revision:number};
type CachedDraft = {doc:ContentDocument;identity:Identity|null};
type Revision = {revision:number;created_at:string;actor_id:string};

const LibraryRow = React.memo(function LibraryRow({item,onOpen}:{item:ContentSummary;onOpen:(id:string)=>void}) {
  const {colors,spacing,borderRadius,typography}=useTheme();
  return <View style={{marginBottom:spacing.sm,borderRadius:borderRadius.lg,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,padding:spacing.md}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:spacing.md}}>
      <View style={{flex:1}}><Text style={[typography.h4,{color:colors.textPrimary}]} numberOfLines={2}>{item.title}</Text><Text style={[typography.caption,{color:colors.textSecondary,marginTop:spacing.xs}]}>{[item.subject,item.grade&&`Grade ${item.grade}`,item.language].filter(Boolean).join(' · ')}</Text></View>
      <Button title="Edit topic" variant="outline" onPress={()=>onOpen(item.id)}/>
    </View>
    <Text style={[typography.caption,{color:item.status==='ready'?colors.success:colors.textSecondary,marginTop:spacing.sm}]}>{item.status.toUpperCase()} · {item.subtopic_count} subtopics · {item.question_count} questions · Revision {item.revision}</Text>
  </View>;
});
function Select({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}) {
  const {colors,spacing,borderRadius,typography}=useTheme();
  return <View style={{marginBottom:spacing.sm,minWidth:140,flexGrow:1}}><Text style={[typography.label,{color:colors.textSecondary,marginBottom:spacing.sm}]}>{label}</Text>
    <View style={{borderRadius:borderRadius.md,borderWidth:1,borderColor:colors.border,overflow:'hidden',backgroundColor:colors.surface}}>
      <Picker accessibilityLabel={label} selectedValue={value} onValueChange={v=>onChange(String(v))} dropdownIconColor={colors.textPrimary} style={{height:48,color:colors.textPrimary,backgroundColor:colors.surface,borderWidth:0} as any}>{options.map(o=><Picker.Item key={o.value} label={o.label} value={o.value}/>)}</Picker>
    </View></View>;
}
const options=(values:string[])=>values.map(value=>({value,label:value}));
function MarksInput({value,onChange}:{value:number;onChange:(value:number)=>void}) {
  const [draft,setDraft]=useState(Number.isFinite(value)?String(value):'');
  useEffect(()=>{if(Number.isFinite(value)&&(!draft||Number(draft)!==value))setDraft(String(value));},[value]);
  return <Input animateFocus={false} label="Marks" keyboardType="decimal-pad" value={draft}
    error={!Number.isFinite(value)||value<0||value>1000?'Enter marks from 0 to 1000':undefined}
    onChangeText={v=>{if(!/^\d*(\.\d{0,2})?$/.test(v))return;setDraft(v);onChange(v&&v!=='.'?Number(v):NaN);}}
    containerStyle={{width:120}}/>;
}

export default function ManageContent() {
  const {colors,spacing,borderRadius,typography}=useTheme();
  const {user}=useAuth();
  const {showToast}=useToast();
  const router=useRouter();
  const wide=useWindowDimensions().width>1000;
  const [rows,setRows]=useState<ContentSummary[]>([]);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [subjectFilter,setSubjectFilter]=useState('');
  const [gradeFilter,setGradeFilter]=useState('');
  const [cursor,setCursor]=useState<string|null>(null);
  const [loading,setLoading]=useState(true);
  const [schemaReady,setSchemaReady]=useState(false);
  const [error,setError]=useState('');
  const [editing,setEditing]=useState(false);
  const [doc,setDoc]=useState<ContentDocument>(emptyDocument);
  const [identity,setIdentity]=useState<Identity|null>(null);
  const [panel,setPanel]=useState<Panel>('definition');
  const [scope,setScope]=useState<string|null>(null);
  const [questionId,setQuestionId]=useState<string|null>(null);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [imageUrls,setImageUrls]=useState<Record<string,string>>({});
  const [draft,setDraft]=useState<CachedDraft|null>(null);
  const [cached,setCached]=useState(false);
  const [confirmation,setConfirmation]=useState<{message:string;action:()=>void}|null>(null);
  const [history,setHistory]=useState<Revision[]>([]);
  const [historyCursor,setHistoryCursor]=useState<number|null>(null);
  const [historyLoading,setHistoryLoading]=useState(false);
  const baseline=useRef(JSON.stringify(emptyDocument()));
  const pendingSave=useRef<{signature:string;key:string}|null>(null);
  const generation=useRef(0);
  const draftQueue=useRef(Promise.resolve());
  const draftKey=`learning-content-draft:${user?.id||'unknown'}`;
  const dirty=JSON.stringify(documentPayload(doc))!==baseline.current;
  const area={minHeight:120,textAlignVertical:'top' as const};
  const body=[typography.body,{color:colors.textSecondary,lineHeight:24}];
  const heading=[typography.h3,{color:colors.textPrimary}];
  const row={flexDirection:'row' as const,flexWrap:'wrap' as const,gap:spacing.sm,alignItems:'center' as const};
  const flatCard={shadowOpacity:0,elevation:0,...({boxShadow:'none'} as any)};
  const clearDraft=()=>{draftQueue.current=draftQueue.current.then(()=>AsyncStorage.removeItem(draftKey)).catch(()=>{});setDraft(null);setCached(false);};

  const loadLibrary=useCallback(async(next?:string)=>{
    const run=++generation.current;setLoading(true);setError('');
    try{
      const schema=await learningContentApi.schema();if(run!==generation.current)return;
      setSchemaReady(schema.ready);
      if(!schema.ready)throw new Error('The content library database is not ready. Apply the learning content migration before uploading.');
      const result=await learningContentApi.list({search,status,subject:subjectFilter,grade:gradeFilter,...(next?{cursor:next}:{})});
      if(run!==generation.current)return;
      setRows(prev=>next?[...prev.filter(r=>!result.data.some(n=>n.id===r.id)),...result.data]:result.data);setCursor(result.next_cursor);
    }catch(e){if(run===generation.current)setError(contentError(e));}
    finally{if(run===generation.current)setLoading(false);}
  },[search,status,subjectFilter,gradeFilter]);
  useEffect(()=>{const timer=setTimeout(()=>void loadLibrary(),300);return()=>{clearTimeout(timer);generation.current++;};},[loadLibrary]);
  useEffect(()=>{let alive=true;void AsyncStorage.getItem(draftKey).then(raw=>{if(raw&&alive){try{const savedDraft=JSON.parse(raw);if(savedDraft.doc?.subtopics&&savedDraft.doc?.questions)setDraft(savedDraft);}catch{}}}).catch(()=>{});return()=>{alive=false;};},[draftKey]);
  useEffect(()=>{
    if(!editing||!dirty||!user?.id)return;setCached(false);
    const timer=setTimeout(()=>{const value:CachedDraft={doc:documentPayload(doc),identity};draftQueue.current=draftQueue.current.then(()=>AsyncStorage.setItem(draftKey,JSON.stringify(value))).then(()=>{setCached(true);setDraft(value);}).catch(()=>setCached(false));},800);
    return()=>clearTimeout(timer);
  },[doc,editing,dirty,identity,draftKey,user?.id]);
  useEffect(()=>{
    if(!editing)return;let alive=true;
    for(const img of doc.images)void learningContentApi.imageUrl(img.asset_id).then(url=>{if(alive)setImageUrls(prev=>({...prev,[img.asset_id]:url}));}).catch(()=>{});
    return()=>{alive=false;};
  },[editing,identity?.id,panel]);
  const update=<K extends keyof ContentDocument>(key:K,value:ContentDocument[K])=>setDoc(prev=>({...prev,[key]:value}));
  const scopeOptions=useMemo(()=>[{value:'',label:'Entire topic'},...doc.subtopics.map((s,i)=>({value:s.id,label:s.title||`Subtopic ${i+1}`}))],[doc.subtopics]);
  const activeSubtopic=doc.subtopics.find(s=>s.id===scope);
  const visibleQuestions=useMemo(()=>doc.questions.filter(q=>q.subtopic_id===scope&&q.kind===panel),[doc.questions,scope,panel]);
  const question=visibleQuestions.find(q=>q.id===questionId)||visibleQuestions[0];
  const changeQuestion=(patch:Partial<ContentQuestion>)=>{if(question)update('questions',doc.questions.map(q=>q.id===question.id?{...q,...patch}:q));};
  const protect=(action:()=>void)=>{if(dirty)setConfirmation({message:'Discard your unsaved changes and continue?',action:()=>{clearDraft();action();}});else action();};
  const setEditor=(content:ContentDocument,id:Identity|null,recovery=false)=>{
    baseline.current=recovery?JSON.stringify(emptyDocument()):JSON.stringify(documentPayload(content));
    setDoc(documentPayload(content));setIdentity(id);setEditing(true);setPanel('definition');setScope(null);setQuestionId(null);setError('');setCached(false);pendingSave.current=null;
  };
  const openTopic=useCallback(async(id:string)=>{
    const run=++generation.current;
    setLoading(true);setError('');
    try{const content=await learningContentApi.get(id);if(run===generation.current)setEditor(content,{id:content.id,revision:content.revision});}
    catch(e){if(run===generation.current)setError(contentError(e));}finally{if(run===generation.current)setLoading(false);}
  },[]);
  const renderRow=useCallback(({item}:{item:ContentSummary})=><LibraryRow item={item} onOpen={openTopic}/>,[openTopic]);
  const save=async()=>{
    if(saving||uploading)return;setError('');
    const signature=JSON.stringify({doc:documentPayload(doc),identity});
    if(pendingSave.current?.signature!==signature)pendingSave.current={signature,key:newId()};
    setSaving(true);
    try{
      const content=await learningContentApi.save(doc,pendingSave.current.key,identity?.id,identity?.revision);
      baseline.current=JSON.stringify(documentPayload(content));setDoc(documentPayload(content));setIdentity({id:content.id,revision:content.revision});pendingSave.current=null;clearDraft();
      showToast(`Saved to database · Revision ${content.revision}`,'success');void loadLibrary();
    }catch(e){setError(contentError(e));}finally{setSaving(false);}
  };
  const addImage=async()=>{
    if(doc.images.length>=20){setError('A topic supports up to 20 images.');return;}
    setError('');setUploading(true);
    try{
      const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png','image/webp'],copyToCacheDirectory:true,multiple:false});if(result.canceled)return;
      const file=result.assets[0];if(!file.size||file.size>5*1024*1024)throw new Error('Choose an image up to 5 MB.');
      const uploaded=await learningContentApi.uploadImage(file);setImageUrls(prev=>({...prev,[uploaded.asset_id]:uploaded.url}));
      setDoc(prev=>({...prev,images:[...prev.images,{id:newId(),asset_id:uploaded.asset_id,subtopic_id:scope,alt_text:file.name,caption:''}]}));
      showToast('Image uploaded. Add a description, then save the topic.','success');
    }catch(e){setError(contentError(e));}finally{setUploading(false);}
  };
  const loadHistory=async(before?:number)=>{
    if(!identity)return;setHistoryLoading(true);setError('');
    try{const result=await learningContentApi.revisions(identity.id,before);setHistory(prev=>before?[...prev,...result.data]:result.data);setHistoryCursor(result.next_before);}
    catch(e){setError(contentError(e));}finally{setHistoryLoading(false);}
  };
  const switchPanel=(value:Panel)=>{setPanel(value);setQuestionId(null);if(value==='history')void loadHistory();};
  const addQuestion=()=>{
    if(doc.questions.length>=200){setError('A topic supports up to 200 questions.');return;}
    const q:ContentQuestion={id:newId(),subtopic_id:scope,kind:panel as QuestionKind,question:'',answer:'',explanation:'',difficulty:'medium',marks:panel==='long_answer'?5:1,bloom_level:'understand'};
    update('questions',[...doc.questions,q]);setQuestionId(q.id);
  };
  const previewScope=(scopeId:string|null,title:string,definition:string)=><View key={scopeId||'topic'} style={{gap:spacing.md,marginBottom:spacing.xl}}>
    <Text style={heading}>{title||'Untitled topic'}</Text><Text selectable style={[typography.body,{color:colors.textPrimary,lineHeight:26}]}>{definition||'Add a definition.'}</Text>
    {doc.images.filter(i=>i.subtopic_id===scopeId).map(i=><View key={i.id}>{imageUrls[i.asset_id]&&<Image accessibilityLabel={i.alt_text} source={{uri:imageUrls[i.asset_id]}} style={{height:220,width:'100%',borderRadius:borderRadius.md}} resizeMode="contain"/>}<Text style={body}>{i.caption||i.alt_text}</Text></View>)}
    {CATEGORIES.map(c=>{const qs=doc.questions.filter(q=>q.subtopic_id===scopeId&&q.kind===c.key);return qs.length>0&&<View key={c.key} style={{gap:spacing.sm}}><Text style={[typography.h4,{color:colors.primary}]}>{c.label}</Text>{qs.map((q,i)=><View key={q.id} style={{borderLeftWidth:2,borderLeftColor:colors.border,paddingLeft:spacing.md,gap:spacing.sm}}><Text selectable style={[typography.body,{color:colors.textPrimary}]}>{i+1}. {q.question||'Question not entered'}</Text><Text selectable style={body}>Answer: {q.answer||'Answer not entered'}</Text>{q.explanation&&<Text selectable style={body}>{q.explanation}</Text>}<Text style={[typography.caption,{color:colors.textSecondary}]}>{q.difficulty} · {q.marks} marks · {q.bloom_level}</Text></View>)}</View>;})}
  </View>;
  const input=(label:string,value:string,onChangeText:(v:string)=>void,multiline=false)=><Input animateFocus={false} label={label} accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} style={multiline?area:undefined} maxLength={multiline?20000:2000}/>;

  return <View style={{flex:1,gap:spacing.md}}>
    <ScreenHeader title="Content Studio" subtitle="Create once. Reuse across teaching and learning." subtitleColor={colors.textSecondary} rightAction={editing?<Button title="Back to library" variant="ghost" disabled={saving||uploading} onPress={()=>protect(()=>{setEditing(false);setError('');void loadLibrary();})}/>:<Button title="New topic" leftIcon={<Plus size={16} color={colors.textInverse}/>} disabled={!schemaReady||loading} onPress={()=>setEditor(emptyDocument(),null)}/>}/>
    {error&&<View accessibilityRole="alert" style={{padding:spacing.md,backgroundColor:colors.errorDim,borderRadius:borderRadius.md,gap:spacing.sm}}><Text selectable style={[typography.body,{color:colors.error}]}>{error}</Text>{!editing&&<Button title="Retry" variant="outline" onPress={()=>void loadLibrary()}/>} {editing&&identity&&error.includes('Another editor')&&<Button title="Reload database version" variant="outline" onPress={()=>protect(()=>void openTopic(identity.id))}/>}</View>}
    {!editing?<>
      {draft&&<Card variant="outlined" style={{gap:spacing.sm}}><Text style={heading}>An unsaved draft is available</Text><Text style={body}>{draft.doc.title||'Untitled topic'} · Stored on this device</Text><View style={row}><Button title="Recover draft" variant="outline" onPress={()=>{setEditor(draft.doc,draft.identity,true);setDraft(null);}}/><Button title="Discard draft" variant="ghost" onPress={()=>setConfirmation({message:'Permanently discard the draft on this device?',action:clearDraft})}/></View></Card>}
      <View style={{flexDirection:wide?'row':'column',gap:spacing.md}}>
        <Input animateFocus={false} accessibilityLabel="Search topics or tags" placeholder="Search topics or tags…" value={search} onChangeText={setSearch} containerStyle={{flex:wide?2:undefined,marginBottom:0}}/>
        <Input animateFocus={false} accessibilityLabel="Filter by subject" placeholder="Subject" value={subjectFilter} onChangeText={setSubjectFilter} containerStyle={{flex:wide?1:undefined,marginBottom:0}}/>
        <Input animateFocus={false} accessibilityLabel="Filter by grade" placeholder="Grade" value={gradeFilter} onChangeText={setGradeFilter} containerStyle={{flex:wide?1:undefined,marginBottom:0}}/>
        <Select label="Status" value={status} options={[{value:'',label:'All content'},...options(['draft','ready','archived'])]} onChange={setStatus}/>
      </View>
      {loading&&!rows.length?<View style={{gap:spacing.md}}><Skeleton height={100}/><Skeleton height={100}/><Skeleton height={100}/></View>:<FlatList data={rows} renderItem={renderRow} keyExtractor={r=>r.id} windowSize={7} initialNumToRender={8} maxToRenderPerBatch={8} contentContainerStyle={{paddingBottom:spacing.xl}}
        ListEmptyComponent={!error?<EmptyState icon={<BookOpen size={32} color={colors.primary}/>} title={search||subjectFilter||gradeFilter||status?'No matching topics':'Build your content library'} description="Add a topic, then its definitions, subtopics and questions with answers." actionLabel={schemaReady?'New topic':undefined} onAction={()=>setEditor(emptyDocument(),null)}/>:null}
        ListFooterComponent={cursor?<Button title="Load more" variant="outline" loading={loading} onPress={()=>void loadLibrary(cursor)}/>:null}/>}
      <Button title="School enrichment programs" variant="ghost" onPress={()=>router.push('/(app)/content-programs' as any)}/>
    </>:<>
      <View style={[row,{justifyContent:'space-between'}]}><Text style={[typography.caption,{color:colors.textSecondary}]}>{identity?`Revision ${identity.revision}`:'New topic'} · {dirty?(cached?'Draft saved on this device':'Unsaved changes'):identity?'Saved content':'Start writing'} · {doc.questions.length} questions</Text>
        <View pointerEvents={saving||uploading?'none':'auto'}><Select label="Content status" value={doc.status} options={[{value:'draft',label:'Draft'},{value:'ready',label:'Ready for reuse'},{value:'archived',label:'Archived'}]} onChange={v=>update('status',v as ContentDocument['status'])}/></View></View>
      <View style={{flex:1,flexDirection:wide?'row':'column',gap:spacing.md}} pointerEvents={saving||uploading?'none':'auto'}>
        <View style={{width:wide?230:undefined,gap:spacing.sm}}>
          <Select label="Writing for" value={scope||''} options={scopeOptions} onChange={v=>{setScope(v||null);setQuestionId(null);}}/>
          <View style={row}><Button title="Add subtopic" variant="outline" disabled={doc.subtopics.length>=50} leftIcon={<Layers size={16} color={colors.primary}/>} onPress={()=>{const s={id:newId(),title:'',definition:''};update('subtopics',[...doc.subtopics,s]);setScope(s.id);setPanel('definition');}}/>
          {scope&&<Button title="Remove subtopic" variant="ghost" onPress={()=>setConfirmation({message:'Remove this subtopic and its questions and image links?',action:()=>{setDoc(prev=>({...prev,subtopics:prev.subtopics.filter(s=>s.id!==scope),questions:prev.questions.filter(q=>q.subtopic_id!==scope),images:prev.images.filter(i=>i.subtopic_id!==scope)}));setScope(null);}})}/>}</View>
          <ScrollView horizontal={!wide} style={wide?{maxHeight:440}:{maxHeight:60}} contentContainerStyle={{flexDirection:wide?'column':'row',gap:spacing.sm,paddingVertical:spacing.sm}}>
            {[{key:'definition',label:'Definition'},...CATEGORIES,{key:'images',label:'Images'},{key:'preview',label:'Preview'},{key:'history',label:'History'}].filter(p=>p.key!=='history'||identity).map(p=><Button key={p.key} title={p.label} variant={panel===p.key?'secondary':'ghost'} onPress={()=>switchPanel(p.key as Panel)} accessibilityState={{selected:panel===p.key}} aria-selected={panel===p.key}/>)}</ScrollView>
          {wide&&<Text style={body}>Ready content needs definitions and complete answers. Drafts can be finished later.</Text>}
        </View>
        <ScrollView style={{flex:1}} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:spacing.md,paddingBottom:spacing.xl}}>
          <Card style={[flatCard,{gap:spacing.md}]}>
            <View style={row}><BookOpen size={20} color={colors.primary}/><Text style={heading}>{panel==='preview'?'Content preview':panel==='history'?'Revision history':activeSubtopic?.title||doc.title||'Your next great lesson'}</Text></View>
            {panel==='definition'&&<>
              {input(scope?'Subtopic':'Topic',activeSubtopic?.title??doc.title,v=>scope?update('subtopics',doc.subtopics.map(s=>s.id===scope?{...s,title:v}:s)):update('title',v))}
              {input('Definition',activeSubtopic?.definition??doc.definition,v=>scope?update('subtopics',doc.subtopics.map(s=>s.id===scope?{...s,definition:v}:s)):update('definition',v),true)}
              {!scope&&<>
                <Text style={heading}>Organize for reuse</Text>
                <View style={{flexDirection:wide?'row':'column',gap:spacing.md}}><View style={{flex:1}}>{input('Subject',doc.subject,v=>update('subject',v))}</View><View style={{flex:1}}>{input('Grade / level',doc.grade,v=>update('grade',v))}</View></View>
                <View style={{flexDirection:wide?'row':'column',gap:spacing.md}}><View style={{flex:1}}>{input('Board / framework',doc.board,v=>update('board',v))}</View><View style={{flex:1}}>{input('Language code (en, te, hi…)',doc.language,v=>update('language',v))}</View></View>
                {input('Tags (comma separated)',doc.tags.join(','),v=>update('tags',v.split(',')))}
                {input('Learning objectives (one per line)',doc.learning_objectives.join('\n'),v=>update('learning_objectives',v.split('\n')),true)}
                {input('Source / attribution',doc.source,v=>update('source',v))}
              </>}
            </>}
            {CATEGORIES.some(c=>c.key===panel)&&<>
              <Text style={body}>{CATEGORIES.find(c=>c.key===panel)?.hint}</Text><View style={row}>{visibleQuestions.map((q,i)=><Button key={q.id} title={String(i+1)} accessibilityLabel={`Edit question ${i+1}`} variant={question?.id===q.id?'secondary':'ghost'} onPress={()=>setQuestionId(q.id)}/>)}<Button title="Add question" variant="outline" onPress={addQuestion}/></View>
              {question?<>
                {input('Question / activity instructions',question.question,v=>changeQuestion({question:v}),true)}
                {input('Answer / expected outcome',question.answer,v=>changeQuestion({answer:v}),true)}
                {input('Explanation / worked steps (optional)',question.explanation,v=>changeQuestion({explanation:v}),true)}
                <View style={row}><Select label="Difficulty" value={question.difficulty} options={options(['easy','medium','hard'])} onChange={v=>changeQuestion({difficulty:v as ContentQuestion['difficulty']})}/><Select label="Bloom level" value={question.bloom_level} options={options(['remember','understand','apply','analyze','evaluate','create'])} onChange={v=>changeQuestion({bloom_level:v as ContentQuestion['bloom_level']})}/><MarksInput key={question.id} value={question.marks} onChange={v=>changeQuestion({marks:v})}/></View>
                <Select label="Move to" value={question.subtopic_id||''} options={scopeOptions} onChange={v=>changeQuestion({subtopic_id:v||null})}/>
                <Button title="Remove question" variant="ghost" onPress={()=>setConfirmation({message:'Remove this question and its answer?',action:()=>update('questions',doc.questions.filter(q=>q.id!==question.id))})}/>
              </>:<EmptyState title="No questions yet" description="Add the first question and its answer."/>}
            </>}
            {panel==='images'&&<>
              <Text style={body}>Illustrations for this topic or subtopic. JPEG, PNG or WebP, up to 5 MB each.</Text><Button title="Upload image" variant="outline" loading={uploading} leftIcon={<ImagePlus size={16} color={colors.primary}/>} onPress={()=>void addImage()}/>
              {doc.images.filter(i=>i.subtopic_id===scope).map(img=><View key={img.id} style={{gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,paddingTop:spacing.md}}>
                {imageUrls[img.asset_id]?<Image accessibilityLabel={img.alt_text} source={{uri:imageUrls[img.asset_id]}} style={{width:'100%',height:200,borderRadius:borderRadius.md}} resizeMode="contain"/>:<Button title="Load image preview" variant="ghost" onPress={()=>void learningContentApi.imageUrl(img.asset_id).then(url=>setImageUrls(prev=>({...prev,[img.asset_id]:url}))).catch(e=>setError(contentError(e)))}/>}
                {input('Image description / alt text',img.alt_text,v=>update('images',doc.images.map(i=>i.id===img.id?{...i,alt_text:v}:i)))}
                {input('Caption',img.caption,v=>update('images',doc.images.map(i=>i.id===img.id?{...i,caption:v}:i)))}
                <Select label="Image belongs to" value={img.subtopic_id||''} options={scopeOptions} onChange={v=>update('images',doc.images.map(i=>i.id===img.id?{...i,subtopic_id:v||null}:i))}/>
                <Button title="Remove image link" variant="ghost" onPress={()=>setConfirmation({message:'Remove this image link from the topic?',action:()=>update('images',doc.images.filter(i=>i.id!==img.id))})}/>
              </View>)}
            </>}
            {panel==='preview'&&<><Text style={body}>{[doc.subject,doc.grade&&`Grade ${doc.grade}`,doc.board,doc.language].filter(Boolean).join(' · ')}</Text>{previewScope(null,doc.title,doc.definition)}{doc.subtopics.map(s=>previewScope(s.id,s.title,s.definition))}</>}
            {panel==='history'&&<>
              <Text style={body}>Every save keeps a snapshot. Restore a snapshot into the editor, then save it as a new revision.</Text>
              {historyLoading&&!history.length?<Skeleton height={100}/>:history.map(h=><View key={h.revision} style={[row,{justifyContent:'space-between'}]}><Text style={body}>Revision {h.revision} · {new Date(h.created_at).toLocaleString()}</Text><Button title="Restore into editor" variant="outline" onPress={()=>setConfirmation({message:`Load revision ${h.revision}? Save to create a new revision.`,action:()=>{void learningContentApi.revision(identity!.id,h.revision).then(result=>{setDoc(documentPayload(result.document));setPanel('preview');setScope(null);}).catch(e=>setError(contentError(e)));}})}/></View>)}
              {historyCursor&&<Button title="Older revisions" variant="ghost" loading={historyLoading} onPress={()=>void loadHistory(historyCursor)}/>}
            </>}
          </Card>
        </ScrollView>
      </View>
      <View style={[row,{justifyContent:'space-between',padding:spacing.md,borderRadius:borderRadius.lg,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border}]}>
        <Text style={[typography.caption,{color:colors.textSecondary,flex:1}]}>{doc.status==='ready'?'Ready content is available for future integrations.':'Save a draft to finish it later.'}</Text><Button title="Preview" variant="ghost" leftIcon={<Eye size={16} color={colors.textSecondary}/>} disabled={saving||uploading} onPress={()=>switchPanel('preview')}/><Button title={doc.status==='ready'?'Save ready content':'Save to database'} loading={saving} disabled={uploading||!schemaReady||(!dirty&&!!identity)} leftIcon={<Save size={16} color={colors.textInverse}/>} onPress={()=>void save()}/>
      </View>
    </>}
    <Modal visible={!!confirmation} transparent animationType="fade" onRequestClose={()=>setConfirmation(null)}><View style={{flex:1,backgroundColor:colors.overlay,justifyContent:'center',alignItems:'center',padding:spacing.xl}}><Card style={{width:'100%',maxWidth:440,gap:spacing.md}}><Text style={heading}>Confirm change</Text><Text style={body}>{confirmation?.message}</Text><View style={row}><Button title="Cancel" variant="ghost" onPress={()=>setConfirmation(null)}/><Button title="Continue" onPress={()=>{const action=confirmation?.action;setConfirmation(null);action?.();}}/></View></Card></View></Modal>
  </View>;
}
