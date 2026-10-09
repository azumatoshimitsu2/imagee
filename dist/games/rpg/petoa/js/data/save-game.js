export const SAVE_KEY='petoa.save.v1';
export const SAVE_SCENES=['UpetoaVillageScene','PetoaIslandScene','PetoaBeachScene','PetoaForestScene','PetoaForestNightScene','PetoaCaveScene','PetoaForestMorningScene','UpetoaVillageReturnScene','UpetoaChiefMorningScene','UpetoaHarborAttackScene','PetoaSeaEscapeScene','MainlandLandingScene','BazaarCityScene','BazaarUneaseScene','VektenaChaseScene','VektenaCityScene','YuateaEntranceScene','YuateaChancellorScene'];
const forbidden=new Set(['__proto__','constructor','prototype']);
export function encodeSave(value){
 if(value instanceof Set)return {$set:[...value].map(encodeSave)};
 if(Array.isArray(value))return value.map(encodeSave);
 if(value&&typeof value==='object'){const result={};for(const [key,v]of Object.entries(value))if(!forbidden.has(key)&&typeof v!=='function'&&v!==undefined)result[key]=encodeSave(v);return result;}
 return typeof value==='number'&&!Number.isFinite(value)?null:value;
}
export function decodeSave(value){
 if(Array.isArray(value))return value.map(decodeSave);
 if(value&&typeof value==='object'){if(Object.keys(value).length===1&&Array.isArray(value.$set))return new Set(value.$set.map(decodeSave));const result={};for(const [key,v]of Object.entries(value))if(!forbidden.has(key))result[key]=decodeSave(v);return result;}return value;
}
export function readSave(storage){
 try{const raw=storage?.getItem(SAVE_KEY);if(!raw||raw.length>2000000)return null;const s=JSON.parse(raw);
 if(s.version!==1||!SAVE_SCENES.includes(s.scene)||!Number.isFinite(s.savedAt)||!s.registry||typeof s.registry!=='object'||Array.isArray(s.registry)||!s.resume||typeof s.resume!=='object'||typeof s.resume.checkpoint!=='boolean')return null;
 if(s.resume.position&&(!Number.isFinite(s.resume.position.x)||!Number.isFinite(s.resume.position.y)||Math.abs(s.resume.position.x)>100000||Math.abs(s.resume.position.y)>100000))return null;
 return s;}catch{return null;}
}
export function writeSave(storage,snapshot){try{if(!storage)return false;storage.setItem(SAVE_KEY,JSON.stringify(snapshot));return true;}catch{return false;}}
