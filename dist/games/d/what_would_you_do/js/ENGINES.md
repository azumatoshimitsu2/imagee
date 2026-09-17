# 画面に依存しない処理

全モジュールはES ModulesのJavaScript。Lit、DOM、外部ライブラリに依存しない。ブラウザ固有の永続保存はStorage層に閉じ込め、テストではアダプターを差し替える。

## UIとの接続例

```js
import { loadCatalog } from './data-loader.js';
import { createStorage } from './storage.js';
import { createGameService } from './game-service.js';

const catalog = await loadCatalog();
const storage = createStorage({
  schemas: catalog.schemas,
  key: catalog.settings.storage.key,
});
const game = createGameService({ storage, catalog });
const question = game.getNextQuestion();
// questionを表示。nullなら現在の未回答候補なし。選択は読み取り専用で日付に固定しない。
// const result = game.answer(question.id, optionId, { expectedPreviousId: null });
// 表示したコメントのみ game.markCommentShown(result.comment.id) で記録する。
```

UIからlocalStorageを直接操作しない。Lit UIからこのAPIを使用している。UIのルートはindex.htmlのハッシュで管理する。

## 各モジュール

| ファイル | 主なAPI |
| --- | --- |
| data-loader.js | loadCatalog / validateCatalog: 外部JSONとSchemaを読み込み、参照・型・範囲を検証 |
| validation.js | JSONの検証、同梱Schemaで使うキーワードの評価。汎用JSON Schema実装ではない |
| state-validation.js | 保存履歴の型・スナップショット・参照・履歴の鎖を検証 |
| storage.js | createStorage / memoryAdapter / migrate |
| answer-history.js | createState / appendAnswer / reviseAnswer / appendReason / currentAnswers / distinctCount |
| scoring-engine.js | scoreAnswers: 最新回答の加重平均・有効回答量・暫定表示 |
| comment-engine.js | detectComments / selectComment / formatComment / recordShownComment |
| reflection-engine.js | appendReflection / dueReflections: 原文保存・再提示条件 |
| profile-engine.js | analyzeProfile / comparePeriods: 6軸・関連一貫性・カテゴリ差・期間比較 |
| question-engine.js | chooseQuestion / assignToday / eligibleFollowUps / dailyProgress |
| game-service.js | UI向けの操作窓口。保存・採点・判定を組み合わせる |

## Storage

`getState`, `getStatus`, `saveState`, `update`, `exportJSON`, `importJSON`, `reload`, `clear`, `getRecoveryText`を公開する。

- `getState`はコピーを返す。`update`はコピーを受け取って新状態を返す関数を受け付ける。通常の保存で旧回答・原文・発見を変更／削除できない。
- 新規回答も理由の追記もイベントとして追加。現在値はsupersedesAnswerIdの鎖の末尾で選ぶ。古い版の再評価には保存済みsnapshotを使用する。
- 同じquestionId/versionで本文や選択肢などが異なる履歴は拒否する。statusとreviewだけの変更は採点内容を変えないため許可する。
- 保存時のスナップショットを検証するが、現行カタログとの一致を強制しない。廃止された質問や古い版も読み戻せる。関係判定はカタログ側の許可versionを別途確認する。
- JSONインポートは全検証に成功してから置換。不正JSON、未知schemaVersion、重複ID、分岐／循環、採点値不一致、参照切れを拒否する。最大サイズは暫定5MiBでcreateStorageのmaximumBytesから変更可能。
- 壊れた保存値はそのまま保持し、`getRecoveryText`で取り出せる。通常の操作はメモリ内で続ける。明示的なclearで壊れた保存値も削除できる。
- 保存不可・容量超過の場合も操作結果をメモリに残す。statusのmode/issueをUIへ通知する。メモリ内モードのデータはページを閉じると失われるため、UIではexportを案内する。自動的に永続保存へ戻して古いデータを上書きしない。
- 他タブによる変更を保存直前に検出した場合、StorageConflictErrorを返す。reloadは現在の永続データを読み直す操作で、メモリ内の変更を残したい場合は先にexportする。localStorageに原子的な複数タブトランザクションを追加したものではない。
- 他のゲームのlocalStorageキーには触れない。clearで削除できなかった場合もstatusで区別する。
- migrateはv1の検証・コピーのみ。存在しない旧形式の移行を推測して実行しない。

## 採点・発見

現在の一質問一回答のみを集計。未測定はnull、測定した中間は0。「決められない」と自己申告は行動採点に含めない。3件未満は方向を非表示、3〜5件は暫定。全体5問未満もProfileでは方向を非表示にする。

明示されたrelationとoptionPairsだけでCONSISTENCY/TENSION/CONTEXT_SHIFTを検出する。sourceとtargetは関係定義の向きで、文面の以前／今回は日時順。BOUNDARYは同一系列・同一条件・数値差・意味上の選択変更が必要。

検出は全候補を返し、表示候補はpriorityの高い一件。表示済みはruleVersionと根拠回答／原文IDで重複を防ぐ。旧発見は履歴として保持し、現在の候補は最新回答から再計算する。文面は単なる文字列で、UIでは必ずtextContentで表示する。

## 未確定の分析

TODO-01・03は未確定のまま。TODO-02の表示順はユーザー確認済み。既定データではTIME_SHIFTとREFLECTION_RETURNは無効、解放値はnullのまま。テストだけで設定を変更して検出処理を検証している。

- consistencyは比較可能な明示ペアのうち、一致したペアの割合。証拠なしはnull。
- contextDependencyは少なくとも2カテゴリ・各3有効回答の平均の範囲/2。カテゴリタグが複数なら各カテゴリに寄与する。
- これらの高度な分析は `advancedAnalysisStatus: draft`、`advancedAnalysisVisible: false`。未承認の閾値を強い表示へ流用しない。
- 時間比較はearlier/recentの非重複期間を呼び出し側が明示した場合だけ計算する。同じ質問・同じ版を両期間で回答している組だけを使う。各期間一質問一回答、軸ごと最低3組、比較対象の合計最低20回答、最低30日の間隔を既定の計算条件とする。期間指定なし・証拠不足はnull。期間の選び方や公開条件はまだ決めていない。
- 比較指標はゲーム内の便宜的な値であり、確率や心理検査の信頼度ではない。

## 出題と追問

当日の割当はローカル日付で保存する。ほかの質問に答えても当日の割当は変えない。途中でカタログの版が変わり当時の問題を取得できない場合、別の問題へ黙って切り替えずunavailableを返す。

初回はinitialQuestionIds、以降は設定のpriorityWeightsを使用する。情報不足度は1/(1+軸の回答数)の軸平均、関連機会と新カテゴリは0/1、類似性は直近3問に含まれる割合、追問疲労は直近の理由回答の有無。これは決定的な初期実装であり、心理測定の情報量ではない。全問回答済みならnullを返す。

初期草案を開発中に動かせるようincludeDraftsの既定値はtrue。公開版はレビュー後にincludeDrafts=falseで出題できる。未回答の候補では、既に「決められない」と答えた質問も訪問済みとして除外し、再評価は履歴から行う。

deferred_questionで指定された問題は必要件数と翌日条件を満たすまで通常候補からも除外する。理由追問は件数に対する目標25%と最低間隔を守り、自由記述は解放件数と追加回答間隔を守る。ここでは候補だけを返す。UIはユーザー確認済みの「選択→任意の理由追問→解説→過去回答との対話」の順で表示する。原文の再提示への返事は、対象の発見が有効な場合だけサービスから保存できる。

## テスト

`src/what_would_you_do/`で `npm test`。データ9件、処理33件、ブラウザ36件（ChromiumのPC／モバイル設定）。ブラウザでは実localStorageへの保存・ページ再読込・入出力・破損保持・textContentでのXSS文字列表示を確認する。ホーム・回答・追問・履歴・変更・復元の画面操作も検証する。実機Safariの検証ではない。

### Manual past-self conversations

`dialogue-engine.js` exposes `pastRecords(state)` (all answer versions and literal free writings) and `appendDialogue(state, definition, input)`. `game.replyToPast(sourceType, sourceId, stanceId, text)` persists via Storage. Reply events reference immutable source IDs and snapshot the prompt, definition version and selected label; they never revise answers, score text, or enable scheduled TIME_SHIFT / REFLECTION_RETURN rules.

State v1 gains an optional, append-only `dialogues` collection. Its absence means no replies, so existing v1 files load unchanged; the collection is created on the first reply. New exports include it, import validates source references, and clear removes it. This is an additive format extension; older application versions with strict schemas cannot import exports containing the new field.

### Paired-answer reflection

`comparison-engine.js` exposes `comparisonRecords(state, catalog)` and `appendComparison(state, catalog, input)`. Candidates come from the existing rule engine; arbitrary answer pairs cannot be submitted. Persisted pairs keep original answer event IDs and comment snapshots, so revisions and rule changes do not rewrite a conversation. `game.replyToComparison()` persists through Storage. The optional v1 `comparisons` collection is append-only, validated on import, included in export/clear, and excluded from scoring. No semantic analysis of written reflections or automatic TIME_SHIFT enabling is involved.

The `#compare` Lit screen is linked from the map discovery, answer explanation, and past-self screen. On wide screens the original answers appear side by side; narrow screens stack them. User-authored text uses the existing plain-text component.

### Guided boundary journeys

`boundaryJourneys(state, catalog)` is a UI-independent projection of configured journeys, current answer snapshots, resume positions, version compatibility and observed intervals. `game.answerBoundary()` validates the next unanswered question and appends a normal immutable answer with source `boundary`. It prevents duplicate/out-of-order submissions. No separate progress state or migration is needed. Storage export/import also preserves progress.

The boundary screen narrows displayed pairs only when a decisive intermediate answer exists; it does not fit a numerical cutoff or assume monotonic preferences. Undecided answers are preserved as completed steps, but never treated as a change in action. A version mismatch blocks new comparisons instead of blending question meanings. Written reflections reuse `replyToComparison()` and its snapshot/history protections.

### Manual blind reevaluation

`reevaluation-engine.js` provides the current question choices, atomic answer/reason appending, and append-only post-comparison notes. The service exposes `reevaluate(previousAnswerId, optionId, reason)` and `writeReevaluationNote(...)`. A stale previous ID is rejected; the exact old question snapshot is used even if current catalog wording/version has changed. The previous answer is kept, while the new event becomes the current answer for normal scoring. Old reasons are never copied into the new event.

`#revisit` renders only question titles and dates in its chooser. The answering route has no previous choice selection, reasons, explanation or comparison in the DOM. On successful submission, the result route reveals the two immutable answer events and their reasons. Reasons written before revelation and observations written afterwards are stored separately. Reload and repeated reevaluation retain the original pair; previously submitted URLs cannot append duplicate answers.

### Literal word timelines

`wordThreads(state)` builds date-ordered threads from versioned original reflection prompts, their descendant reflection responses, existing manual replies, and new word entries. Grouping uses exact IDs, versions and prompt snapshots rather than text similarity. Links accept any original reflection ID in a group. `appendWordEntry()` validates an original source, the configured stance, a nonblank bounded text and timestamp. `game.writeWords()` persists via Storage.

The optional append-only v1 `wordEntries` collection leaves all original reflections and scoring unchanged. Import checks original-source references and dates. The `#words` Lit screen uses plain-text output for all stored prose and gives a route back without writing. No automatic reflection-return schedule is enabled.

### One daily invitation to reflect

`daily-reflection-engine.js` separates candidate selection, date-pinned assignment, current card projection, and append-only open/dismiss actions. The engine accepts an explicit clock, uses local calendar days, ignores future records, respects type priorities and a configurable repeat cooldown. Once assigned for a day, the selection is never backfilled or replaced. Existing comparison eligibility still comes from relations/rules; completed comparisons and recently updated word threads are excluded.

`game.getDailyReflections()` persists only changed assignments; `dailyReflectionAction()` records the action before navigation. Home cards contain titles and record dates, never old answer choices, reasons or free prose. Re-answer invitations link directly to the blind answering route. Existing immutable optional collections and import validation cover assignments/actions; no scoring input is added. Date changes refresh invitations with focus/visibility checks and a lightweight home-only minute check.

### Self-paced reading

`game.getNextQuestion()` uses the existing data-driven chooser without assigning a date or writing state. The UI uses ordinary `archive` answer events and the existing duplicate-answer guard. Answered questions, including unsure responses, are excluded from the next selection; revisions remain available through history. The initial order, reason frequency, comparison thresholds and guided journeys remain data-driven. The deferred question's minimum day gap is now zero; its prerequisite answer and minimum answer count still apply.

Legacy `dailyAssignments`, answers, progress APIs and schema remain compatible with imports. The UI no longer calls `getToday()` or uses old daily assignments to select questions; old `source=daily` links redirect to a current unanswered question. Day-based reflection invitations retain their existing timing and dismissal policy.

The UI offers an optional reflection break after every three newly answered questions in the current page session. This is an in-memory set of question IDs, not a quota or persisted progress measure; revisions and reason edits do not increase it. Rest, reload, import, clear and conflict reload reset it. Rest does not close the tab or delete answers. Storage-denied mode explicitly warns that closing the page loses unsaved data.
