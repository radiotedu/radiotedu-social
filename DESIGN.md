# RadioTEDU Social design direction

## Design read

RadioTEDU Social is an isometric pixel-campus world for TEDU students. It uses RadioTEDU's red, black, cream, and mint interface language with balanced game energy: ENERGY 2 / RHYTHM 2 / MOTION 2.

## Identity

- The campus artwork is the focal point. Interface chrome frames the room without competing with it.
- RadioTEDU red identifies the brand, mint communicates playable or selected states, and warm cream keeps pixel-campus surfaces readable.
- The visual motif is a broadcast control desk translated into compact pixel-game controls.
- Characters use crisp outlined sprites and authored eight-direction poses so they remain readable against detailed rooms.

## Interaction

- A floor click means walk, a chair click means sit, and clicking away while seated means stand and continue walking.
- Furniture, walls, stages, restaurant fixtures, and other solid room geometry are never valid walking targets.
- Motion communicates an action or state transition. Ambient motion stays secondary to navigation and study activity.
- Pool Dive uses discrete ready, takeoff, splash, recovery, and completion poses. The 800 ms choreography explains a verified round, locks duplicate input, and yields to a 32 ms reduced-motion path when requested.
- Gold purchases, inventory, study time, moderation, and account state remain server-authoritative.

## Layout

- Desktop keeps the room dominant with compact edge-mounted HUD controls.
- Mobile is a distinct composition with thumb-sized controls, safe-area spacing, and a camera that keeps the avatar and next action legible.
- Panels use solid, high-contrast surfaces. Shadows only separate overlays from the room.

## Typography and accessibility

- Pixel display type is reserved for short game labels. Longer instructions and account text use the existing readable UI face.
- Every interactive control has a high-contrast keyboard focus ring and a touch target of at least 44 by 44 CSS pixels on mobile.
- Empty, loading, error, occupied, blocked, and offline states explain what happened and what the player can do next.

## Decision reasons

- Color: RadioTEDU red establishes ownership; mint is reserved for interaction and verified progress.
- Layout: edge-mounted controls leave the authored campus world as the single visual focal point.
- Typography: limited pixel type preserves game character without reducing long-form readability.
- Spacing: a compact desktop register and a larger mobile touch register match the input method.
- Cards and panels: solid panels are used only for actionable account, social, inventory, event, and moderation content.
- Illustration: every room image and sprite represents a real game location, object, character, or state.
- Arcade motion: the pixel diver and pool geometry reuse the game's authored CSS and sprite language, avoiding heavyweight render tooling and third-party assets while keeping the interaction consistent across desktop and mobile.

## Former Library restoration

- Design Read: an isometric social study room for TEDU students, using the established RadioTEDU pixel-campus language at ENERGY 2 / RHYTHM 2 / MOTION 2.
- Background: `library-wide.png` is restored because it is the verified former Library artwork requested by the product owner; no replacement scene is generated or inferred.
- Layout: the room keeps its original long-table composition because the 51 authored chairs, aisle graph, desk collisions and social-study density all depend on that geometry.
- Motion: walking and sitting transitions explain player state; furniture and lamps remain visually still so interaction targets stay legible.
- Occlusion: chair-edge crops pass in front of seated avatars only where the furniture physically overlaps the body, preserving a natural torso and shoulder silhouette.

## Exclusive Store and Auditorium seating

- Store previews use the same layered avatar sheets as the live character so a player sees the real garment before spending Gold.
- Purchase and equip share one explicit action because the server already performs ownership and balance checks atomically; Wardrobe remains available for later outfit changes.
- Gold is reserved for price and purchase state, while mint continues to mean owned, equipped, or verified.
- Equip confirmation is a short one-shot motion inside the product artwork. It does not move the panel, repeat indefinitely, or compete with room navigation.
- Auditorium avatars face the stage on the authored north-west axis and keep the four-frame seated animation used by every wearable.
- Auditorium foreground masks follow each visible chair shell instead of copying a rectangular floor patch, preserving the head, shoulders, aisle, and natural seated depth.

## Shared-room identity, mobile composition, and Deep Dive

- A remote student is rendered from the server-provided equipped item IDs, never from a locally guessed outfit. Their display name stays attached to the avatar and is repeated in the room-scoped chat message and speech bubble.
- Presence uses a four-second bounded pulse. This keeps movement useful for friends while capping a full 60-player room at 15 client pulses per second; Gold, seats, chat, and identity remain server-authoritative.
- Phone navigation is a horizontal, scrollable 44-pixel touch strip. Brand, focus clock, radio, Gold, and account use two non-overlapping compact rows so the room remains the visual focus.
- Deep Dive begins at the visible swimming-pool starting block. The room invitation walks the avatar to the authored front-deck queue point before opening the eight-round server-scored activity.
- Direction controls support touch, mouse, A/S/D, and arrow keys. The client presents the action and animation; it never invents a score or Gold reward.
