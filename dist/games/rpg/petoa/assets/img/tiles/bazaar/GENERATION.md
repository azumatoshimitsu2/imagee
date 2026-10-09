# Bazaar city asset set

Created 2026-09-19 with built-in image_gen. Bangkok-inspired contemporary tropical city with preserved historic architecture. No real brands or signage text. Original PNG outputs preserved.

## Terrain — bazaar-ground-v1.png

Four frames: sidewalk, asphalt, heritage-brick, canal. Frame coordinates in the matching JSON atlas. Generated repeat textures; edge continuity should be reviewed in the assembled map.

Final prompt:
+Use case: stylized-concept. Create a production terrain TEXTURE TILE SHEET for PETOA, a crisp 16-bit top-down JRPG. Fictional tropical bazaar city inspired by Bangkok, blending contemporary urban streets with historic Thai architecture. This asset contains GROUND TEXTURES ONLY, no buildings, people or props.
Square 1024x1024 canvas divided into EXACTLY 2 columns x 2 rows of equally sized square tiles, each occupying precisely one quadrant with NO gutter, border, padding or labels. Four distinct flat overhead repeating textures:
TOP LEFT: pale warm-gray rectangular concrete sidewalk pavers, subtle wear, modern urban footpath.
TOP RIGHT: medium charcoal blue-gray asphalt, restrained fine speckling, no traffic lines, no manhole, no large cracks.
BOTTOM LEFT: muted warm terracotta small rectangular heritage courtyard bricks in orderly staggered rows, gently worn edges.
BOTTOM RIGHT: tropical urban canal water, muted deep teal-blue with restrained short pixel ripples, no banks, no objects.
Each individual quadrant must tile seamlessly on all four edges: evenly distributed texture, no vignette, no directional light gradient, no central icon, no painted outer frame. Identical logical texel scale across all four quadrants, approximately a 32x32 pixel tile enlarged using crisp nearest-neighbor square clusters. Fine enough to repeat across a map without dominating NPC sprites. Limited rich but restrained palette, deliberate pixel clusters, subtle two-to-four-tone shading. Ground viewed straight down, absolutely no isometric plane or perspective. Full opaque image, all corners filled. No text, no grid lines, no watermark, no mockup, no scene illustration. Match compact classic SNES JRPG map graphics rather than realistic textures.

## Buildings — bazaar-buildings-v1.png

Four transparent building sprites. Matching JSON uses a row boundary at y=604 to preserve the temple finial. The PNG is not a 32px native tile sheet; scale frames at rendering time with nearest-neighbor filtering.

Final prompt:
+Use case: stylized-concept. Production PNG BUILDING SPRITE ATLAS for PETOA top-down 16-bit JRPG: a fictional bazaar city inspired by Bangkok, where contemporary urban life and historic Thai architecture coexist.
Square canvas, EXACTLY FOUR independent buildings in a precise TWO BY TWO equal-cell grid. TRUE TRANSPARENT alpha background around all buildings and in wide gutters. Each sprite centered entirely within its quadrant, full roof and base visible, substantial transparent margins, no overlap or connected scenery. These are separate map-placeable assets, not a city panorama.
TOP LEFT: contemporary THREE-STORY Thai shophouse, off-white concrete, teal metal window frames, modest balconies with potted plants, external air-conditioning units, small roof water tank, ground-floor glass storefront with a coral-red retractable awning and BLANK rectangular sign panel. Practical current-day commercial building.
TOP RIGHT: preserved TWO-STORY historic tropical shophouse, faded pale yellow plaster, dark teak shutters and carved timber balcony, tiled terracotta roof, shaded ground-floor shop arcade with plain muted green awning, restrained age and patina, still in use.
BOTTOM LEFT: historic Thai temple hall, compact white stucco base, layered red and deep green tiled gable roof with slender gold chofa-like finials and ornate gold gable trim, dark entrance and short front steps. Thai architecture, not Chinese/Japanese pagoda, not Middle Eastern dome. No people, deities or writing.
BOTTOM RIGHT: modern FOUR-STORY urban apartment/commercial block, light gray concrete, blue-gray glass, flat roof, a few air-conditioning units, tidy balconies and green plants, ground-floor shaded entrance, contemporary proportions.
All four roofs and facades are visible in a classic straight-on three-quarter TOP-DOWN JRPG map view with front wall facing DOWN, roof seen from above, vertical walls, parallel horizontal facades; NOT diamond isometric, NOT horizon perspective. Coherent scale: doors fit a roughly 32-48 logical pixel NPC, buildings rendered as detailed but compact 96-160 logical pixel sprites enlarged crisp. Selective dark outlines, deliberate square pixel clusters, two-to-four-tone material shading, warm tropical daylight from upper left. Respectfully observed everyday architecture, not exotic caricature.
No ground slabs, no streets connecting assets, no backdrop, no cast shadow extending outside cells, no people, cars or skyline. NO words, signage letters, captions, cell labels, watermark, borders or grid lines. Actual transparent PNG alpha. Match a polished retro JRPG tileset, not a painting or photorealistic render.

Used in the shared bazaar harbor map for scenes 11 and 12, and in scene 13 for the explorable city. The landing continues from the sea onto the quay without changing maps.
