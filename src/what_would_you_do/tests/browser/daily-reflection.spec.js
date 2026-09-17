import {test,expect} from './fixtures.js';
const now=new Date('2026-09-16T12:00:00Z');
async function prepare(page,kind='answer'){
  await page.clock.setFixedTime(now);await page.goto('./#past');
  await expect(page.getByRole('heading',{name:'過去の自分',exact:true})).toBeVisible();
  await page.evaluate(async kind=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'answer-history.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});let state=storage.getState();
    if(kind==='words') state.reflections.push({id:'words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'あなたにとって自由とは何ですか？',text:'自分で選べること。',createdAt:'2026-01-01T00:00:00Z',distinctQuestionsAtCreation:0,parentReflectionId:null,returnPolicyId:null});
    else state=appendAnswer(state,catalog.questions.questions.find(q=>q.id==='q003'),'A',{id:'old',now:kind==='recent'?'2026-09-15T12:00:00Z':'2026-01-01T00:00:00Z'});
    storage.saveState(state);
  },kind);await page.reload();await page.getByRole('link',{name:'ホーム',exact:true}).click();
}
test('old answer suggestion hides its choice, stays fixed, and can be dismissed across reloads',async({page})=>{
  await prepare(page);const card=page.getByRole('article',{name:'今日の振り返り提案'});
  await expect(card).toContainText('会社のルール');await expect(card).not.toContainText('今回は例外で対応し');
  await expect(card).toHaveCount(1);
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).dailyReflections[0].id);
  await page.reload();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).dailyReflections[0].id)).toBe(original);
  await page.screenshot({path:test.info().outputPath('daily-reflection.png'),fullPage:true});
  await card.getByRole('button',{name:'今日は見送る'}).click();await page.reload();
  await expect(card).toContainText('今日の提案は見送りました。');await expect(card.getByRole('button')).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-09-17T12:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(card).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).answers.length)).toBe(1);
});
test('suggestion opens blind re-answer and is not replaced after completion',async({page})=>{
  await prepare(page);await page.getByRole('button',{name:'今の考えで答える',exact:true}).click();
  await expect(page.getByRole('heading',{name:'会社のルール',exact:true})).toBeVisible();
  await expect(page.getByRole('radio',{checked:true})).toHaveCount(0);
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'今の答えを残して、見比べる'}).click();
  await page.getByRole('link',{name:'ホーム',exact:true}).click();
  await expect(page.getByRole('article',{name:'今日の振り返り提案'})).toContainText('今日ご案内した記録は更新されました。');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).dailyReflections.length)).toBe(1);
});
test('recent records have no suggestion; old words lead to their timeline',async({page})=>{
  await prepare(page,'recent');await expect(page.getByRole('article',{name:'今日の振り返り提案'})).toHaveCount(0);
  await page.evaluate(()=>localStorage.removeItem('selfDialogueGame:v1'));await page.reload();
  await prepare(page,'words');await page.getByRole('button',{name:'書いた言葉を読み返す'}).click();
  await expect(page.getByRole('heading',{name:'言葉の足あと',exact:true})).toBeVisible();
  await expect(page.getByRole('list',{name:'この問いに残した言葉'})).toContainText('自分で選べること。');
});
