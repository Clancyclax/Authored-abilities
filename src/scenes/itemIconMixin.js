// ============================================================================
// ROUND 281 -- THE PACK'S ICONS, WHEREVER A POTION, A DISH OR A PART SHOWS.
//
// `itemIconUrl(kind, id)` for the HTML (the bag, the shop, the potion slots)
// and `_itemIconKey(drop)` for a drop on the ground. The ground texture is
// loaded the first time it is wanted, through a plain Image, and the pending
// drops are redrawn when it lands -- the same shape round 82 gave the item
// atlases, so a drop in the first second shows its disc and then its icon.
// ============================================================================
import { ITEM_ICONS } from '../data/itemIconManifest.js';

/** ROUND 284 -- the kinds that have icons. A ranked gem ("quintFire_bronze")
 *  wears its essence's icon. */
const ICON_KINDS = new Set(['consumable', 'part', 'quintessence', 'core']);
export function itemIconUrl(kind, id) {
  if (kind === 'quintessence') {
    const base = String(id || '').replace(/_(bronze|silver|gold)$/, '');
    return ((ITEM_ICONS.quintessence || {})[base]) || null;
  }
  if (kind === 'core') return ((ITEM_ICONS.core || {})[id]) || null;
  const table = ITEM_ICONS[kind === 'part' ? 'part' : 'consumable'] || {};
  return table[id] || null;
}
export function hasItemIconKind(kind) { return ICON_KINDS.has(kind); }

/** A small <img> for a row, or '' where the item has no icon. */
export function itemIconImg(kind, id, px = 18) {
  const url = itemIconUrl(kind, id);
  return url ? `<img class="item-icon pack-icon" src="${url}" style="width:${px}px;height:${px}px;image-rendering:pixelated;vertical-align:middle;margin-right:4px;" alt="">` : '';
}

export const ItemIconMixin = {
  _itemIconKey(drop) {
    if (!drop || !ICON_KINDS.has(drop.kind)) return null;
    const url = itemIconUrl(drop.kind, drop.id);
    if (!url || !this.textures) return null;
    const key = `packIcon:${drop.kind}:${drop.id}`;
    if (this.textures.exists(key)) return key;
    this._packIconLoading = this._packIconLoading || new Set();
    if (!this._packIconLoading.has(key)) {
      this._packIconLoading.add(key);
      const img = new Image();
      img.onload = () => {
        if (!this.textures.exists(key)) this.textures.addImage(key, img);
        if (this._redrawPendingLoot) this._redrawPendingLoot();
      };
      img.src = url;
    }
    return null;
  },
};
