import {test,expect} from './fixtures.js';
async function start(page){
  await page.goto('./#past');
  await page.getByRole('link',{name:'条件を変えて、判断の境界を探す →'}).click();
  await page.getByRole('link',{name:'この場面を考える',exact:true}).click();
}
async function answer(page,index){
  await page.getByRole('link',{name:/^(最初|次)の条件を考える$/}).click();
  await page.getByRole('radio').nth(index).check();
  await page.getByRole('button',{name:'この条件での答えを残す'}).click();
  await expect(page.getByRole('region',{name:'条件ごとの回答'})).toBeVisible();
}
test('three conditions resume and lead to a preserved written boundary reflection',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await start(page);await answer(page,0);await page.reload();
  await expect(page.getByText('1 / 3 の条件に回答済み。途中で閉じても、続きから考えられます。')).toBeVisible();
  await answer(page,0);await answer(page,1);
  const result=page.getByRole('region',{name:'今回見えたこと'});
  await expect(result).toContainText('30分と120分の条件で、選んだ行動が変わりました。');
  await expect(result.getByRole('link',{name:'この違いで何を重く考えたか、振り返る →'})).toHaveCount(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:test.info().outputPath('boundary.png'),fullPage:true});
  await result.getByRole('link',{name:'この違いで何を重く考えたか、振り返る →'}).click();
  await expect(page.getByRole('heading',{name:'この条件の違いで、何を重く考えましたか？'})).toBeVisible();
  await page.getByRole('radio',{name:'状況が違う',exact:true}).check();
  await page.getByLabel('あなたの言葉で振り返る（任意）').fill('120分なら、自分の予定も大切にしたい。');
  await page.getByRole('button',{name:'振り返りを記録する'}).click();
  await page.reload();await expect(page.getByRole('region',{name:'これまでの振り返り'})).toContainText('自分の予定も大切にしたい');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).answers.length)).toBe(3);
  expect(errors).toEqual([]);
});
test('same and undecided choices complete without inventing a boundary',async({page})=>{
  await start(page);await answer(page,0);await answer(page,0);await answer(page,0);
  await expect(page.getByRole('region',{name:'今回見えたこと'})).toContainText('選んだ行動は同じでした');
  await page.evaluate(()=>localStorage.removeItem('selfDialogueGame:v1'));
  await page.reload();
  await start(page);await answer(page,2);await answer(page,2);await answer(page,2);
  const result=page.getByRole('region',{name:'今回見えたこと'});
  await expect(result).toContainText('見つけられませんでした');
  await expect(result.getByRole('link',{name:'この違いで何を重く考えたか、振り返る →'})).toHaveCount(0);
});
