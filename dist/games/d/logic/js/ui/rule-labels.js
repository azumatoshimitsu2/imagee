const RULE_LABELS = {
  前提: '前提 (Prem)',
  仮定: '仮定 (Asm)',
  '→-導入': '→-導入 (→I)',
  '→-除去': '→-除去 (→E)',
  '∧-導入': '∧-導入 (∧I)',
  '∧-除去': '∧-除去 (∧E)',
  '∨-導入': '∨-導入 (∨I)',
  '∨-除去': '∨-除去 (∨E)',
  '¬-導入': '¬-導入 (¬I)',
  '¬-除去': '¬-除去 / 矛盾 (¬E)',
  反証法: '反証法 (RAA)',
  二重否定除去: '二重否定除去 (DNE)',
  排中律: '排中律 (LEM)'
};

export function formatRuleLabel(rule) {
  return RULE_LABELS[rule] ?? rule;
}
