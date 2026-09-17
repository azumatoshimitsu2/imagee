import { test, expect } from './fixtures.js';
async function open(page) {
  await page.goto('./#profile');
  await expect(page.getByRole('heading', { name: 'あなたの地図', exact: true })).toBeVisible();
}
async function seed(page, ids) {
  await page.evaluate(async ids => {
    const base='/games/d/what_would_you_do/js/';
    const [{loadCatalog},{createStorage},{appendAnswer}] = await Promise.all([import(`${base}data-loader.js`),import(`${base}storage.js`),import(`${base}answer-history.js`)]);
    const catalog=await loadCatalog(),storage=createStorage({schemas:catalog.schemas});
    let state=storage.getState();
    for (const id of ids) {
      const q=structuredClone(catalog.questions.questions.find(q=>q.id===id) ?? catalog.questions.questions.find(q=>q.id==='q004'));
      if(q.id!==id){q.id=id;q.relations=[];q.followUps=[];}
      state=appendAnswer(state,q,q.options[0].id);
    }
    storage.saveState(state);
  }, ids);
  await page.reload();
  await expect(page.getByRole('heading',{name:'あなたの地図',exact:true})).toBeVisible();
}

test('empty and globally insufficient profiles reveal no position', async ({page})=>{
  await open(page);
  await expect(page.locator('.map-axis')).toHaveCount(6);
  await expect(page.locator('.axis-position')).toHaveCount(0);
  await expect(page.locator('.map-unlock')).toContainText('3問に答えると');
  await seed(page,['q003','q001']);
  await expect(page.locator('.axis-position')).toHaveCount(0);
  await expect(page.locator('.map-count')).toContainText('2の問い');
});

test('provisional map links to actual answers and updates after a revision',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);await seed(page,['q003','q001','q009','q006','q008']);
  const axis=page.locator('.map-axis').filter({has:page.locator('#axis-principle_outcome')});
  await expect(axis).toContainText('まだ暫定です');
  await expect(axis).toContainText('この軸の手がかり：3件');
  await expect(page.locator('.axis-position')).toHaveCount(1);
  await axis.getByText('根拠になった回答を読む（3件）').click();
  await axis.getByRole('link',{name:'会社のルール'}).click();
  await expect(page.getByRole('heading',{name:'会社のルール',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'回答の足あと',exact:true}).click();
  const card=page.locator('.history-card').filter({has:page.getByRole('heading',{name:'会社のルール',exact:true})});
  await card.getByRole('button',{name:'今ならどう答えるか、考える'}).click();
  await page.getByRole('radio').nth(1).check();
  await page.getByRole('button',{name:'この答えを記録する'}).click();
  await page.getByRole('link',{name:'あなたの地図',exact:true}).click();
  await expect(axis).toContainText('この軸の手がかり：3件');
  await axis.getByText('根拠になった回答を読む（3件）').click();
  await expect(axis.locator('.map-evidence')).toContainText('今回は正式な手順を守り');
  await expect(axis.locator('.map-evidence')).not.toContainText('今回は例外で対応し');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:test.info().outputPath('profile.png'),fullPage:true});
});

test('six answers allow normal display; related discovery is read-only and linked',async({page})=>{
  await open(page);await seed(page,['q003','q001','q009','q010','q024','q016']);
  const axis=page.locator('.map-axis').filter({has:page.locator('#axis-principle_outcome')});
  await expect(axis).toContainText('今までの回答から');
  await expect(axis).toContainText('この軸の手がかり：6件');
  await seed(page,['q004','q005','q006','q008']);
  const discovery=page.getByRole('article',{name:'関連する回答の発見'});
  await expect(discovery).toBeVisible();
  await expect(discovery).toContainText('矛盾していますか');
  await expect(discovery.locator('.map-evidence a')).toHaveCount(2);
  await expect(discovery.getByRole('link',{name:'二つの答えを見比べて、振り返る →'})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('selfDialogueGame:v1')).discoveries.length)).toBe(0);
  await expect(page.getByText('カテゴリ全体の違いや時間による変化は、ここではまだ表示していません。')).toBeVisible();
});
