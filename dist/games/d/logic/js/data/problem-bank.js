export const LOGIC_CATEGORIES = ['minimal', 'intuitionistic', 'classical'];
export const LOGIC_DIFFICULTY_LEVELS = ['all', '初級', '中級', '上級'];

export const LOGIC_RULES = {
  minimal: ['前提', '仮定', '→-導入', '→-除去', '∧-導入', '∧-除去', '∨-導入', '∨-除去', '¬-導入', '¬-除去'],
  intuitionistic: ['前提', '仮定', '→-導入', '→-除去', '∧-導入', '∧-除去', '∨-導入', '∨-除去', '¬-導入', '¬-除去'],
  classical: ['前提', '仮定', '→-導入', '→-除去', '∧-導入', '∧-除去', '∨-導入', '∨-除去', '¬-導入', '¬-除去', '反証法', '二重否定除去', '排中律']
};

const BASE_PROBLEM_BANK = {
  minimal: [
    {
      id: 'minimal-1',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → (A → B)'],
      conclusion: 'A → B',
      difficulty: '初級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (A → B) から A → B を導け。',
      solution: [
        { formula: 'A → (A → B)', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'A → B', rule: '→-除去', deps: [1, 2] },
        { formula: 'B', rule: '→-除去', deps: [3, 2] },
        { formula: 'A → B', rule: '→-導入', deps: [2, 4] }
      ]
    },
    {
      id: 'minimal-2',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → B', 'A'],
      conclusion: 'B',
      difficulty: '初級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と A から B を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'minimal-3',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → B', 'B → C'],
      conclusion: 'A → C',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と B → C から A → C を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '→-除去', deps: [2, 4] },
        { formula: 'A → C', rule: '→-導入', deps: [3, 5] }
      ]
    },
    {
      id: 'minimal-4',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → (B → C)', 'A', 'B'],
      conclusion: 'C',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (B → C) と A と B から C を導け。',
      solution: [
        { formula: 'A → (B → C)', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '→-除去', deps: [1, 2] },
        { formula: 'C', rule: '→-除去', deps: [4, 3] }
      ]
    },
    {
      id: 'minimal-5',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → B', 'B → C', 'C → D'],
      conclusion: 'A → D',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と B → C と C → D から A → D を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '前提', deps: [] },
        { formula: 'C → D', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 4] },
        { formula: 'C', rule: '→-除去', deps: [2, 5] },
        { formula: 'D', rule: '→-除去', deps: [3, 6] },
        { formula: 'A → D', rule: '→-導入', deps: [4, 7] }
      ]
    },
    {
      id: 'minimal-6',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → (B → C)', 'A → B', 'A'],
      conclusion: 'C',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (B → C) と A → B と A から C を導け。',
      solution: [
        { formula: 'A → (B → C)', rule: '前提', deps: [] },
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [2, 3] },
        { formula: 'B → C', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '→-除去', deps: [5, 4] }
      ]
    }
  ],
  intuitionistic: [
    {
      id: 'intuitionistic-1',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → B', 'A'],
      conclusion: 'B',
      difficulty: '初級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と A から B を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'intuitionistic-2',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → (B → C)', 'A', 'B'],
      conclusion: 'C',
      difficulty: '初級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (B → C) と A と B から C を導け。',
      solution: [
        { formula: 'A → (B → C)', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '→-除去', deps: [1, 2] },
        { formula: 'C', rule: '→-除去', deps: [4, 3] }
      ]
    },
    {
      id: 'intuitionistic-3',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → B', 'B → C', 'A'],
      conclusion: 'C',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と B → C と A から C を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '→-除去', deps: [2, 4] }
      ]
    },
    {
      id: 'intuitionistic-4',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → (B → C)', 'A → B', 'A'],
      conclusion: 'C',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (B → C) と A → B と A から C を導け。',
      solution: [
        { formula: 'A → (B → C)', rule: '前提', deps: [] },
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [2, 3] },
        { formula: 'B → C', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '→-除去', deps: [5, 4] }
      ]
    },
    {
      id: 'intuitionistic-5',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → B', 'B → C', 'C → D', 'A'],
      conclusion: 'D',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → B と B → C と C → D と A から D を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '前提', deps: [] },
        { formula: 'C → D', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 4] },
        { formula: 'C', rule: '→-除去', deps: [2, 5] },
        { formula: 'D', rule: '→-除去', deps: [3, 6] }
      ]
    },
    {
      id: 'intuitionistic-6',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → (B → C)', 'A → B', 'A'],
      conclusion: 'C',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去'],
      prompt: 'A → (B → C) と A → B と A から C を導け。',
      solution: [
        { formula: 'A → (B → C)', rule: '前提', deps: [] },
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [2, 3] },
        { formula: 'B → C', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '→-除去', deps: [5, 4] }
      ]
    }
  ],
  classical: [
    {
      id: 'classical-1',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['A ∨ ¬A'],
      conclusion: 'A ∨ ¬A',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '反証法', '排中律'],
      prompt: '排中律の利用を含めて、自分で証明を組み立てよ。',
      solution: [
        { formula: 'A ∨ ¬A', rule: '排中律', deps: [] }
      ]
    },
    {
      id: 'classical-2',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['¬¬A'],
      conclusion: 'A',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '二重否定除去', '反証法'],
      prompt: '¬¬A から A を導け。',
      solution: [
        { formula: '¬¬A', rule: '前提', deps: [] },
        { formula: 'A', rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      id: 'classical-3',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['A → B', '¬B'],
      conclusion: '¬A',
      difficulty: '中級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去', '反証法'],
      prompt: 'A → B と ¬B から ¬A を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: '¬B', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 3] },
        { formula: '¬A', rule: '反証法', deps: [2, 4] }
      ]
    },
    {
      id: 'classical-4',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['A → B', 'B → C', '¬C'],
      conclusion: '¬A',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-導入', '→-除去', '反証法'],
      prompt: 'A → B と B → C と ¬C から ¬A を導け。',
      solution: [
        { formula: 'A → B', rule: '前提', deps: [] },
        { formula: 'B → C', rule: '前提', deps: [] },
        { formula: '¬C', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B', rule: '→-除去', deps: [1, 4] },
        { formula: 'C', rule: '→-除去', deps: [2, 5] },
        { formula: '¬A', rule: '反証法', deps: [3, 6] }
      ]
    },
    {
      id: 'classical-5',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['¬¬(A ∨ ¬A)'],
      conclusion: 'A ∨ ¬A',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '二重否定除去', '反証法', '排中律'],
      prompt: '¬¬(A ∨ ¬A) から A ∨ ¬A を導け。',
      solution: [
        { formula: '¬¬(A ∨ ¬A)', rule: '前提', deps: [] },
        { formula: 'A ∨ ¬A', rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      id: 'classical-6',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['A ∨ ¬A', '¬A'],
      conclusion: '¬A',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '反証法', '排中律'],
      prompt: 'A ∨ ¬A と ¬A から ¬A を導け。',
      solution: [
        { formula: 'A ∨ ¬A', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] }
      ]
    }
  ]
};

const LETTERS = ['A', 'B', 'C', 'D', 'P', 'Q', 'R'];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function generateFormulaPair() {
  const left = randomFrom(LETTERS);
  const right = randomFrom(LETTERS.filter((letter) => letter !== left));
  return { left, right };
}

export function buildGeneratedProblem(category, index, difficulty = 'all') {
  const { left: a, right: b } = generateFormulaPair();
  const { left: c, right: d } = generateFormulaPair();

  const pickTemplate = (templates) => {
    if (difficulty === 'all') {
      return templates[index % templates.length];
    }

    const matching = templates.filter((template) => template.difficulty === difficulty);
    return matching.length > 0 ? matching[index % matching.length] : templates[index % templates.length];
  };

  const minimalTemplates = [
    {
      premises: [`${a} ∧ ${b}`],
      conclusion: `${a}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`],
      conclusion: `${a} ∨ ${b}`,
      difficulty: '初級',
      prompt: `${a} から ${a} ∨ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${a} ∨ ${b}`, rule: '∨-導入', deps: [1] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a}`],
      conclusion: `${b}`,
      difficulty: '初級',
      prompt: `${a} → ${b} と ${a} から ${b} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${b} → ${c}`, `${a}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} → ${b} と ${b} → ${c} と ${a} から ${c} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] }
      ]
    },
    {
      premises: [`${a} → (${b} → ${c})`, `${a}`, `${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} → (${b} → ${c}) と ${a} と ${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} → (${b} → ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '→-除去', deps: [1, 2] },
        { formula: `${c}`, rule: '→-除去', deps: [4, 3] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} → ${c})`, `${a}`, `${b}`],
      conclusion: `${c}`,
      difficulty: '上級',
      prompt: `${a} ∧ (${b} → ${c}) と ${a} と ${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} → ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [4, 3] }
      ]
    },
    {
      premises: [`${a} → (${b} ∨ ${c})`, `${a}`],
      conclusion: `${b} ∨ ${c}`,
      difficulty: '上級',
      prompt: `${a} → (${b} ∨ ${c}) と ${a} から ${b} ∨ ${c} を導け。`,
      solution: [
        { formula: `${a} → (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${b} → ${c}`],
      conclusion: `${c}`,
      difficulty: '上級',
      prompt: `${a} ∧ ${b} と ${b} → ${c} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 3] }
      ]
    }
  ];

  const intuitionisticTemplates = [
    {
      premises: [`${a} ∧ ${b}`],
      conclusion: `${a}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '初級',
      prompt: `${a} と ${b} から ${a} ∧ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a}`],
      conclusion: `${b}`,
      difficulty: '初級',
      prompt: `${a} → ${b} と ${a} から ${b} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${b} → ${c}`, `${a}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} → ${b} と ${b} → ${c} と ${a} から ${c} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} → ${c})`, `${a}`],
      conclusion: `${b} → ${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ (${b} → ${c}) と ${a} から ${b} → ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} → ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a} → (${b} ∨ ${c})`, `${a}`],
      conclusion: `${b} ∨ ${c}`,
      difficulty: '上級',
      prompt: `${a} → (${b} ∨ ${c}) と ${a} から ${b} ∨ ${c} を導け。`,
      solution: [
        { formula: `${a} → (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${b} → ${c}`, `${a} → ${d}`],
      conclusion: `${c} ∧ ${d}`,
      difficulty: '上級',
      prompt: `${a} ∧ ${b} と ${b} → ${c} と ${a} → ${d} から ${c} ∧ ${d} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a} → ${d}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${d}`, rule: '→-除去', deps: [3, 6] },
        { formula: `${c} ∧ ${d}`, rule: '∧-導入', deps: [5, 7] }
      ]
    }
  ];

  const classicalTemplates = [
    {
      premises: [`${a} ∧ ${b}`],
      conclusion: `${a}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a} ∨ ${b}`, `¬${a}`],
      conclusion: `${b}`,
      difficulty: '初級',
      prompt: `${a} ∨ ${b} と ¬${a} から ${b} を導け。`,
      solution: [
        { formula: `${a} ∨ ${b}`, rule: '前提', deps: [] },
        { formula: `¬${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '∨-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`¬¬${a}`],
      conclusion: `${a}`,
      difficulty: '初級',
      prompt: `¬¬${a} から ${a} を導け。`,
      solution: [
        { formula: `¬¬${a}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      premises: [`¬¬(${a} ∨ ¬${a})`],
      conclusion: `${a} ∨ ¬${a}`,
      difficulty: '上級',
      prompt: `¬¬(${a} ∨ ¬${a}) から ${a} ∨ ¬${a} を導け。`,
      solution: [
        { formula: `¬¬(${a} ∨ ¬${a})`, rule: '前提', deps: [] },
        { formula: `${a} ∨ ¬${a}`, rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '上級',
      prompt: `${a} と ${b} から ${a} ∧ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] }
      ]
    }
  ];

  const templateBank = {
    minimal: minimalTemplates,
    intuitionistic: intuitionisticTemplates,
    classical: classicalTemplates
  };

  const templates = templateBank[category] ?? minimalTemplates;
  const template = pickTemplate(templates);

  return {
    id: `${category}-gen-${Date.now()}-${index}`,
    category,
    title: `問題 ${index + 1}`,
    premiseLabel: '⊢',
    premises: template.premises,
    conclusion: template.conclusion,
    difficulty: template.difficulty,
    availableRules: LOGIC_RULES[category] ?? LOGIC_RULES.minimal,
    prompt: template.prompt,
    solution: template.solution
  };
}

export function generateProblemSet(category, count = 5, difficulty = 'all') {
  const safeCategory = LOGIC_CATEGORIES.includes(category) ? category : 'minimal';
  const base = (BASE_PROBLEM_BANK[safeCategory] ?? []).map((problem) => ({
    ...problem,
    availableRules: LOGIC_RULES[safeCategory]
  }));
  const generated = Array.from({ length: Math.max(5, count) }, (_, index) => {
    const problem = buildGeneratedProblem(safeCategory, index + base.length + 1, difficulty);
    return {
      ...problem,
      availableRules: LOGIC_RULES[safeCategory]
    };
  });

  return [...base, ...generated]
    .filter((problem) => difficulty === 'all' || problem.difficulty === difficulty)
    .slice(0, count)
    .map((problem, index) => ({
      ...problem,
      availableRules: LOGIC_RULES[safeCategory],
      title: `問題 ${index + 1}`
    }));
}

export function getProblemBank(category, count = 5, difficulty = 'all') {
  return generateProblemSet(category, count, difficulty);
}

export function selectProblem(problems, problemId) {
  return problems.find((problem) => problem.id === problemId) ?? problems[0] ?? null;
}
