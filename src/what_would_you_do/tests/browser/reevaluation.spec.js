import {test,expect} from './fixtures.js';
async function open(page){await page.goto('./#revisit');await expect(page.getByRole('heading',{name:'同じ問いに、もう一度',exact:true})).toBeVisible();}
async function seed(page){
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer,appendReason}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'answer-history.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    let s=appendAnswer(storage.getState(),catalog.questions.questions.find(q=>q.id==='q003'),'A',{id:'old',now:'2026-01-01T00:00:00Z'});
    const f=catalog.followups.followUps.find(f=>f.id==='fu_reason_conditions');
    s=appendReason(s,'old',f,'impact',{id:'with-reason',now:'2026-01-01T00:00:00Z'});storage.saveState(s);
  });await page.reload();
}
test('empty revisit offers a first answer without automatic scheduling',async({page})=>{
  await open(page);await expect(page.getByText('最初の答えを残すところから')).toBeVisible();
  await page.getByRole('link',{name:'過去の自分',exact:true}).click();
  await page.getByRole('link',{name:'以前の答えを見る前に、同じ問いに答える →'}).click();
  await expect(page.getByRole('heading',{name:'同じ問いに、もう一度',exact:true})).toBeVisible();
});
test('old reasons are hidden until submission; same choice can have new reasons and saved insights',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);await seed(page);
  await expect(page.locator('reevaluation-view')).not.toContainText('結果やその後への影響を考えた');
  await page.locator('a[href="#revisit?answer=with-reason"]').click();
  await expect(page.getByRole('radio',{checked:true})).toHaveCount(0);
  await expect(page.locator('reevaluation-view')).not.toContainText('結果やその後への影響を考えた');
  await expect(page.getByRole('article',{name:'以前の回答',exact:true})).toHaveCount(0);
  await page.getByRole('radio').first().focus();await page.keyboard.press('Space');
  const reason='<img src=x onerror=alert(1)> 今は責任を大切にした。';
  await page.getByLabel('今、この答えを選んだ理由（任意）').fill(reason);
  await page.getByRole('button',{name:'今の答えを残して、見比べる'}).click();
  await expect(page.getByRole('article',{name:'以前の回答',exact:true})).toContainText('結果やその後への影響を考えた');
  await expect(page.getByRole('article',{name:'今回の回答',exact:true})).toContainText(reason);
  await expect(page.getByText('今回は、以前と同じ選択でした。理由も同じでしょうか。')).toBeVisible();
  await page.getByRole('radio',{name:'答えは同じでも、理由は変わった',exact:true}).check();
  await page.getByLabel('見比べて気づいたこと（任意）').fill('<script>alert(1)</script> 別の理由に気づいた');
  await page.getByRole('button',{name:'気づきを記録する'}).click();
  await page.reload();await expect(page.getByRole('region',{name:'この問いでの気づき'})).toContainText('別の理由に気づいた');
  await expect(page.locator('reevaluation-view img, reevaluation-view script')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('reevaluation.png'),fullPage:true});
  const saved=await page.evaluate(()=>location.hash);
  await page.getByRole('link',{name:'問いの一覧へ戻る'}).click();
  await page.locator('a[href^="#revisit?answer="]').click();await page.getByRole('radio').nth(1).check();
  await page.getByRole('button',{name:'今の答えを残して、見比べる'}).click();
  await expect(page.getByText('今回は、以前とは別の選択でした。何が影響したのでしょうか。')).toBeVisible();
  await expect(page.getByRole('article',{name:'以前の回答',exact:true})).toContainText(reason);
  await page.goto('./'+saved);await expect(page.getByRole('region',{name:'この問いでの気づき'})).toContainText('別の理由に気づいた');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).reevaluations.length)).toBe(2);
  await page.goto('./#revisit?answer=with-reason');
  await expect(page.getByText('この記録は見つからないか、すでに新しい回答が残っています。一覧から問いを選び直してください。')).toBeVisible();
  await expect(page.getByRole('button',{name:'今の答えを残して、見比べる'})).toHaveCount(0);
  expect(errors).toEqual([]);
});
