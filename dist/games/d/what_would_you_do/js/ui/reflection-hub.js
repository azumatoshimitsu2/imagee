import { pastRecords } from '../dialogue-engine.js';
import { comparisonRecords } from '../comparison-engine.js';
import { boundaryJourneys } from '../boundary-engine.js';
import { wordThreads } from '../word-engine.js';

const latest = items => [...items].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
const link = (href, at, label = '続きから読む') => ({ href, at, label });

// Resume links are derived from saved records; opening the hub does not write progress.
export function reflectionHub(state, catalog) {
  const records = pastRecords(state);
  const reply = latest((state.dialogues ?? []).map(r => ({ ...r, at: r.createdAt })));
  const past = reply ? records.find(r => r.id === reply.sourceId && r.type === reply.sourceType) : records[0];
  const comparisons = comparisonRecords(state, catalog);
  const compared = latest((state.comparisons ?? []).map(r => ({ ...r, at: r.createdAt })));
  const journeys = boundaryJourneys(state, catalog);
  const started = journeys.filter(j => j.answeredCount && j.compatible).map(j => ({ ...j, at: latest(j.steps.filter(s => s.answer).map(s => ({ at: s.answer.answeredAt }))).at }));
  const journey = latest(started.filter(j => !j.complete)) ?? latest(started);
  const revisited = latest((state.reevaluations ?? []).map(r => ({ ...r, at: latest([{ at: r.createdAt }, ...(state.reevaluationNotes ?? []).filter(n => n.reevaluationId === r.id).map(n => ({ at: n.createdAt }))]).at })));
  const threads = wordThreads(state), words = threads[0];
  return [
    { id: 'letters', title: 'あの頃の答えを読む', description: '当時の答えや理由を読み、今の気持ちを返事に残します。', href: '#past?view=records', action: '話しかける記録を選ぶ', status: records.length ? '変更前の答えも、当時のまま読めます。' : '問いへの回答が残ると、ここから読めます。', resume: past ? link(`#past?type=${past.type}&id=${encodeURIComponent(past.id)}`, reply?.at ?? past.at, reply ? '続きから読む' : '最新の記録を読む') : null },
    { id: 'comparison', title: '二つの判断を見比べる', description: '関係のある二つの場面を並べ、そのとき何を大切にしたか考えます。', href: '#compare', action: '関連する二つの答えを見比べる →', status: comparisons.length ? `${comparisons.length}組の回答を見比べられます。` : '関連する回答がそろうと、組み合わせが表示されます。', resume: compared ? link(`#compare?id=${encodeURIComponent(compared.comparison.id)}`, compared.at) : null },
    { id: 'boundary', title: '条件を変えて考える', description: '一つの条件だけを変えて答え、判断が切り替わる場面を探します。', href: '#boundary', action: '条件を変えて、判断の境界を探す →', status: journey && !journey.complete ? `${journey.answeredCount} / ${journey.steps.length} の条件に回答済みです。` : '答えが変わっても、変わらなくても構いません。', resume: journey ? link(`#boundary?id=${encodeURIComponent(journey.id)}`, journey.at, journey.complete ? '記録を読み返す' : '続きから考える') : null },
    { id: 'reevaluation', title: '同じ問いにもう一度答える', description: '以前の答えを見る前に今の考えを残し、そのあとで変化を見比べます。', href: '#revisit', action: '以前の答えを見る前に、同じ問いに答える →', status: state.answers.length ? '問いを選ぶ画面では、以前の答えは表示しません。' : '一つ答えを残すと、同じ問いを選べます。', resume: revisited ? link(`#revisit?result=${encodeURIComponent(revisited.id)}`, revisited.at, '見比べた記録を読む') : null },
    { id: 'words', title: '自分の言葉を読み返す', description: '同じ問いに書いた言葉を日付順に読み、今の言葉を重ねます。', href: '#words', action: '自由に書いた言葉を、日付順に読み返す →', status: threads.length ? `${threads.length}の問いに、あなたの言葉が残っています。` : '自由記述に答えると、言葉の足あとが残ります。', resume: words ? link(`#words?id=${encodeURIComponent(words.id)}`, words.entries.at(-1).at) : null },
  ];
}
