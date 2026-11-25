const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const same=(a:any,b:any)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
/** Recover only local changes onto the current server revision. Fields changed
 * by another author alone stay intact; conflicting fields are shown explicitly. */
export function recoverQuestionEdits<T>(base:T,local:T,current:T):{document:T;conflicts:string[]}{
  const conflicts:string[]=[];
  const merge=(b:any,l:any,c:any,path:string):any=>{
    if(same(b,l))return c;if(same(b,c)||same(l,c))return l;
    if(b&&l&&c&&typeof b==='object'&&typeof l==='object'&&typeof c==='object'&&![b,l,c].some(Array.isArray))return Object.fromEntries([...new Set([...Object.keys(b),...Object.keys(l),...Object.keys(c)])].map(k=>[k,merge(b[k],l[k],c[k],path?`${path}.${k}`:k)]));
    conflicts.push(path);return l;
  };
  return {document:merge(base,local,current,''),conflicts};
}
