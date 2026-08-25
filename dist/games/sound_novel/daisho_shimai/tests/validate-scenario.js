import fs from "node:fs"; import path from "node:path"; import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),".."), dd=path.join(root,"assets","data");
const R=p=>JSON.parse(fs.readFileSync(p,"utf8")), game=R(path.join(dd,"game.json")), chars=R(path.join(dd,"characters.json")),
bgs=R(path.join(dd,"backgrounds.json")), evidence=R(path.join(dd,"evidence.json")), spec=R(path.join(dd,"flags.json"));
let scenes=new Map(),links=[],speakers=new Set(),br=new Set(),er=new Set(),choices=0,deductions=0,errors=[];
for(const rel of game.scenario_files){for(const s of R(path.join(dd,rel)).scenes??[]){if(scenes.has(s.id))errors.push("duplicate "+s.id);scenes.set(s.id,s);
if(s.background)br.add(s.background);if(s.next)links.push([s.id,s.next]);for(const e of s.events??[]){if(e.type==="dialogue")speakers.add(e.speaker);
if(e.type==="image")er.add(e.id);if(e.type==="choice")choices++;if(e.type==="deduction")deductions++;if(e.type==="jump"&&e.target)links.push([s.id,e.target]);
if(e.type==="choice")for(const o of e.options??[])if(o.jump)links.push([s.id,o.jump]);}}}
if(scenes.size!==50)errors.push("scene "+scenes.size); if(choices!==5)errors.push("choices "+choices); if(deductions!==1)errors.push("deductions "+deductions);
if(!(spec.persistent_variables??[]).includes("truth_answer"))errors.push("truth_answer"); if(!Object.keys(spec.flags??{}).length||!Object.keys(spec.variables??{}).length)errors.push("empty state");
if(Object.keys(bgs).length!==20)errors.push("backgrounds "+Object.keys(bgs).length); if(Object.keys(evidence).length!==9)errors.push("evidence "+Object.keys(evidence).length);
for(const [a,b] of links)if(!scenes.has(b))errors.push(`broken ${a}->${b}`);for(const x of speakers)if(!chars[x])errors.push("speaker "+x);
for(const x of br)if(!bgs[x])errors.push("bg "+x);for(const x of er)if(!evidence[x])errors.push("evidence "+x);
const graph=new Map([...scenes.keys()].map(x=>[x,[]]));for(const [a,b]of links)graph.get(a)?.push(b);let seen=new Set(),st=[game.start_scene];
while(st.length){let x=st.pop();if(!x||seen.has(x)||!scenes.has(x))continue;seen.add(x);st.push(...graph.get(x));}for(const x of scenes.keys())if(!seen.has(x))errors.push("unreachable "+x);
console.log(`Scenes: ${scenes.size}\nChoices: ${choices}\nDeductions: ${deductions}\nBackground slots: ${Object.keys(bgs).length}\nEvidence/CG slots: ${Object.keys(evidence).length}\nPersistent: ${spec.persistent_variables.join(", ")}`);
if(errors.length){errors.forEach(e=>console.error("FAIL: "+e));process.exit(1)}console.log("PASS: ⑤-2 specification and structural checks passed");
