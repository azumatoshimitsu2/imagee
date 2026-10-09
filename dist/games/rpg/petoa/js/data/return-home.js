// Match the shed sprite's visible doorway, rather than the village grid center.
export const HOME_DOOR = { x: 284, y: 822 };
export const HOME_BED = { x: 108, y: 156 };
export const HOME_CHEST = { x: 216, y: 144 };
export const RETURN_VILLAGERS = [
  { id: 'father', key: 'returnFather', x: 864, y: 984, name: 'チャトアの父', lines: ['母さんが家で待っている。まず、顔を見せて安心させてやってくれ。', '無事でよかった。今度からは、黙って海へ出るんじゃないぞ。'], gather: { x: 280, y: 894 } },
  { id: 'fisher', key: 'returnFisher', x: 1008, y: 1008, name: '漁師', lines: ['お前の父さん、夜が明ける前から舟を出す支度をしていたんだ。', '今日は家で休め。海の仕事は、大人に任せておけ。'], gather: { x: 352, y: 910 } },
  { id: 'urishia', key: 'returnUrishia', x: 408, y: 504, name: 'ウリシア', lines: ['チャトア！　帰ってきたんだね……。本当に心配したんだから。', 'また一緒に貝殻を拾おう。今度は、ちゃんと帰ってこられるところで。'], gather: { x: 216, y: 906 } },
  { id: 'utopas', key: 'returnChief', x: 864, y: 360, name: '村長ウトパス', lines: ['無事に戻ったか。村のみんながお前を探していた。', '話はあとで聞こう。まずは家に帰って、母親を安心させなさい。'], gather: { x: 408, y: 864 } },
  { id: 'child', key: 'returnChild', x: 1272, y: 504, name: '村の子', lines: ['おかえり！　みんな、チャトアの話をしてたよ。', 'お母さん、ずっと家の前を見ていたんだ。早く帰ってあげて。'], gather: { x: 456, y: 916 } },
];
export const MOTHER_LINES = [
  { speaker: 'チャトアの母', text: 'チャトア……！　どこへ行っていたの。昨夜は、心配で眠れなかったのよ。' },
  { speaker: 'チャトア', text: 'ごめんなさい、母さん。黙って出かけて……帰り道が分からなくなったんだ。' },
  { speaker: 'チャトアの母', text: 'けがはない？　寒くなかった？　……無事に帰ってきてくれて、本当によかった。' },
  { speaker: 'チャトア', text: 'うん、大丈夫。心配かけて、ごめんなさい。' },
  { speaker: 'チャトアの母', text: '今日はもう、家でゆっくり休みなさい。' },
  { speaker: 'チャトア', text: '（拾った青い石は、ベッドのそばの宝箱にしまっておこう。）' },
];
export const SHARD_IDS = ['blue-shard-1', 'blue-shard-2', 'blue-shard-3'];
export function canStoreShards(phase, inventory) {
  return phase === 'apologized' && SHARD_IDS.every(id => inventory.includes(id));
}
export function depositShards(inventory) {
  return { carried: inventory.filter(id => !SHARD_IDS.includes(id)), stored: SHARD_IDS.filter(id => inventory.includes(id)) };
}
