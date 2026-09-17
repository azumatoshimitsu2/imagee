# Lit core 3.3.3

公式のビルド済みES Moduleを無改変で同梱。アプリ側のビルド工程は不要。

- 配布元: https://cdn.jsdelivr.net/gh/lit/dist@3.3.3/core/lit-core.min.js
- 公式手順: https://lit.dev/docs/getting-started/#use-bundles
- ライセンス: BSD-3-Clause。同梱LICENSEの取得元: https://cdn.jsdelivr.net/npm/lit@3.3.3/LICENSE
- SHA-256: `f607f470475d8ab790754cb70f72cdbe2390c4a57ab59df6cdb360eeb72bd87c`

利用側は `../vendor/lit.js` をimportする。npm依存・CDN読込・import mapは不要。
更新時は固定versionの公式配布を取得し、ファイル名、入口、出典、ハッシュを更新してブラウザテストを行う。coreに含まれない追加機能が必要な場合は、ライブラリ追加の必要性を別途検討する。
