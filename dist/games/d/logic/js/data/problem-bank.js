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
      premises: ['A ∧ B', 'A → C', 'B → D'],
      conclusion: 'C ∧ D',
      difficulty: '初級',
      availableRules: ['前提', '→-除去', '∧-導入', '∧-除去'],
      prompt: 'A ∧ B、A → C、B → D から C ∧ D を導け。',
      solution: [
        { formula: 'A ∧ B', rule: '前提', deps: [] },
        { formula: 'A → C', rule: '前提', deps: [] },
        { formula: 'B → D', rule: '前提', deps: [] },
        { formula: 'A', rule: '∧-除去', deps: [1] },
        { formula: 'B', rule: '∧-除去', deps: [1] },
        { formula: 'C', rule: '→-除去', deps: [2, 4] },
        { formula: 'D', rule: '→-除去', deps: [3, 5] },
        { formula: 'C ∧ D', rule: '∧-導入', deps: [6, 7] }
      ]
    },
    {
      id: 'minimal-2',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A', '¬A'],
      conclusion: '⊥',
      difficulty: '初級',
      availableRules: ['前提', '¬-除去'],
      prompt: 'A と ¬A から矛盾 ⊥ を導け。',
      solution: [
        { formula: 'A', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] },
        { formula: '⊥', rule: '¬-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'minimal-3',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A', 'B'],
      conclusion: 'A ∧ B',
      difficulty: '中級',
      availableRules: ['前提', '∧-導入'],
      prompt: 'A と B から A ∧ B を導け。',
      solution: [
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '前提', deps: [] },
        { formula: 'A ∧ B', rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      id: 'minimal-4',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A ∨ B', '¬A'],
      conclusion: 'B',
      difficulty: '中級',
      availableRules: ['前提', '∨-除去'],
      prompt: 'A ∨ B と ¬A から B を導け。',
      solution: [
        { formula: 'A ∨ B', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] },
        { formula: 'B', rule: '∨-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'minimal-5',
      category: 'minimal',
      premiseLabel: '⊢',
      premises: ['A → (B ∧ C)', '¬C'],
      conclusion: '¬A',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-除去', '∧-除去', '¬-導入', '¬-除去'],
      prompt: 'A → (B ∧ C) と ¬C から ¬A を導け。',
      solution: [
        { formula: 'A → (B ∧ C)', rule: '前提', deps: [] },
        { formula: '¬C', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B ∧ C', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '∧-除去', deps: [4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 2] },
        { formula: '¬A', rule: '¬-導入', deps: [3, 6] }
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
      premises: ['A ∧ B', 'A → C', 'B → D'],
      conclusion: 'C ∧ D',
      difficulty: '初級',
      availableRules: ['前提', '→-除去', '∧-導入', '∧-除去'],
      prompt: 'A ∧ B、A → C、B → D から C ∧ D を導け。',
      solution: [
        { formula: 'A ∧ B', rule: '前提', deps: [] },
        { formula: 'A → C', rule: '前提', deps: [] },
        { formula: 'B → D', rule: '前提', deps: [] },
        { formula: 'A', rule: '∧-除去', deps: [1] },
        { formula: 'B', rule: '∧-除去', deps: [1] },
        { formula: 'C', rule: '→-除去', deps: [2, 4] },
        { formula: 'D', rule: '→-除去', deps: [3, 5] },
        { formula: 'C ∧ D', rule: '∧-導入', deps: [6, 7] }
      ]
    },
    {
      id: 'intuitionistic-2',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A', '¬A'],
      conclusion: '⊥',
      difficulty: '初級',
      availableRules: ['前提', '¬-除去'],
      prompt: 'A と ¬A から矛盾 ⊥ を導け。',
      solution: [
        { formula: 'A', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] },
        { formula: '⊥', rule: '¬-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'intuitionistic-3',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A', 'B'],
      conclusion: 'A ∧ B',
      difficulty: '中級',
      availableRules: ['前提', '∧-導入'],
      prompt: 'A と B から A ∧ B を導け。',
      solution: [
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '前提', deps: [] },
        { formula: 'A ∧ B', rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      id: 'intuitionistic-4',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A ∨ B', '¬A'],
      conclusion: 'B',
      difficulty: '中級',
      availableRules: ['前提', '∨-除去'],
      prompt: 'A ∨ B と ¬A から B を導け。',
      solution: [
        { formula: 'A ∨ B', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] },
        { formula: 'B', rule: '∨-除去', deps: [1, 2] }
      ]
    },
    {
      id: 'intuitionistic-5',
      category: 'intuitionistic',
      premiseLabel: '⊢',
      premises: ['A → (B ∧ C)', '¬C'],
      conclusion: '¬A',
      difficulty: '上級',
      availableRules: ['前提', '仮定', '→-除去', '∧-除去', '¬-導入', '¬-除去'],
      prompt: 'A → (B ∧ C) と ¬C から ¬A を導け。',
      solution: [
        { formula: 'A → (B ∧ C)', rule: '前提', deps: [] },
        { formula: '¬C', rule: '前提', deps: [] },
        { formula: 'A', rule: '仮定', deps: [] },
        { formula: 'B ∧ C', rule: '→-除去', deps: [1, 3] },
        { formula: 'C', rule: '∧-除去', deps: [4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 2] },
        { formula: '¬A', rule: '¬-導入', deps: [3, 6] }
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
      premises: ['A ∧ B', 'A → C', '¬C'],
      conclusion: '⊥',
      difficulty: '中級',
      availableRules: ['前提', '→-除去', '∧-除去', '¬-除去'],
      prompt: 'A ∧ B、A → C、¬C から矛盾 ⊥ を導け。',
      solution: [
        { formula: 'A ∧ B', rule: '前提', deps: [] },
        { formula: 'A → C', rule: '前提', deps: [] },
        { formula: '¬C', rule: '前提', deps: [] },
        { formula: 'A', rule: '∧-除去', deps: [1] },
        { formula: 'C', rule: '→-除去', deps: [2, 4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 3] }
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
      premises: ['A', 'B'],
      conclusion: 'A ∧ B',
      difficulty: '中級',
      availableRules: ['前提', '∧-導入'],
      prompt: 'A と B から A ∧ B を導け。',
      solution: [
        { formula: 'A', rule: '前提', deps: [] },
        { formula: 'B', rule: '前提', deps: [] },
        { formula: 'A ∧ B', rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      id: 'classical-4',
      category: 'classical',
      premiseLabel: '⊢',
      premises: ['A ∨ B', '¬A'],
      conclusion: 'B',
      difficulty: '上級',
      availableRules: ['前提', '∨-除去'],
      prompt: 'A ∨ B と ¬A から B を導け。',
      solution: [
        { formula: 'A ∨ B', rule: '前提', deps: [] },
        { formula: '¬A', rule: '前提', deps: [] },
        { formula: 'B', rule: '∨-除去', deps: [1, 2] }
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

function generateFormulaQuad() {
  const shuffled = [...LETTERS].sort(() => Math.random() - 0.5);
  return {
    a: shuffled[0],
    b: shuffled[1],
    c: shuffled[2],
    d: shuffled[3]
  };
}

export function buildGeneratedProblem(category, index, difficulty = 'all') {
  const { a, b, c, d } = generateFormulaQuad();

  const pickTemplate = (templates) => {
    const source = difficulty === 'all'
      ? templates
      : templates.filter((template) => template.difficulty === difficulty);
    const matching = source.length > 0 ? source : templates;
    const richer = matching.filter((template) => template.complexity !== 'simple');
    const pool = richer.length > 0 ? richer : matching;
    return pool[index % pool.length];
  };

  const minimalTemplates = [
    {
      premises: [`${a} ∧ ${b}`],
      conclusion: `${a}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`, `¬${a}`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a} と ¬${a} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `¬${a}`, rule: '前提', deps: [] },
        { formula: '⊥', rule: '¬-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} → (${b} ∧ ${c})`, `¬${c}`],
      conclusion: `¬${a}`,
      difficulty: '初級',
      prompt: `${a} → (${b} ∧ ${c}) と ¬${c} から ¬${a} を導け。`,
      solution: [
        { formula: `${a} → (${b} ∧ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b} ∧ ${c}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '∧-除去', deps: [4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 2] },
        { formula: `¬${a}`, rule: '¬-導入', deps: [3, 6] }
      ]
    },
    {
      premises: [`${a}`, `${b}`, `¬(${a} ∧ ${b})`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a}、${b}、¬(${a} ∧ ${b}) から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `¬(${a} ∧ ${b})`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 3] }
      ]
    },
    {
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} と ${b} から ${a} ∧ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a}`],
      conclusion: `${a} ∨ ${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} から ${a} ∨ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${a} ∨ ${b}`, rule: '∨-導入', deps: [1] }
      ]
    },
    {
      premises: [],
      conclusion: `${a} → ${a}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `仮定を使って ${a} → ${a} を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${a} → ${a}`, rule: '→-導入', deps: [1, 1] }
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
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '初級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a}`],
      conclusion: `${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} → ${b} と ${a} から ${b} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `${b} → ${d}`],
      conclusion: `${c} ∧ ${d}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、${b} → ${d} から ${c} ∧ ${d} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${b} → ${d}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${b}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${d}`, rule: '→-除去', deps: [3, 5] },
        { formula: `${c} ∧ ${d}`, rule: '∧-導入', deps: [6, 7] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${b} → ${c}`],
      conclusion: `${a} → ${c}`,
      difficulty: '中級',
      prompt: `${a} → ${b} と ${b} → ${c} から、仮定を使って ${a} → ${c} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${a} → ${c}`, rule: '→-導入', deps: [3, 5] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `¬${b}`],
      conclusion: `¬${a}`,
      difficulty: '初級',
      prompt: `${a} → ${b} と ¬${b} から ¬${a} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 2] },
        { formula: `¬${a}`, rule: '¬-導入', deps: [3, 5] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `¬${c}`],
      conclusion: '⊥',
      difficulty: '中級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、¬${c} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `¬${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 3] }
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
      premises: [],
      conclusion: `${a} → (${b} → (${a} ∧ ${b}))`,
      difficulty: '上級',
      prompt: `二つの仮定を順に閉じて ${a} → (${b} → (${a} ∧ ${b})) を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '仮定', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: `${b} → (${a} ∧ ${b})`, rule: '→-導入', deps: [2, 3] },
        { formula: `${a} → (${b} → (${a} ∧ ${b}))`, rule: '→-導入', deps: [1, 4] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a} → ${c}`],
      conclusion: `${a} → (${b} ∧ ${c})`,
      difficulty: '上級',
      prompt: `${a} → ${b} と ${a} → ${c} から、仮定を使って ${a} → (${b} ∧ ${c}) を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 3] },
        { formula: `${b} ∧ ${c}`, rule: '∧-導入', deps: [4, 5] },
        { formula: `${a} → (${b} ∧ ${c})`, rule: '→-導入', deps: [3, 6] }
      ]
    },
    {
      premises: [`${a} → (${b} ∨ ${c})`, `${a}`],
      conclusion: `${b} ∨ ${c}`,
      difficulty: '上級',
      complexity: 'simple',
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
      complexity: 'simple',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`, `¬${a}`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a} と ¬${a} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `¬${a}`, rule: '前提', deps: [] },
        { formula: '⊥', rule: '¬-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a}`, `${b}`, `¬(${a} ∧ ${b})`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a}、${b}、¬(${a} ∧ ${b}) から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `¬(${a} ∧ ${b})`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 3] }
      ]
    },
    {
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} と ${b} から ${a} ∧ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] }
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
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '初級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [],
      conclusion: `${a} → ${a}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `仮定を使って ${a} → ${a} を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${a} → ${a}`, rule: '→-導入', deps: [1, 1] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a}`],
      conclusion: `${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} → ${b} と ${a} から ${b} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `${b} → ${d}`],
      conclusion: `${c} ∧ ${d}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、${b} → ${d} から ${c} ∧ ${d} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${b} → ${d}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${b}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${d}`, rule: '→-除去', deps: [3, 5] },
        { formula: `${c} ∧ ${d}`, rule: '∧-導入', deps: [6, 7] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${b} → ${c}`],
      conclusion: `${a} → ${c}`,
      difficulty: '中級',
      prompt: `${a} → ${b} と ${b} → ${c} から、仮定を使って ${a} → ${c} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${b} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${a} → ${c}`, rule: '→-導入', deps: [3, 5] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `¬${b}`],
      conclusion: `¬${a}`,
      difficulty: '初級',
      prompt: `${a} → ${b} と ¬${b} から ¬${a} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 2] },
        { formula: `¬${a}`, rule: '¬-導入', deps: [3, 5] }
      ]
    },
    {
      premises: [`${a} ∧ (${b} ∨ ${c})`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ (${b} ∨ ${c}) と ¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '∨-除去', deps: [3, 2] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `¬${c}`],
      conclusion: '⊥',
      difficulty: '中級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、¬${c} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `¬${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 3] }
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
      complexity: 'simple',
      prompt: `${a} → (${b} ∨ ${c}) と ${a} から ${b} ∨ ${c} を導け。`,
      solution: [
        { formula: `${a} → (${b} ∨ ${c})`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '→-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [],
      conclusion: `${a} → (${b} → (${a} ∧ ${b}))`,
      difficulty: '上級',
      prompt: `二つの仮定を順に閉じて ${a} → (${b} → (${a} ∧ ${b})) を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '仮定', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: `${b} → (${a} ∧ ${b})`, rule: '→-導入', deps: [2, 3] },
        { formula: `${a} → (${b} → (${a} ∧ ${b}))`, rule: '→-導入', deps: [1, 4] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a} → ${c}`],
      conclusion: `${a} → (${b} ∧ ${c})`,
      difficulty: '上級',
      prompt: `${a} → ${b} と ${a} → ${c} から、仮定を使って ${a} → (${b} ∧ ${c}) を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 3] },
        { formula: `${b} ∧ ${c}`, rule: '∧-導入', deps: [4, 5] },
        { formula: `${a} → (${b} ∧ ${c})`, rule: '→-導入', deps: [3, 6] }
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
      complexity: 'simple',
      prompt: `${a} ∧ ${b} から ${a} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] }
      ]
    },
    {
      premises: [`${a}`, `¬${a}`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a} と ¬${a} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `¬${a}`, rule: '前提', deps: [] },
        { formula: '⊥', rule: '¬-除去', deps: [1, 2] }
      ]
    },
    {
      premises: [`${a}`, `${b}`, `¬(${a} ∧ ${b})`],
      conclusion: '⊥',
      difficulty: '初級',
      prompt: `${a}、${b}、¬(${a} ∧ ${b}) から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `¬(${a} ∧ ${b})`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 3] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `¬${b}`],
      conclusion: `¬${a}`,
      difficulty: '初級',
      prompt: `${a} → ${b} と ¬${b} から ¬${a} を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: '⊥', rule: '¬-除去', deps: [4, 2] },
        { formula: `¬${a}`, rule: '¬-導入', deps: [3, 5] }
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
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `${a} と ${b} から ${a} ∧ ${b} を導け。`,
      solution: [
        { formula: `${a}`, rule: '前提', deps: [] },
        { formula: `${b}`, rule: '前提', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] }
      ]
    },
    {
      premises: [],
      conclusion: `${a} → ${a}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `仮定を使って ${a} → ${a} を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${a} → ${a}`, rule: '→-導入', deps: [1, 1] }
      ]
    },
    {
      premises: [`¬¬${a}`],
      conclusion: `${a}`,
      difficulty: '初級',
      complexity: 'simple',
      prompt: `¬¬${a} から ${a} を導け。`,
      solution: [
        { formula: `¬¬${a}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `${b} → ${d}`],
      conclusion: `${c} ∧ ${d}`,
      difficulty: '初級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、${b} → ${d} から ${c} ∧ ${d} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${b} → ${d}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${b}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: `${d}`, rule: '→-除去', deps: [3, 5] },
        { formula: `${c} ∧ ${d}`, rule: '∧-導入', deps: [6, 7] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${a} → ${c}`, `¬${c}`],
      conclusion: '⊥',
      difficulty: '中級',
      prompt: `${a} ∧ ${b}、${a} → ${c}、¬${c} から矛盾 ⊥ を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `¬${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '∧-除去', deps: [1] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 4] },
        { formula: '⊥', rule: '¬-除去', deps: [5, 3] }
      ]
    },
    {
      premises: [`¬${a} → ⊥`],
      conclusion: `${a}`,
      difficulty: '中級',
      prompt: `¬${a} → ⊥ から、反証法を使って ${a} を導け。`,
      solution: [
        { formula: `¬${a} → ⊥`, rule: '前提', deps: [] },
        { formula: `¬${a}`, rule: '仮定', deps: [] },
        { formula: '⊥', rule: '→-除去', deps: [1, 2] },
        { formula: `${a}`, rule: '反証法', deps: [2, 3] }
      ]
    },
    {
      premises: [`${a} ∧ ${b}`, `${b} ∨ ${c}`, `¬${b}`],
      conclusion: `${c}`,
      difficulty: '中級',
      prompt: `${a} ∧ ${b}、${b} ∨ ${c}、¬${b} から ${c} を導け。`,
      solution: [
        { formula: `${a} ∧ ${b}`, rule: '前提', deps: [] },
        { formula: `${b} ∨ ${c}`, rule: '前提', deps: [] },
        { formula: `¬${b}`, rule: '前提', deps: [] },
        { formula: `${c}`, rule: '∨-除去', deps: [2, 3] }
      ]
    },
    {
      premises: [`¬¬(${a} ∨ ¬${a})`],
      conclusion: `${a} ∨ ¬${a}`,
      difficulty: '上級',
      complexity: 'simple',
      prompt: `¬¬(${a} ∨ ¬${a}) から ${a} ∨ ¬${a} を導け。`,
      solution: [
        { formula: `¬¬(${a} ∨ ¬${a})`, rule: '前提', deps: [] },
        { formula: `${a} ∨ ¬${a}`, rule: '二重否定除去', deps: [1] }
      ]
    },
    {
      premises: [],
      conclusion: `${a} → (${b} → (${a} ∧ ${b}))`,
      difficulty: '上級',
      prompt: `二つの仮定を順に閉じて ${a} → (${b} → (${a} ∧ ${b})) を導け。`,
      solution: [
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '仮定', deps: [] },
        { formula: `${a} ∧ ${b}`, rule: '∧-導入', deps: [1, 2] },
        { formula: `${b} → (${a} ∧ ${b})`, rule: '→-導入', deps: [2, 3] },
        { formula: `${a} → (${b} → (${a} ∧ ${b}))`, rule: '→-導入', deps: [1, 4] }
      ]
    },
    {
      premises: [`${a} → ${b}`, `${a} → ${c}`],
      conclusion: `${a} → (${b} ∧ ${c})`,
      difficulty: '上級',
      prompt: `${a} → ${b} と ${a} → ${c} から、仮定を使って ${a} → (${b} ∧ ${c}) を導け。`,
      solution: [
        { formula: `${a} → ${b}`, rule: '前提', deps: [] },
        { formula: `${a} → ${c}`, rule: '前提', deps: [] },
        { formula: `${a}`, rule: '仮定', deps: [] },
        { formula: `${b}`, rule: '→-除去', deps: [1, 3] },
        { formula: `${c}`, rule: '→-除去', deps: [2, 3] },
        { formula: `${b} ∧ ${c}`, rule: '∧-導入', deps: [4, 5] },
        { formula: `${a} → (${b} ∧ ${c})`, rule: '→-導入', deps: [3, 6] }
      ]
    },
    {
      premises: [`${a}`, `${b}`],
      conclusion: `${a} ∧ ${b}`,
      difficulty: '上級',
      complexity: 'simple',
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
