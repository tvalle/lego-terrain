# LEGO part research and modeling decisions

Researched 2026-11-12. The app uses independently generated exterior models; it does not bundle third-party LDraw meshes.

## Dimensions

The [LDraw file format specification](https://www.ldraw.org/article/218.html) gives a stud pitch of 20 LDU, brick height of 24 LDU, plate height of 8 LDU, stud diameter of 12 LDU and stud height of 4 LDU. One LDU is approximately 0.4 mm.

The renderer uses one world unit per stud pitch. A plate is 0.4 units high, a brick 1.2, a stud 0.6 in diameter and 0.2 high. Adjacent rectangular exteriors leave a small seam. The studded foundation is a 32×32 baseplate by default, with a modeled 0.2-unit body.

## Catalog

[LEGO Pick a Brick](https://www.lego.com/de-de/pick-and-build/pick-a-brick?appearsIn=21593) confirms the 3001 2×4 brick, 3003 2×2 brick, 3004 1×2 brick and 3020 2×4 plate. The other footprints are named in the official LDraw parts library (individual reference files below).

| Part | Description | Footprint | Height in plates |
| --- | --- | --- | --- |
| [3001](https://library.ldraw.org/library/official/parts/3001.dat) | Brick | 2×4 | 3 |
| [3002](https://library.ldraw.org/library/official/parts/3002.dat) | Brick | 2×3 | 3 |
| [3003](https://library.ldraw.org/library/official/parts/3003.dat) | Brick | 2×2 | 3 |
| [3004](https://library.ldraw.org/library/official/parts/3004.dat) | Brick | 1×2 | 3 |
| [3005](https://library.ldraw.org/library/official/parts/3005.dat) | Brick | 1×1 | 3 |
| [3020](https://library.ldraw.org/library/official/parts/3020.dat) | Plate | 2×4 | 1 |
| [3021](https://library.ldraw.org/library/official/parts/3021.dat) | Plate | 2×3 | 1 |
| [3022](https://library.ldraw.org/library/official/parts/3022.dat) | Plate | 2×2 | 1 |
| [3023](https://library.ldraw.org/library/official/parts/3023.dat) | Plate | 1×2 | 1 |
| [3024](https://library.ldraw.org/library/official/parts/3024.dat) | Plate | 1×1 | 1 |
| [3039](https://library.ldraw.org/library/official/parts/3039.dat) | Slope 45° | 2×2 | 3 at high end |
| [3040b](https://library.ldraw.org/library/official/parts/3040b.dat) | Slope 45° | 1×2 | 3 at high end |
| [60481](https://library.ldraw.org/library/official/parts/60481a.dat) | Slope 65° | 1×2 | 6 at high end |
| [3678b](https://library.ldraw.org/library/official/parts/3678b.dat) | Slope 65° | 2×2 | 6 at high end |
| [4460b](https://library.ldraw.org/library/official/parts/4460b.dat) | Slope 75° catalog / 73° LEGO, hollow stud | 1×2 | 9 at high end |
| [98560 / 3684c](https://library.ldraw.org/library/official/parts/3684c.dat) | Slope 75° catalog / 73° LEGO, solid studs | 2×2 | 9 at high end |

The 3039 reference face runs 20 LDU horizontally and 20 LDU vertically. Its bottom nose is 4 LDU above the supporting plane. The top plateau is one stud deep. Only that plateau carries studs. The procedural models preserve this profile and rotate in 90-degree increments.

## Terrain assembly

The sculpting grid retains fractional heights for smooth brush accumulation and quantizes them to plate units when placing pieces. Local height drops select the steepest supported real profile: at least 8 plates for the 75° family, 5 for 65°, and 2 for 45°. The lower column needs at least one plate and both columns must share a color. A tall but gently sloping mountaintop still uses a gentle slope.

A slope's supporting plane is the lower height minus one plate. Its high row consumes 3, 6, or 9 plates; its nose row consumes one discrete heightfield layer. The actual angled face spans intermediate elevations above that nose, just as in the original 45° representation. Matching neighboring strips use a 2-stud-wide piece; other strips use a 1-stud-wide piece. If the cliff exceeds the steepest piece's rise, the remaining height above its flat studded upper row is filled with standard bricks and plates. No part is stretched or tilted away from its stud connections.

The packer reserves vertical intervals occupied by slope caps, then fills remaining volume from the bottom up. No assigned layer is duplicated; every piece's footprint has support beneath it or rests on the baseplate. Changes can repack nearby pieces. Colors apply to an entire stud column, so color boundaries prevent merging across them. A single stud column participates in at most one fitted slope; the editor is not a general rockwork assembly solver.

[Unity's terrain brush documentation](https://docs.unity.com/en-us/engine/6000.0/manual/creating-environments/script-terrain/terrain-tools/terrain-raise-lower-terrain) informed the drag-to-raise and Shift-drag-to-lower interaction with brush size and strength controls.

## Limits

- Models represent visible exterior shapes. Underside sockets, internal tubes, molded lettering, manufacturing tolerances, and clutch mechanics are omitted.
- Piece support and nonoverlap are tested; assembly strength, layer interlocking, and physical buildability are not certified.
- The palette is artistic and is not an exact LEGO color calibration or an inventory availability guarantee. The exported CSV labels colors as display colors.
- Supports six straight slope variants across the 45°, 65°, and nominal 75° families. Inverted, corner and curved slopes are not included.
- The heightfield cannot represent caves, overhangs, or independent suspended pieces.
- Baseplates imported at sizes other than 32×32 are editor surfaces, not a promise of a corresponding single real part.

## Steep-cliff verification

The user's reference is consistent with tall narrow slopes, but the exact molds cannot be positively identified from that photograph alone.

[LEGO Pick a Brick](https://www.lego.com/en-us/pick-and-build/pick-a-brick?appearsIn=43008&perPage=100&sort=created_at-desc) directly lists design 4460 as “ROOF TILE 1X2X3/73°”, 98560 as “ROOF TILE 2X2X3/ 73 GR.” and 60481 as “ROOF TILE 2X1X2”. The [Brick Architect slope guide](https://brickarchitect.com/parts/category-56) groups the tall pieces under 75°, and the [3678 entry](https://brickarchitect.com/parts/3678) identifies the wider 65° part. LDraw is an independent community geometry reference, not LEGO's own CAD service.

Reference measurements were inspected in [4460s01](https://library.ldraw.org/library/official/parts/s/4460s01.dat), [3684c](https://library.ldraw.org/library/official/parts/3684c.dat), [60481a](https://library.ldraw.org/library/official/parts/60481a.dat), and [3678b](https://library.ldraw.org/library/official/parts/3678b.dat). They share a 20-LDU horizontal sloping run and a 4-LDU nose. The two-brick version has 44 LDU of rise (arctan(44/20) ≈ 65.56°); the three-brick version has 68 LDU (arctan(68/20) ≈ 73.61°). These calculations explain the nominal catalog angle versus LEGO's 73° naming. Models follow the measured profiles, not an artificially exact 75° triangle. Stud pitch, height and diameter stay unchanged; 4460b's stud is hollow.

No standard straight 80° or 85° slope was verified in the consulted catalog sources. Those are not invented or emulated by stretching parts. Vertical cliffs use regular brick faces for any remaining height. Click **Try a cliff landscape** to load an undoable example containing both tall families.
