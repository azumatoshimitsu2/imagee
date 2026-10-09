# スパイの4方向スプライト

Built-in `image_gen` を使用。参照画像は `../characters/bazaar-escort-directions-v1.png`（画風・頭身の参考）。

採用画像: `vektena-spy-v1.png`。アトラス: `vektena-spy-v1.json`。
2×2の順序は前・右・左・後ろ。画像の加工は生成ツール内で行い、JSONのみアルファ領域から算出。ゲーム上の表示高は70px。

## 作成プロンプト

Use case: stylized-concept. Asset type: transparent four-direction RPG enemy sprite atlas. Reference image is STYLE ONLY: match its compact approximately three-head-tall proportions, crisp detailed illustrated pixel-art finish and top-down RPG slight elevated camera. Create ONE sinister spy character shown four times in a clean 2 by 2 grid, equal square cells on a genuinely transparent alpha background. Top-left FRONT facing viewer/down, top-right RIGHT true profile, bottom-left LEFT true profile, bottom-right BACK facing away/up. Same character and costume in all four views: dark slate hood, charcoal short cloak, muted burgundy scarf covering mouth, narrow stern visible eyes, leather gloves and boots, slim utility belt and small sheathed dagger. Readable gray highlights on dark fabric so silhouette is distinct on a dim street. Threatening stealth pursuer, not civilian, but family-friendly no gore. Full body, each about three head heights, large head and short legs, same scale and feet alignment inside every cell, generous transparent gutters, no clipping, no cast ground shadows. Do not copy the reference characters; create new enemy only. No text, labels, watermark, scenery or grid lines.

## 背景透過の修正プロンプト（最終採用）

Use case: background-extraction. Edit this enemy sprite atlas: remove ALL the gray and white checkerboard backdrop, replacing it with genuine transparent alpha pixels (RGBA PNG). The checkerboard was accidentally painted into the image; no checkerboard may remain in output. Keep all four spy characters EXACTLY as they are, including clothing, color, size, positions and directions. Preserve the 2x2 layout. Only background removal, no new content, no text or borders. Deliver real transparent background.
