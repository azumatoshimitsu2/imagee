import {test,expect} from './fixtures.js';
async function open(page){await page.goto('./#past');await expect(page.getByRole('heading',{name:'過去の自分',exact:true})).toBeVisible();}
test('five clear entries work with no history and offer no fictional resume links',async({page})=>{
  await open(page);await expect(page.locator('.hub-card')).toHaveCount(5);
  await expect(page.locator('.hub-resume')).toHaveCount(0);
  const routes=[['あの頃の答えを読む','#past?view=records'],['二つの判断を見比べる','#compare'],['条件を変えて考える','#boundary'],['同じ問いにもう一度答える','#revisit'],['自分の言葉を読み返す','#words']];
  for(const [name,hash] of routes){
    const card=page.getByRole('article',{name,exact:true});await card.locator('.hub-primary').focus();await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(hash.replace(/[?]/g,'\\?')+'$'));
    await page.getByRole('link',{name:'過去の自分',exact:true}).click();
  }
  await expect(page.getByRole('link',{name:'問いを読む',exact:true})).toBeVisible();
});
test('saved reflections supply real resume routes while keeping the blind re-answer entry private',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer},{appendDialogue},{appendComparison,comparisonRecords},{appendReevaluation},{appendWordEntry}]=await Promise.all(['data-loader.js','storage.js','answer-history.js','dialogue-engine.js','comparison-engine.js','reevaluation-engine.js','word-engine.js'].map(p=>import(base+p)));
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});let s=storage.getState();
    for(const name of ['q003','q024','q004','q005','q006','q008','q009','q010','q012','q016'])s=appendAnswer(s,catalog.questions.questions.find(q=>q.id===name),'A',{id:name,now:'2026-01-01T00:00:00Z'});
    s=appendComparison(s,catalog,{comparisonId:comparisonRecords(s,catalog)[0].id,stanceId:'context',text:'比較した記録',now:'2026-01-02T00:00:00Z',id:'comparison-note'});
    s=appendReevaluation(s,catalog.followups.reevaluationDialogue,{previousAnswerId:'q003',optionId:'A',reason:'一覧には見せない再回答の理由',id:'revisit',answerId:'again',now:'2026-01-03T00:00:00Z'});
    s=appendAnswer(s,catalog.questions.questions.find(q=>q.id==='q031'),'A',{id:'boundary-one',source:'boundary',now:'2026-01-04T00:00:00Z'});
    s.reflections.push({id:'words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'自由とは？',text:'自分で選べること',createdAt:'2026-01-01T00:00:00Z',distinctQuestionsAtCreation:0,parentReflectionId:null,returnPolicyId:null});
    s=appendWordEntry(s,catalog.followups.wordDialogue,{sourceReflectionId:'words',stanceId:'same',text:'今も選ぶことを大切にする',id:'word-entry',now:'2026-01-04T00:00:00Z'});
    s=appendDialogue(s,catalog.followups.manualDialogue,{sourceType:'answer',sourceId:'q006',stanceId:'same',text:'返事の記録',id:'reply',now:'2026-01-05T00:00:00Z'});
    storage.saveState(s);
  });await page.reload();await expect(page.locator('.hub-resume')).toHaveCount(5);
  const before=await page.evaluate(()=>localStorage.getItem('selfDialogueGame:v1'));
  await expect(page.locator('.past-hub')).not.toContainText('一覧には見せない再回答の理由');
  await expect(page.locator('.past-record')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('reflection-hub.png'),fullPage:true});
  const cases=[['あの頃の答えを読む','続きから読む','これまでの返事'],['二つの判断を見比べる','続きから読む','これまでの振り返り'],['条件を変えて考える','続きから考える','条件ごとの回答'],['同じ問いにもう一度答える','見比べた記録を読む','以前の回答'],['自分の言葉を読み返す','続きから読む','この問いに残した言葉']];
  for(const [name,label,content] of cases){
    await page.getByRole('article',{name,exact:true}).getByRole('link',{name:label,exact:true}).click();
    await expect(page.getByText(content,{exact:true}).first()).toBeVisible().catch(async()=>{await expect(page.locator(`[aria-label="${content}"]`)).toBeVisible();});
    await page.getByRole('link',{name:'過去の自分',exact:true}).click();
    await expect(page.locator('.hub-card')).toHaveCount(5);
  }
  expect(await page.evaluate(()=>localStorage.getItem('selfDialogueGame:v1'))).toBe(before);
  expect(errors).toEqual([]);
});
