import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { superAdminClient } from './superAdminClient';

export type QuestionKind = 'example' | 'activity' | 'exercise' | 'long_answer';
export interface ContentQuestion {
  id: string; subtopic_id: string | null; kind: QuestionKind;
  question: string; answer: string; explanation: string;
  difficulty: 'easy' | 'medium' | 'hard'; marks: number;
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
}
export interface ContentImage { id: string; asset_id: string; subtopic_id: string | null; alt_text: string; caption: string }
export interface ContentSubtopic { id: string; title: string; definition: string }
export interface ContentDocument {
  title: string; definition: string; subject: string; grade: string; board: string; language: string;
  tags: string[]; learning_objectives: string[]; source: string;
  status: 'draft' | 'ready' | 'archived'; metadata: Record<string, unknown>;
  subtopics: ContentSubtopic[]; questions: ContentQuestion[]; images: ContentImage[];
}
export interface SavedContent extends ContentDocument { id: string; revision: number; updated_at: string }
export interface ContentSummary { id: string; title: string; subject: string; grade: string; language: string; status: ContentDocument['status']; revision: number; subtopic_count: number; question_count: number; updated_at: string }
export const newId = (): string => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3)|8).toString(16);});
export const emptyDocument = (): ContentDocument => ({title:'',definition:'',subject:'',grade:'',board:'',language:'en',tags:[],learning_objectives:[],source:'',status:'draft',metadata:{},subtopics:[],questions:[],images:[]});
// Strip server fields so strict validation and idempotent retries use one shape.
export function documentPayload(doc: ContentDocument): ContentDocument {
  return {title:doc.title,definition:doc.definition,subject:doc.subject,grade:doc.grade,board:doc.board,language:doc.language,tags:doc.tags.map(t=>t.trim()).filter(Boolean),
    learning_objectives:doc.learning_objectives.map(t=>t.trim()).filter(Boolean),source:doc.source,status:doc.status,metadata:doc.metadata,subtopics:doc.subtopics,questions:doc.questions,images:doc.images};
}
const base = '/api/super-admin/learning-content';
export const learningContentApi = {
  async schema() { return (await superAdminClient.get<{ready:boolean;missing:string[]}>(`${base}/schema`)).data; },
  async list(params: {search?:string;subject?:string;grade?:string;language?:string;status?:string;cursor?:string}) {
    return (await superAdminClient.get<{data:ContentSummary[];next_cursor:string|null}>(base,{params})).data;
  },
  async get(id:string) { return (await superAdminClient.get<SavedContent>(`${base}/${id}`)).data; },
  async save(doc:ContentDocument,key:string,id?:string,revision?:number) {
    const payload = {...documentPayload(doc),...(id?{expected_revision:revision}:{})};
    return (await superAdminClient.request<SavedContent>({url:id?`${base}/${id}`:base,method:id?'PUT':'POST',data:payload,headers:{'Idempotency-Key':key}})).data;
  },
  async revisions(id:string,before?:number) {
    return (await superAdminClient.get<{data:{revision:number;actor_id:string;created_at:string}[];next_before:number|null}>(`${base}/${id}/revisions`,{params:{before}})).data;
  },
  async revision(id:string,revision:number) { return (await superAdminClient.get<{document:ContentDocument}>(`${base}/${id}/revisions/${revision}`)).data; },
  async imageUrl(id:string) { return (await superAdminClient.get<{url:string}>(`${base}/images/${id}`)).data.url; },
  async uploadImage(file:DocumentPickerAsset) {
    const {data:signed} = await superAdminClient.post<{asset_id:string;signed_url:string}>(`${base}/images/sign-upload`,{filename:file.name,mime_type:file.mimeType,size:file.size});
    if (Platform.OS==='web') {
      const blob=file.file || await (await fetch(file.uri)).blob();
      const result=await fetch(signed.signed_url,{method:'PUT',headers:{'Content-Type':file.mimeType || 'application/octet-stream'},body:blob,signal:AbortSignal.timeout(60000)});
      if (!result.ok) throw new Error('Image upload failed. Select the image again to retry.');
    } else {
      const result=await FileSystem.uploadAsync(signed.signed_url,file.uri,{httpMethod:'PUT',uploadType:FileSystem.FileSystemUploadType.BINARY_CONTENT,headers:{'Content-Type':file.mimeType || 'application/octet-stream'}});
      if (result.status<200||result.status>=300) throw new Error('Image upload failed. Select the image again to retry.');
    }
    return (await superAdminClient.post<{asset_id:string;url:string}>(`${base}/images/${signed.asset_id}/confirm`,{})).data;
  },
};
export function contentError(error:unknown) { return (error as any)?.response?.data?.error || (error as Error)?.message || 'Could not save content. Retry.'; }
