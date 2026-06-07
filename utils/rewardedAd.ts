import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Real rewarded unit (production). In dev we use Google's test unit so we
// never click live ads (which can get the AdMob account flagged).
const REWARDED_UNIT_ID = 'ca-app-pub-6491535003946944/4045724232';
const adUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_UNIT_ID;

export interface RewardedResult {
  /** True when the user watched long enough to earn the reward. */
  earned: boolean;
}

/**
 * Loads and shows a single rewarded ad, resolving when it closes.
 *
 * The credit is NOT granted here — the reward is granted server-side: AdMob
 * calls our /ads/ssv endpoint with the `userId` set below, and the backend
 * grants the credit (idempotent, daily-capped). After this resolves with
 * `earned: true`, refresh the balance from the backend.
 *
 * @param userId Firebase uid, forwarded to AdMob SSV as `user_id`.
 */
export function showRewardedAd(userId: string): Promise<RewardedResult> {
  return new Promise((resolve, reject) => {
    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      // Forwarded verbatim to our SSV callback so the backend knows who to
      // credit. Without this, verified callbacks have no user to grant to.
      serverSideVerificationOptions: { userId },
      // Non-personalized avoids the iOS App Tracking Transparency requirement
      // for now; revisit if we add ATT for higher ad revenue.
      requestNonPersonalizedAdsOnly: true,
    });

    let earned = false;
    let settled = false;

    const cleanup = () => {
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
    };

    const unsubLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewarded.show().catch((e) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(e);
        });
      },
    );

    const unsubEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        earned = true;
      },
    );

    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ earned });
    });

    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    });

    rewarded.load();
  });
}
