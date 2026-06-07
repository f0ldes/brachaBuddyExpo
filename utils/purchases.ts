import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PurchasesStoreProduct,
} from 'react-native-purchases';

// Public RevenueCat SDK key (safe to ship — it's a client key, not a secret).
const APPLE_API_KEY = 'appl_ZQqxAatFFYAdiRIOaIxHKlahFKv';

/** Product identifiers — must match App Store Connect + the backend env. */
export const PRODUCT_IDS = {
  lifetime: 'lifetime_unlock',
  tipSmall: 'tip_small',
  tipLarge: 'tip_large',
};

let configured = false;

/**
 * Configures RevenueCat with the Firebase uid as the RevenueCat appUserID.
 * This is critical: it makes the webhook's `app_user_id` equal our Firebase
 * uid, so the backend grants the entitlement to the right user. Call whenever
 * the signed-in uid changes (the anon→real upgrade keeps the same uid, so this
 * mostly fires once).
 *
 * iOS only for now — Android needs its own RevenueCat Google key before it can
 * be configured.
 */
export async function initPurchases(uid: string): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    if (!configured) {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({ apiKey: APPLE_API_KEY, appUserID: uid });
      configured = true;
    } else {
      await Purchases.logIn(uid);
    }
  } catch (e) {
    console.warn('RevenueCat init failed', e);
  }
}

async function getProductById(
  id: string,
): Promise<PurchasesStoreProduct | null> {
  const products = await Purchases.getProducts([id]);
  return products[0] ?? null;
}

export interface PurchaseResult {
  success: boolean;
  cancelled: boolean;
}

/**
 * Purchases a product by its store id. The entitlement/credits are granted
 * server-side by the RevenueCat webhook (keyed by product_id), so callers
 * should refresh the balance from the backend after a successful purchase.
 */
export async function purchaseProductById(id: string): Promise<PurchaseResult> {
  const product = await getProductById(id);
  if (!product) {
    throw new Error(`Product not available: ${id}`);
  }
  try {
    await Purchases.purchaseStoreProduct(product);
    return { success: true, cancelled: false };
  } catch (e: any) {
    if (e?.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw e;
  }
}
