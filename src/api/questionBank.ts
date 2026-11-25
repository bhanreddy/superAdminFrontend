import {superAdminClient as client} from './superAdminClient';
import {requestKey} from './books';
import type {DocumentPickerAsset} from 'expo-document-picker';
import {Platform} from 'react-native';
import * as FileSystem from 'expo-file-system';

export const QUESTION_BANK_BASE='/api/super-admin/question-bank';
export const QB_PERMISSIONS={read:'curriculum.questions.read',author:'curriculum.questions.author',import:'curriculum.questions.import',review:'curriculum.questions.review',approve:'curriculum.questions.approve'};
export interface AssetLink {assetId:string;revision:number;checksum:string;role:'student'|'teacher';placement:string;order:number;alt:string;printWidthMm:number;printHeightMm:number;optionId?:string;subpartId?:string;panel?:string;pairId?:string}
export interface QuestionDocument {schemaVersion:1;title:string;type:string;prompt:string;options?:string[];answer:any;marks:number;language:string;learningOutcomeIds:string[];assets?:AssetLink[];metadata:Record<string,any>}
export interface BankRow {id:string;code:string;title:string;revision:number;checksum:string;pedagogical_type:string;difficulty:string;bloom:string;review_state:string;marks:string;visual:boolean;student_assets:number}
export interface QuestionDetail {question_id:string;revision:number;checksum:string;document:QuestionDocument;entry:any;history:{revision:number;checksum:string;created_at:string}[];reviews:any[];review_state:string}
export interface Destination {chapter_id:string;chapter_title:string;product_id?:string;version_id:string;version_label:string;release_name:string;version_status:string;product:string;board:string;grade:string;subject:string;language:string}
export interface ImportJob {id:string;status:string;preview:any;results:Record<string,any>;counts?:{imported:number;blocked:number};last_error?:string;attempts?:number;created_at?:string}
export const qbGet=async<T=any>(path:string,params?:object):Promise<T>=>(await client.get(`${QUESTION_BANK_BASE}${path}`,{params})).data.data;
export const qbPost=async<T=any>(path:string,body:unknown={},key=requestKey()):Promise<T>=>(await client.post(`${QUESTION_BANK_BASE}${path}`,body,{headers:{'Idempotency-Key':key}})).data.data;
export const qbSave=async(id:string,document:QuestionDocument,base:{revision:number;checksum:string},key:string)=>(await client.put(`${QUESTION_BANK_BASE}/questions/${id}`,{document,base},{headers:{'Idempotency-Key':key}})).data.data;
export function qbError(error:any):string {
  const body=error?.response?.data;
  return [body?.error||error?.message||'Connection lost. Retry the operation.',...(Array.isArray(body?.details)?body.details.map((d:any)=>typeof d==='string'?d:`${d.field||d.path||''}: ${d.message||d.reason||''}`):[])].join('\n');
}
export function qbFileForm(asset:DocumentPickerAsset) {
  const form=new FormData();
  if(Platform.OS==='web'&&asset.file)form.append('bundle',asset.file,asset.name);
  else form.append('bundle',{uri:asset.uri,name:asset.name,type:asset.mimeType||'application/zip'} as any);
  return form;
}
export async function previewBundle(asset:DocumentPickerAsset,destination:Destination,key:string,onProgress:(n:number)=>void) {
  const form=qbFileForm(asset);form.append('destination',JSON.stringify({chapterId:destination.chapter_id,versionId:destination.version_id,language:destination.language}));
  return (await client.post(`${QUESTION_BANK_BASE}/imports/preview`,form,{headers:{'Idempotency-Key':key},timeout:120000,
    onUploadProgress:e=>onProgress(e.total?Math.round(e.loaded/e.total*100):0)})).data.data as ImportJob;
}
export async function downloadImportReport(id:string) {
  const response=await client.get(`${QUESTION_BANK_BASE}/imports/${id}/report`);return response.data.data||response.data;
}
export async function pickedBytes(asset:DocumentPickerAsset):Promise<Uint8Array> {
  if(Platform.OS==='web')return new Uint8Array(await (asset.file?asset.file.arrayBuffer():(await fetch(asset.uri)).arrayBuffer()));
  const encoded=await FileSystem.readAsStringAsync(asset.uri,{encoding:FileSystem.EncodingType.Base64});
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',data:number[]=[];let bits=0,value=0;
  for(const char of encoded){const n=alphabet.indexOf(char);if(n<0)continue;value=(value<<6)|n;bits+=6;if(bits>=8){bits-=8;data.push((value>>>bits)&255);}}
  return Uint8Array.from(data);
}
export async function uploadQuestionFigure(asset:DocumentPickerAsset,link:AssetLink,hash:string,bytes:Uint8Array,onProgress:(s:string)=>void) {
  onProgress('Preparing verified upload…');
  const upload=await qbPost('/assets/uploads',{assetId:link.assetId,audience:link.role,title:asset.name,filename:asset.name,mime:'image/png',size:bytes.length,checksum:hash});
  if(upload.status!=='READY'){
    onProgress('Uploading PNG…');const response=await fetch(upload.upload_url,{method:'PUT',headers:{'content-type':'image/png'},body:bytes as any});
    if(!response.ok)throw new Error(`Upload failed (${response.status}). Retry to create a new session.`);
  }
  onProgress('Checking image bytes and dimensions…');return qbPost(`/assets/uploads/${upload.upload_id}/confirm`);
}
