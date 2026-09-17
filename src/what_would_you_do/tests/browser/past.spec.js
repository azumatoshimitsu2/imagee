import {test,expect} from './fixtures.js';
async function open(page){await page.goto('./#past');await expect(page.getByRole('heading',{name:'過去の自分',exact:true})).toBeVisible();}
async function seed(page){
  await page.evaluate(async()=>{
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer,reviseAnswer}]=await Promise.all([import(base+'data-loader.js'),import(base+'storage.js'),import(base+'answer-history.js')]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    let s=appendAnswer(storage.getState(),catalog.questions.questions.find(q=>q.id==='q003'),'A',{id:'old',now:'2026-01-01T00:00:00Z'});
    s=reviseAnswer(s,'old','B',{id:'new',now:'2026-02-01T00:00:00Z'});
    s.reflections.push({id:'words',followUpId:'fu_self_definition',followUpVersion:1,sourceAnswerId:null,promptSnapshot:'自由とは？',text:'<img src=x onerror=alert(1)>',createdAt:'2026-01-01T00:00:00Z',distinctQuestionsAtCreation:1,parentReflectionId:null,returnPolicyId:null});
    storage.saveState(s);
  });await page.reload();
}
test('empty past screen offers a first question',async({page})=>{
  await open(page);await expect(page.getByText('これから、言葉が届きます。')).toBeVisible();
  await expect(page.getByRole('link',{name:'問いを読む',exact:true})).toBeVisible();
});
test('reply to a superseded answer persists without changing answers; safe free writing',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);await seed(page);
  await page.getByRole('link',{name:'話しかける記録を選ぶ'}).click();
  await expect(page.locator('.past-record')).toHaveCount(3);
  await page.locator('a[href="#past?type=answer&id=old"]').click();
  await expect(page.getByRole('article',{name:'当時の記録'})).toContainText('2026年1月1日');
  await page.getByRole('radio',{name:'少し変わった',exact:true}).check();
  const payload='<img src=x onerror=alert(1)> 今は別の見方もあります。';
  await page.getByLabel('理由や、今考えていること（任意）').fill(payload);
  await page.getByRole('button',{name:'返事を記録する'}).click();
  await expect(page.getByRole('region',{name:'これまでの返事'})).toContainText(payload);
  await expect(page.getByRole('button',{name:'返事を記録する'})).toBeDisabled();
  await page.reload();await expect(page.getByRole('region',{name:'これまでの返事'})).toContainText(payload);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).answers.length)).toBe(2);
  await expect(page.locator('past-view img')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('past.png'),fullPage:true});
  await page.getByRole('link',{name:'記録を選び直す'}).click();
  await page.locator('a[href="#past?type=reflection&id=words"]').click();
  await expect(page.getByRole('article',{name:'当時の記録'})).toContainText('<img src=x onerror=alert(1)>');
  await page.getByRole('radio',{name:'まだ分からない',exact:true}).focus();await page.keyboard.press('Space');
  await page.getByRole('button',{name:'返事を記録する'}).click();
  await expect(page.getByRole('region',{name:'これまでの返事'})).toContainText('まだ分からない');
  expect(errors).toEqual([]);
});
