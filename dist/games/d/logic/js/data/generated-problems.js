const ATOMS = ["A", "B", "C", "P", "Q", "R"];

const SYSTEM_LABELS = {
  minimal: "最小論理",
  intuitionistic: "直観主義論理",
  classical: "古典論理"
};

const commonMinimalTemplates = [
    {
      title: "ANDを作る",
      premises: ["{x}", "{y}"],
      conclusion: "{x} ∧ {y}",
      optimalSteps: 1,
      hints: ["2つの前提を選択します。", "∧I を使います。"]
    },
    {
      title: "ANDを入れ替える",
      premises: ["{x} ∧ {y}"],
      conclusion: "{y} ∧ {x}",
      optimalSteps: 3,
      hints: ["左右を別々に取り出します。", "取り出した順番を逆にして ∧I を使います。"]
    },
    {
      title: "含意を使う",
      premises: ["{x} → {y}", "{x}"],
      conclusion: "{y}",
      optimalSteps: 1,
      hints: ["A → B と A の形を探します。", "→E を使います。"]
    },
    {
      title: "含意を作る",
      premises: ["{x}"],
      conclusion: "{y} → {x}",
      optimalSteps: 2,
      hints: ["結論が含意なので、左側を仮定します。", "外側の前提を使って →I で閉じます。"]
    },
    {
      title: "含意をつなぐ",
      premises: ["{x} → {y}", "{y} → {z}"],
      conclusion: "{x} → {z}",
      optimalSteps: 4,
      hints: ["{x} を仮定します。", "→E を2回使い、最後に →I を使います。"]
    },
    {
      title: "否定を作る",
      premises: ["{x} → {y}", "¬{y}"],
      conclusion: "¬{x}",
      optimalSteps: 4,
      hints: ["{x} を仮定して矛盾を目指します。", "{y} と ¬{y} から ⊥ を導き、¬I で閉じます。"]
    },
    {
      title: "ORを足す",
      premises: ["{x}"],
      conclusion: "{x} ∨ {y}",
      optimalSteps: 1,
      hints: ["∨I 右を使います。", "追加する式として {y} を入力します。"]
    },
    {
      title: "ORの場合分け",
      premises: ["{x} ∨ {y}", "{x} → {z}", "{y} → {z}"],
      conclusion: "{z}",
      optimalSteps: 1,
      hints: ["3行を選択します。", "∨E を使います。"]
    },
  ];

const templates = {
  minimalOnly: [
    {
      title: "最小論理の壁",
      premises: ["{x} ∨ {y}", "¬{y}"],
      conclusion: "{x}",
      optimalSteps: null,
      hints: ["{y} の場合は ⊥ までは進めます。", "最小論理では ⊥E が使えません。"],
      provable: false,
      unprovableExplanation: "最小論理では ⊥E が使えないため、この形は一般には証明できません。"
    }
  ],
  intuitionistic: [
    {
      title: "矛盾から導く",
      premises: ["⊥"],
      conclusion: "{x}",
      optimalSteps: 1,
      hints: ["直観主義論理では ⊥E が使えます。", "⊥ を選択して {x} を入力します。"]
    },
    {
      title: "矛盾からORへ",
      premises: ["{x}", "¬{x}"],
      conclusion: "{y}",
      optimalSteps: 2,
      hints: ["まず ¬E で ⊥ を作ります。", "⊥E で {y} を導きます。"]
    },
    {
      title: "直観主義の場合分け",
      premises: ["{x} ∨ {y}", "¬{y}"],
      conclusion: "{x}",
      optimalSteps: 6,
      hints: ["{x} → {x} と {y} → {x} を作ります。", "{y} の場合は ¬{y} と合わせて ⊥E を使います。"]
    }
  ],
  classical: [
    {
      title: "二重否定を外す",
      premises: ["¬¬{x}"],
      conclusion: "{x}",
      optimalSteps: 1,
      hints: ["古典論理では ¬¬E が使えます。", "¬¬{x} を選択して ¬¬E を押します。"]
    },
    {
      title: "否定から戻る",
      premises: ["¬{x} → ⊥"],
      conclusion: "{x}",
      optimalSteps: 1,
      hints: ["¬{x} → ⊥ は ¬¬{x} と同じ形として扱えます。", "¬¬E を使います。"]
    }
  ]
};

export function generatePracticeProblem(system) {
  const availableTemplates = [
    ...commonMinimalTemplates,
    ...(system === "minimal" ? templates.minimalOnly : []),
    ...(system === "intuitionistic" || system === "classical" ? templates.intuitionistic : []),
    ...(system === "classical" ? templates.classical : [])
  ];
  const template = sample(availableTemplates);
  const replacements = createReplacements();
  const problemNumber = Date.now().toString(36);

  return {
    id: `practice-${system}-${problemNumber}-${Math.floor(Math.random() * 10000)}`,
    title: template.title,
    system,
    systemLabel: SYSTEM_LABELS[system],
    chapter: "無限練習",
    stage: "∞",
    difficulty: 2,
    premises: template.premises.map(value => fill(value, replacements)),
    conclusion: fill(template.conclusion, replacements),
    optimalSteps: template.optimalSteps,
    hints: template.hints.map(value => fill(value, replacements)),
    provable: template.provable ?? true,
    unprovableExplanation: template.unprovableExplanation,
    generated: true
  };
}

function createReplacements() {
  const shuffledAtoms = [...ATOMS].sort(() => Math.random() - 0.5);

  return {
    x: shuffledAtoms[0],
    y: shuffledAtoms[1],
    z: shuffledAtoms[2]
  };
}

function fill(value, replacements) {
  return value
    .replaceAll("{x}", replacements.x)
    .replaceAll("{y}", replacements.y)
    .replaceAll("{z}", replacements.z);
}

function sample(values) {
  return values[Math.floor(Math.random() * values.length)];
}
