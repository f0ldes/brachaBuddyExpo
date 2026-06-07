import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  credits: number;
  /** Disables buttons + shows a spinner while an action is in flight. */
  busy?: boolean;
  canWatchAd?: boolean;
  onClose: () => void;
  onWatchAd: () => void;
  onGoLifetime: () => void;
  onSupport: () => void;
}

/**
 * Shown when a scan is blocked by an empty credit balance (HTTP 402). Offers
 * three opt-in ways forward — never forces anything. The action handlers are
 * supplied by the screen: rewarded ad + IAP are wired once the native modules
 * are added (Phase 4b).
 */
export default function OutOfCreditsModal({
  visible,
  credits,
  busy = false,
  canWatchAd = true,
  onClose,
  onWatchAd,
  onGoLifetime,
  onSupport,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={26} color="#373329" />
          </TouchableOpacity>

          <Text style={styles.title}>
            {credits <= 0 ? 'Out of scans' : 'Get more scans'}
          </Text>
          <Text style={styles.subtitle}>
            {credits <= 0
              ? 'Get more scans to keep finding your brachot.'
              : `You have ${credits} scan${credits === 1 ? '' : 's'} left. Top up to keep finding your brachot.`}
          </Text>

          {busy && (
            <ActivityIndicator
              size="small"
              color="#D4A017"
              style={styles.spinner}
            />
          )}

          {canWatchAd && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onWatchAd}
              disabled={busy}>
              <Ionicons name="play-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                Watch an ad for +1 scan
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onGoLifetime}
            disabled={busy}>
            <Ionicons name="infinite-outline" size={20} color="#373329" />
            <Text style={styles.secondaryButtonText}>Go unlimited (Lifetime)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSupport} disabled={busy}>
            <Text style={styles.supportText}>💛 Support the app</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFEEBF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  title: {
    fontSize: 24,
    color: '#373329',
    textAlign: 'center',
    fontFamily: 'ShipporiMincho-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#5C5640',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'ShipporiMincho-Regular',
  },
  spinner: {
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#D4A017',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D4A017',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#373329',
    fontWeight: 'bold',
    fontSize: 16,
  },
  supportText: {
    color: '#D4A017',
    textAlign: 'center',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
