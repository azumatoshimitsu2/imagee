export const MESSENGER_DELAY = 15000;
export const ESCORTS = [
  { id: 'mados', name: 'マドス', height: 74, x: 290, y: 280 },
  { id: 'iria', name: 'イリア', height: 70, x: 478, y: 280 },
];
export const UNEASY_LINES = {
  'market-merchant': ['今日は、いつもより早く店を閉めるつもりだ。さっきから、買い物をしない客が通りを行ったり来たりしていてね。'],
  'old-traveler': ['この間まで、ここでは誰もが大きな声で話しておった。今日は、みんな周りを気にしているようだ。'],
  repairer: ['島から来た子を知らないか、と聞かれたよ。知らないと答えたが……君も、気をつけな。'],
  'ingas-worker': ['見慣れない顔が増えたな。荷を運ぶでもなく、通りの角に立っている。何を待っているんだろう。'],
  'trade-clerk': ['荷の届け先より、人の行き先を尋ねる方が増えました。商館にも知らせてあります。'],
  'jiat-traveler': ['誰かに見られている気がするの。大通りにいた人が、宿の前にもいたから……。ひとりで路地に入らない方がいいわ。'],
  'caravan-driver': ['出発前に、何度も荷を調べられた。道が閉じる前に出られればいいんだが。'],
  student: ['今日はみんな、早く帰ってしまいました。本を読んでいても、通りの足音が気になって。'],
  'garden-reader': ['静かな庭が好きなんだが、今日の静けさは落ち着かないね。君も、知り合いのいるところへお行き。'],
  innkeeper: ['今朝、君のことを尋ねる人が来たよ。部屋のことは話していない。外へ出るなら、人通りのある道を歩くんだよ。'],
};
export const RECRUIT_LINES = [
  { speaker: 'アドバ', text: '来てくれたね。ウパチャット王に会う手筈が整った。ベクテーナへ向かう準備ができている。' },
  { speaker: 'チャトア', text: 'ありがとうございます。でも……街の様子が、前と違う気がします。' },
  { speaker: 'アドバ', text: '君と陽光石のことを探っている者がいる。ここからは、一人で行かせるわけにはいかない。二人を紹介しよう。' },
  { speaker: 'マドス', text: 'マドスだ。道中の護衛を引き受けた。何かあったら、まず俺たちに声をかけてくれ。' },
  { speaker: 'イリア', text: '私はイリア。周りは私たちが見ているから、慌てずに進みましょう。これからは三人一緒よ。' },
  { speaker: 'アドバ', text: '旅の支度はこちらで整えてある。二人と離れず、王のもとへ向かっておくれ。' },
  { speaker: 'チャトア', text: 'マドスさん、イリアさん。よろしくお願いします。' },
  { speaker: '', text: 'マドスとイリアが仲間になった。チャトアは二人とともに、商館を出る準備をした。' },
];
export function addEscorts(members = []) {
  return [...new Set([...members, ...ESCORTS.map(n => n.id)])];
}
// Follow the traveled path, including corners, instead of cutting through buildings.
export function pointBehind(trail, distance) {
  for (let i = trail.length - 1; i > 0; i--) {
    const a = trail[i], b = trail[i - 1], length = Math.hypot(a.x - b.x, a.y - b.y);
    if (length >= distance && length > 0) {
      const t = distance / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    distance -= length;
  }
  return trail[0];
}
