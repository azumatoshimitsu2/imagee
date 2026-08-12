export const problems = [
  {
    id: "minimal-and-001",
    title: "ANDを作ろう",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ANDを操る",
    stage: 1,
    difficulty: 1,
    premises: ["A", "B"],
    conclusion: "A ∧ B",
    optimalSteps: 1,
    hints: [
      "A と B の両方が前提にあります。",
      "2つの式を1つにまとめる規則を探してください。",
      "A と B を選択して ∧I を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-and-002",
    title: "ANDから左を取り出す",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ANDを操る",
    stage: 2,
    difficulty: 1,
    premises: ["A ∧ B"],
    conclusion: "A",
    optimalSteps: 1,
    hints: [
      "A ∧ B の中には A と B が含まれています。",
      "左側を取り出す規則を使います。",
      "A ∧ B を選択して ∧E 左を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-and-003",
    title: "ANDから右を取り出す",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ANDを操る",
    stage: 3,
    difficulty: 1,
    premises: ["A ∧ B"],
    conclusion: "B",
    optimalSteps: 1,
    hints: [
      "今度は右側を取り出します。",
      "A ∧ B を選択します。",
      "∧E 右を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-and-004",
    title: "ANDを入れ替える",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ANDを操る",
    stage: 4,
    difficulty: 2,
    premises: ["A ∧ B"],
    conclusion: "B ∧ A",
    optimalSteps: 3,
    hints: [
      "まず A ∧ B から B と A を別々に取り出します。",
      "B を先、A を後に選ぶと順番を入れ替えられます。",
      "B と A を選択して ∧I を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-implication-001",
    title: "含意を使う",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "含意の塔",
    stage: 5,
    difficulty: 1,
    premises: ["A → B", "A"],
    conclusion: "B",
    optimalSteps: 1,
    hints: [
      "A → B は「A があれば B」と読みます。",
      "すでに A も前提にあります。",
      "A → B と A を選択して →E を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-implication-002",
    title: "仮定から含意を作る",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "含意の塔",
    stage: 6,
    difficulty: 2,
    premises: ["A"],
    conclusion: "B → A",
    optimalSteps: 2,
    hints: [
      "B → A を作るには、まず B を仮定します。",
      "仮定 B の内側でも、外側の前提 A は使えます。",
      "A を選択して →I を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-implication-003",
    title: "含意をつなぐ",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "含意の塔",
    stage: 7,
    difficulty: 3,
    premises: ["A → B", "B → C"],
    conclusion: "A → C",
    optimalSteps: 4,
    hints: [
      "A → C を作るには、A を仮定します。",
      "A → B と A から B、B → C と B から C を導きます。",
      "C を選択して →I を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-implication-004",
    title: "ANDから含意を作る",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "含意の塔",
    stage: 8,
    difficulty: 2,
    premises: ["A ∧ B"],
    conclusion: "A → B",
    optimalSteps: 3,
    hints: [
      "A → B を作るために A を仮定します。",
      "外側の A ∧ B から B を取り出せます。",
      "B を選択して →I を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-or-001",
    title: "ORを右に足す",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ORの迷宮",
    stage: 9,
    difficulty: 1,
    premises: ["A"],
    conclusion: "A ∨ B",
    optimalSteps: 1,
    hints: [
      "A から A ∨ B を作るには ∨I 右を使います。",
      "追加する式として B を入力します。",
      "A を選択して ∨I 右を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-or-002",
    title: "ORを左に足す",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ORの迷宮",
    stage: 10,
    difficulty: 1,
    premises: ["B"],
    conclusion: "A ∨ B",
    optimalSteps: 1,
    hints: [
      "B から A ∨ B を作るには ∨I 左を使います。",
      "追加する式として A を入力します。",
      "B を選択して ∨I 左を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-or-003",
    title: "ORの場合分け",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "ORの迷宮",
    stage: 11,
    difficulty: 3,
    premises: ["A ∨ B", "A → C", "B → C"],
    conclusion: "C",
    optimalSteps: 1,
    hints: [
      "A の場合も B の場合も C が出るなら、A ∨ B から C を導けます。",
      "A ∨ B, A → C, B → C の3行を選択します。",
      "∨E を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-negation-001",
    title: "矛盾を作る",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "矛盾の谷",
    stage: 12,
    difficulty: 1,
    premises: ["A", "¬A"],
    conclusion: "⊥",
    optimalSteps: 1,
    hints: [
      "A と ¬A は両立しません。",
      "A と ¬A を選択します。",
      "¬E を押します。"
    ],
    provable: true
  },
  {
    id: "minimal-negation-002",
    title: "否定を導入する",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "矛盾の谷",
    stage: 13,
    difficulty: 3,
    premises: ["A → B", "¬B"],
    conclusion: "¬A",
    optimalSteps: 4,
    hints: [
      "¬A を作るには、A を仮定して矛盾 ⊥ を目指します。",
      "仮定 A と A → B から →E で B を導出できます。",
      "B と ¬B から ¬E で ⊥、その後 ¬I で ¬A です。"
    ],
    provable: true
  },
  {
    id: "minimal-wall-001",
    title: "最小論理の壁",
    system: "minimal",
    systemLabel: "最小論理",
    chapter: "最小論理の壁",
    stage: 15,
    difficulty: 3,
    premises: ["A ∨ B", "¬B"],
    conclusion: "A",
    optimalSteps: null,
    hints: [
      "B の場合は ¬B と合わせて ⊥ まで進めます。",
      "しかし最小論理には ⊥ から A を出す ⊥E がありません。",
      "この体系では証明できない、を押してみましょう。"
    ],
    provable: false,
    unprovableExplanation: "最小論理では ⊥E が使えないため、B の場合から A を回収できません。"
  },
  {
    id: "intuitionistic-bottom-001",
    title: "矛盾から導く",
    system: "intuitionistic",
    systemLabel: "直観主義論理",
    chapter: "直観主義への扉",
    stage: 16,
    difficulty: 1,
    premises: ["⊥"],
    conclusion: "A",
    optimalSteps: 1,
    hints: [
      "直観主義論理では ⊥E が使えます。",
      "⊥ を選択します。",
      "⊥E を押して A を入力します。"
    ],
    provable: true
  },
  {
    id: "intuitionistic-or-001",
    title: "最小論理との違い",
    system: "intuitionistic",
    systemLabel: "直観主義論理",
    chapter: "直観主義への扉",
    stage: 17,
    difficulty: 4,
    premises: ["A ∨ B", "¬B"],
    conclusion: "A",
    optimalSteps: 6,
    hints: [
      "A ∨ B に ∨E を使うため、A → A と B → A を作ります。",
      "A を仮定して A を選択し、→I で A → A を作れます。",
      "B を仮定して ¬B と ¬E で ⊥、⊥E で A、→I で B → A を作ります。"
    ],
    provable: true
  },
  {
    id: "classical-double-negation-001",
    title: "二重否定を外す",
    system: "classical",
    systemLabel: "古典論理",
    chapter: "古典論理",
    stage: 18,
    difficulty: 1,
    premises: ["¬¬A"],
    conclusion: "A",
    optimalSteps: 1,
    hints: [
      "古典論理では ¬¬E が使えます。",
      "¬¬A を選択します。",
      "¬¬E を押します。"
    ],
    provable: true
  },
  {
    id: "classical-double-negation-002",
    title: "古典論理で戻る",
    system: "classical",
    systemLabel: "古典論理",
    chapter: "古典論理",
    stage: 20,
    difficulty: 2,
    premises: ["¬A → ⊥"],
    conclusion: "A",
    optimalSteps: 2,
    hints: [
      "¬¬A は ¬A → ⊥ と同じ形です。",
      "¬A → ⊥ は parser 上も ¬¬A として扱えます。",
      "¬¬E を押します。"
    ],
    provable: true
  }
];

export function getProblemById(problemId) {
  return problems.find(problem => problem.id === problemId) || problems[0];
}
