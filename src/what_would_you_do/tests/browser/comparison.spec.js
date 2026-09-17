import {test,expect} from './fixtures.js';
async function open(page){await page.goto('./#compare');await expect(page.getByRole('heading',{name:'二つの答えを見比べる',exact:true})).toBeVisible();}
async function seed(page){
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer,appendReason}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'answer-history.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    let state=storage.getState();
    for(const name of ['q003','q024','q004','q005','q006','q008','q009','q010','q012','q016']) {
      const q=catalog.questions.questions.find(q=>q.id===name);
      state=appendAnswer(state,q,'A',{id:name,now:'2026-01-01T00:00:00Z'});
    }
    const f=catalog.followups.followUps.find(f=>f.id==='fu_reason_conditions');
    state=appendReason(state,'q003',f,'impact',{id:'with-reason',now:'2026-01-02T00:00:00Z'});
    storage.saveState(state);
  });await page.reload();
}
test('empty comparisons and past-screen entry',async({page})=>{
  await open(page);await expect(page.getByText('二つの答えがそろうまで')).toBeVisible();
  await page.getByRole('link',{name:'過去の自分',exact:true}).click();
  await page.getByRole('link',{name:'関連する二つの答えを見比べる →'}).click();
  await expect(page.getByRole('heading',{name:'二つの答えを見比べる',exact:true})).toBeVisible();
});
test('compare actual reasons, preserve a reply and reread after revision and import',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);await seed(page);
  await page.getByRole('link',{name:'あなたの地図',exact:true}).click();
  await page.getByRole('link',{name:'二つの答えを見比べて、振り返る →'}).click();
  await expect(page.locator('.comparison-answer')).toHaveCount(2);
  await expect(page.locator('.comparison-pair')).toContainText('当時の理由');
  await expect(page.locator('.comparison-pair')).toContainText('結果やその後への影響を考えた');
  const route=await page.evaluate(()=>location.hash);
  await page.getByRole('radio',{name:'状況が違う',exact:true}).focus();await page.keyboard.press('Space');
  const words='<img src=x onerror=alert(1)> 守ろうとした相手が違います。';
  await page.getByLabel('あなたの言葉で振り返る（任意）').fill(words);
  await page.getByRole('button',{name:'振り返りを記録する'}).click();
  await expect(page.getByRole('region',{name:'これまでの振り返り'})).toContainText(words);
  await expect(page.getByRole('button',{name:'振り返りを記録する'})).toBeDisabled();
  await page.reload();await expect(page.getByRole('region',{name:'これまでの振り返り'})).toContainText(words);
  await expect(page.locator('comparison-view img')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('comparison.png'),fullPage:true});
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{reviseAnswer}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'answer-history.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    const state=storage.getState();storage.saveState(reviseAnswer(state,'with-reason','B',{id:'revised'}));
    const exported=storage.exportJSON();storage.clear();storage.importJSON(exported);
  });await page.reload();
  expect(await page.evaluate(()=>location.hash)).toBe(route);
  await expect(page.locator('.comparison-pair')).toContainText('今回は例外で対応し');
  await expect(page.getByRole('region',{name:'これまでの振り返り'})).toContainText(words);
  await page.getByRole('radio',{name:'まだ分からない',exact:true}).check();
  await page.getByRole('button',{name:'振り返りを記録する'}).click();
  await expect(page.getByRole('region',{name:'これまでの振り返り'}).locator('article')).toHaveCount(2);
  expect(errors).toEqual([]);
});
