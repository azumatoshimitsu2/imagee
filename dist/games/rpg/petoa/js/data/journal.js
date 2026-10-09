import { BARTER_ITEMS } from './barter-shop.js';
const entry = (id, category, name, area, text, note, image, imageColumns = 1) => ({ id, category, name, area, text, note, image, imageColumns });
export const JOURNAL_ENTRIES = [
  entry('lilia-independence', '知識', 'リリアの独立', 'ユアテアの政務受付', '国力で上回るインガスの圧力を受けても、リリアの警備兵は来訪者の安全を守り、身柄の引渡しには正式な外交手続きが必要だと告げた。', '大きな国を前にしても、自分たちの国の決まりを守っていた。'),
  entry('lilia-chancellor', '人々', 'リリアの宰相', 'ユアテア・宰相府', '東南アジアの王家の血を引く、30代後半の男性。ユアテアで政務を担い、アドバの紹介を受けてチャトアたち三名との謁見を認めた。', '島で起きたことを、落ち着いて聞こうとしてくれている。', 'characters/lilia-chancellor-v1.png'),
  entry('yuatea-reception', '場所', 'ユアテアの政務受付', 'ベクテーナ・王宮', '地方の報告や使節の用件を受け付け、王宮の政務区画へ取り次ぐ広間。受付官が来訪を記録し、記録官が文書を整理している。', 'ここで決まることが、遠くの街や村の暮らしにもつながっている。', 'tiles/yuatea/reception-hall-v1.png'),
  entry('yuatea-reception-ticket', '持ち物', '王宮の受付票', 'ユアテアの政務受付', 'アドバの紹介で来訪したチャトア、マドス、イリアの三名を記録した受付票。内廷への取次ぎを待っている。', 'ぼくたちの名前も、王宮の記録に残った。'),
  entry('ingas-chief', '人々', 'インガスの追跡主任', 'ベクテーナ', 'インガスの情報機関の幹部。街に潜む諜報員を指揮し、チャトアたちの逃げ道を塞ぐ。話しかけると部下を呼び寄せ、周囲を包囲する。', 'こちらから話しかけたら、あっという間に囲まれてしまった。', 'characters/ingas-chief-v5.png'),
  entry('vektena-disguise', '持ち物', '変装用の上着', 'バザールの布店・タンス', '布店のタンスから手に入れた、街の人に紛れるための上着。店内か人目のない場所でRキー、または「変装する」を押すと着替えられる。屋外では22秒間、遠くから気づかれにくくなる。交換屋で上着留めを入手すると32秒間に延びる。再使用まで30秒。', '商人が使っていいと言ってくれた。着替えたら、落ち着いて歩こう。'),
  entry('vektena', '場所', 'ベクテーナ', 'リリアの都', 'バザールより大きな、リリアの現代的な都。高層ビルや交通ターミナル、研究地区、公園が広がり、中央大通りの北には王のいるユアテアがある。', '誰かの動きが気になったら、立ち止まって確かめよう。'),
  entry('vektena-pass', '持ち物', '通用門の通行証', '交易商の連絡所', 'バザールの交易商の連絡所で、机の上から手に入れた通行証。机に近づいてEnter・スペース、または「調べる」で取得する。ユアテアへ続く通用門を通れる。', 'これを持って、三人一緒に門を通る。'),
  entry('mados', '人々', 'マドス', 'バザールの商館', 'アドバがチャトアに付けた護衛。王のもとへ向かう旅に同行し、周囲を警戒する。', '一人で行かなくていいんだ。'),
  entry('iria', '人々', 'イリア', 'バザールの商館', 'マドスとともにチャトアを守る護衛。落ち着いた声で、三人で離れずに進もうと呼びかける。', '周りは見ているから、と言ってくれた。'),
  entry("bazaar-city", "場所", "バザールの街", "本土", "国や出身の違う人々が暮らす交易の街。市場・商館・広場・宿場・学びの庭が、大通りでつながっている。", "誰の話から聞いてもいい。自分の足で回ってみよう。"),
  entry("bazaar-info-bazaar", "知識", "バザール", "街で聞いた話", "ルミドノ崩壊後に生まれた商人の組織。国境を越える交易網を持ち、身元の保証や暮らしの支援も行う。", "人と人のつながりが、この街を支えている。"),
  entry("bazaar-info-world", "知識", "世界の状況", "街で聞いた話", "大戦とルミドノの分裂で資源の流れが変わり、エネルギーをめぐる争いが続く。部品や燃料の不足は、街の暮らしにも影響している。", "島の外の出来事も、ぼくたちの暮らしにつながっている。"),
  entry("bazaar-info-ingas", "知識", "インガス", "街で聞いた話", "資源を持つ大国。支配層はリリアの陽光石研究を警戒している。豊かさが働く人々に十分届いていないという話も聞いた。", "国の考えと、そこで暮らす人の願いは、同じとは限らない。"),
  entry("bazaar-info-jiat", "知識", "ジアット", "街で聞いた話", "インガスとともに覇権を狙う国。陽光石の技術が資源をめぐる力関係を変えることを警戒している。", "争いで道が閉ざされると、荷を運ぶ人も困るんだ。"),
  entry("bazaar-info-upachat", "知識", "ウパチャット", "街で聞いた話", "リリアの王。都ベクテーナにいる。陽光石を探し、周辺国との交易や技術の協力を進めている。", "王さまに、島で起きたことを伝えたい。"),
  entry("adba", "人々", "アドバ", "中央商館", "ウトパス村長の友人で、バザールの重鎮。島から逃れてきたチャトアの話を聞き、食事と宿、王に会うための手配を引き受けた。", "怖かったけれど、話を聞いてもらえた。", "characters/adba-static-v1.png", 4),
  entry('mainland-shore', '場所', 'バザールの港', 'バザールの街', '小型艇でたどり着いた街の港。木の桟橋に船が係留され、岸壁には倉庫と荷揚げ場が広がる。船員が働く港を東へ抜けると、商店街に出る。', 'もう舟は使えない。ここからは、自分の足で進む。'),
  entry('sunstone', '持ち物', '陽光石', 'ウトパスの話', '昼の光を蓄えて夜に放つ石。ウトパスは、青い石がリリア王ウパチャットの探す陽光石かもしれないと語った。資源の乏しい世界を支える可能性がある一方、蓄えた力の急激な解放は危険で、安全な利用には研究が必要だ。', 'きれいなだけの石じゃない。王さまは、この力を調べている。', 'items/cave/blue-shard-pixel-v1.png'),
  entry('mother', '人々', 'チャトアの母', 'ウペトア島・チャトアの家', '一晩中、帰ってこないチャトアの身を案じていた母。無事に戻った姿を見て安堵し、家で休むように声をかける。', '母さんにも、たくさん心配をかけてしまった。', 'characters/mother-standing-pixel-v1.png'),
  entry('luminous-house', '場所', '青白く光る家', 'ウペトア島・夜', '宝箱に石をしまって休んだ夜、家全体が青白い光に包まれた。不思議な光に気づいた村人たちが集まってきた。', '宝箱の方から、光があふれている……。'),
  entry('search-party', '人々', '捜索隊', 'ペトア島の砂浜', '帰ってこないチャトアを探していた父と村の漁師。砂浜の近くで合流し、無事を確かめて一緒に村へ戻ることになった。', 'ずっと、ぼくを探してくれていた。'),
  entry('morning-forest', '場所', '朝の森', 'ペトア島・洞窟の外', '洞窟を出ると、木々の間に朝の光が差していた。昨夜、避難した入口がすぐ後ろに見える。', '洞窟の外は、もう朝だった。'),
  entry('blue-shard', '持ち物', '青い石の破片', 'ペトア島の洞窟', '青く光る岩壁のそばに落ちていた破片。割れた石の中にも、岩壁と同じ色の筋が走っている。', '小さくなっても、青い光を宿している。', 'items/cave/blue-shard-pixel-v1.png'),
  entry('black-wall', '場所', '黒くなった岩壁', '洞窟の奥・翌朝', 'チャトアが眠り、朝を迎えると、青く光っていた岩壁は黒く変わっていた。昨夜の光は、もう見えない。', '眠っている間に、何があったんだろう。', 'tiles/cave/black-bedrock-pixel-v1.png'),
  entry('village', '場所', 'ウペトア島の村', 'ウペトア島', '漁で暮らしをつないできた海辺の村。港と家々のあいだに、人々の日常がある。', 'いつもの道にも、知らなかった話がある。'),
  entry('sea', '場所', 'ペトア島への海路', '島のあいだの海', '二つの島を結ぶ海。白波と大きな海獣が、小舟の行く手に現れる。', '岸から見る海と、舟から見る海は違う。'),
  entry('beach', '場所', 'ペトア島の砂浜', 'ペトア島', '波に運ばれた貝殻が散らばる砂浜。奥には深い森が続いている。', '波が引くたび、砂の上に小さな発見がある。'),
  entry('forest', '場所', '夕暮れの森', 'ペトア島', '背の高い木々と茂みのあいだを、さまざまな獣が行き来する。', '同じ森でも、住んでいる生き物の歩き方は違う。'),
  entry('night-forest', '場所', '夜の森', 'ペトア島', '夜に包まれた森。昼間とは違う暗がりの向こうに、洞窟の入口がある。', '暗くなると、葉ずれや足音が近く感じる。'),
  entry('cave', '場所', 'ペトア島の洞窟', 'ペトア島', '冷たい空気が流れる岩の迷路。分かれ道の先には、かつての生き物や水の痕跡が残る。', '行き止まりにも、この場所の昔を知る手がかりがある。', 'tiles/forest/rocky-cave-entrance-tile-v1.png'),
  entry('blue-wall', '場所', '青く光る岩壁', '洞窟の奥', '幾重もの青い筋が走る岩壁。灯りがなくても足もとが見えるほど、岩そのものが光っている。', 'この光は、どこから生まれているんだろう。', 'tiles/cave/blue-bedrock-pixel-v1.png'),
  entry('urishia', '人々', 'ウリシア', 'ウペトア島', 'チャトアに貝殻拾いを持ちかける村の少女。海の向こうのペトア島を知っている。', '手伝いが終わったら、また海辺へ行こう。', 'characters/urishia-static-v1.png', 4),
  entry('father', '人々', 'チャトアの父', 'ウペトア島', '網仕事を通して、チャトアに漁村の暮らしを教える父。海を道でもあり、境でもあると語る。', '網をたたむ手つきを、ちゃんと見てくれていた。', 'characters/father-static-v3.png', 4),
  entry('utopas', '人々', '村長ウトパス', 'ウペトア島', 'ペトア島の森に踏み込まないよう、子どもたちに言い聞かせる村長。古くからの約束を大切にしている。', '森の約束には、どんな理由があるんだろう。', 'characters/chief-utopas-static-v1.png', 4),
  entry('fisher', '人々', '漁師', 'ウペトア島', '沖の潮の変化を読み、村へ魚を届ける漁師。日々の漁が島の暮らしを支えている。', '海の様子は、毎日同じじゃないらしい。', 'characters/fisher-static-v1.png', 4),
  entry('child', '人々', '村の子', 'ウペトア島', '向こうの島に興味津々の子ども。森から聞こえる不思議な鳴き声の噂を知っている。', '行ってみたい気持ちは、ぼくも同じだ。', 'characters/child-static-v1.png', 4),
  entry('sea-beast', '生き物', '海獣', 'ペトア島への海路', '海亀に似た大きな獣。舟に近づくと勢いよく突進し、海に潜ってから再び姿を見せる。', '潜ったからといって、遠くへ行ったわけではなさそうだ。', 'enemies/sea-turtle-beast-static-v1.png', 4),
  entry('runner', '生き物', '走り獣', 'ペトア島の森', '森の道を駆け回る獣。短い加速を繰り返しながら、木々のあいだを巡っている。', '足の速さだけでなく、走るリズムにも特徴がある。', 'enemies/jungle-beast-runner-v1.png'),
  entry('watcher', '生き物', '見張り獣', 'ペトア島の森', 'ときどき立ち止まり、首を巡らせて遠くを見渡す獣。視線の届く距離が長い。', 'ゆっくり歩いていても、遠くまで見ている。', 'enemies/jungle-beast-watcher-v1.png'),
  entry('sniffer', '生き物', '嗅ぎ獣', 'ペトア島の森', '周囲の気配を嗅ぎ取りながら進む獣。茂みの近くでも、相手の気配を探ろうとする。', '葉っぱに隠れた姿以外にも、何かを感じているみたいだ。', 'enemies/jungle-beast-sniffer-v1.png'),
  entry('plant', '生き物', '食人植物', 'ペトア島の森', 'その場に根を張り、かすかに体を揺らす大きな植物。動き回る獣とは違い、近づきすぎない観察ができる。', '木や草に見えても、よく見ると生き物らしい動きをしている。', 'enemies/jungle-beast-carnivorous-plant-v1.png'),
  ...BARTER_ITEMS.map(item => entry(item.id, '持ち物', item.name, 'バザールの街・旅道具の交換屋', item.description, '持ち物が、旅の助けになった。')),
  entry('shell', '持ち物', '浜辺の貝殻', 'ペトア島の砂浜', '波打ち際に残された貝殻。海で暮らした小さな生き物の、丈夫な住まいの跡。', 'ひとつ拾うと、ほかの形も探してみたくなる。', 'items/beach-shell-v1.png'),
  entry('animal-bone', '持ち物', '動物の骨', 'ペトア島の洞窟', '長い間、洞窟にあったらしい小さな動物の骨。今は静かな通路にも、生き物がいたことを伝えている。', 'この動物も、ここを歩いていたのかな。', 'items/cave/animal-bone-pixel-v1.png'),
  entry('bone-fragment', '持ち物', '骨のかけら', 'ペトア島の洞窟', '岩のすきまに落ちていた白い骨のかけら。小さすぎて、もとの形まではわからない。', '小さなかけらにも、ここに来るまでの時間がある。', 'items/cave/bone-fragment-pixel-v1.png'),
  entry('smooth-stone', '持ち物', '丸い小石', 'ペトア島の洞窟', '水に削られたようになめらかな小石。洞窟に水が流れていたのかもしれない。', '指でなぞると、ほかの岩との違いがわかる。', 'items/cave/smooth-stone-pixel-v1.png'),
  entry('old-fang', '持ち物', '古い牙', 'ペトア島の洞窟', '先の欠けた古い牙。持ち主の姿はわからないが、この場所と動物とのつながりを想像させる。', 'どんな生き物の牙だったんだろう。', 'items/cave/old-fang-pixel-v1.png'),
];

export const SCENE_ENTRIES = {
  UpetoaVillageScene: 'village', PetoaIslandScene: 'sea', PetoaBeachScene: 'beach',
  PetoaForestScene: 'forest', PetoaForestNightScene: 'night-forest', PetoaCaveScene: 'cave',
  PetoaForestMorningScene: 'morning-forest', UpetoaVillageReturnScene: 'village',
  UpetoaChiefMorningScene: 'village',
  UpetoaHarborAttackScene: 'village', PetoaSeaEscapeScene: 'sea', BazaarCityScene: 'bazaar-city', BazaarUneaseScene: 'bazaar-city', VektenaChaseScene: 'bazaar-city', VektenaCityScene: 'vektena', CapitalStealthScene: 'vektena', YuateaEntranceScene: 'yuatea-reception', YuateaChancellorScene: 'lilia-chancellor',
};
const STORAGE_KEY = 'petoa.journal.v1';
export function createJournal(storage) {
  const valid = new Set(JOURNAL_ENTRIES.map(item => item.id));
  let saved;
  try { saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '[]'); } catch { saved = []; }
  const found = new Set((Array.isArray(saved) ? saved : []).filter(id => valid.has(id)));
  return {
    has: id => found.has(id),
    get size() { return found.size; },
    reset() {
      found.clear();
      try { storage?.setItem(STORAGE_KEY, '[]'); } catch { /* Reset this session even when storage is unavailable. */ }
    },
    discover(id) {
      if (!valid.has(id) || found.has(id)) return false;
      found.add(id);
      try { storage?.setItem(STORAGE_KEY, JSON.stringify([...found])); } catch { /* Keep discoveries for this session when storage is unavailable. */ }
      return true;
    },
  };
}

export function observeScene(scene, discover) {
  discover(SCENE_ENTRIES[scene.sys.settings.key]);
  if (scene.sys.settings.key === 'MainlandLandingScene' && ['shore', 'road', 'complete'].includes(scene.phase)) discover('mainland-shore');
  if (['BazaarCityScene', 'BazaarUneaseScene'].includes(scene.sys.settings.key)) {
    for (const id of scene.learned ?? []) discover(`bazaar-info-${id}`);
    if (scene.registry?.get('bazaarMetAdba')) discover('adba');
  }
  if (scene.registry?.get('yuateaReceptionIncidentDone')) discover('lilia-independence');
  if (scene.registry?.get('yuateaReceptionTicket')) discover('yuatea-reception-ticket');
  if (scene.registry?.get('capitalChiefTalked')) discover('ingas-chief');
  if (scene.registry?.get('bazaarEscortsJoined')) { discover('mados'); discover('iria'); }
  if (scene.sim?.stage >= 2 || scene.registry?.get('vektenaStage') >= 2) discover('vektena-pass');
  if (scene.sim?.hasDisguise || scene.registry?.get('vektenaStage') >= 1) discover('vektena-disguise');
  const player = scene.player ?? scene.boat;
  if (!player) return;
  const visibleNearby = (object, radius) => object?.visible !== false && object &&
    Math.hypot(object.x - player.x, object.y - player.y) <= radius &&
    scene.cameras.main.worldView.contains(object.x, object.y);
  for (const [id, npc] of scene.npcSprites ?? []) if (visibleNearby(npc, 100)) discover(id);
  if (visibleNearby(scene.seaBeast, 320)) discover('sea-beast');
  for (const beast of scene.beasts ?? []) if (visibleNearby(beast, 280)) discover(beast.getData('typeId'));
  const equipment = scene.registry?.get('travelEquipment');
  if (Array.isArray(equipment)) for (const id of equipment) discover(id);
  if (scene.shellCount > 0 || scene.registry?.get('beachShells') > 0) discover('shell');
  for (const id of scene.collected ?? []) discover(id.startsWith('blue-shard-') ? 'blue-shard' : id);
  if (scene.reachedWall) discover('blue-wall');
  if (scene.reunited) discover('search-party');
  if (['eventComplete', 'chiefMorning', 'chiefHeard', 'chiefExplained', 'chiefStoneReceived', 'chiefDeparted'].includes(scene.phase)) discover('luminous-house');
  if (['chiefExplained', 'chiefStoneReceived', 'chiefDeparted'].includes(scene.phase)) discover('sunstone');
  if (scene.isMorning && !scene.chapterTransition) discover('black-wall');
}
