/**
 * ZibalPaymentScreen — in-app WebView for the Zibal payment page.
 *
 * Zibal requires a `Referer` header on the initial /start/{trackId}
 * request that matches the domain registered in the merchant panel
 * (android-app://com.rithmo here) — a plain deep-link Intent can't set
 * that header, so this loads the page in a WebView instead, with the
 * header set explicitly. See subscriptions/zibal.py's module docstring
 * on the backend for the same requirement (documented there, but
 * deliberately left unimplemented server-side — opening the payment page
 * is a mobile concern).
 *
 * There is no deep link back into the app. Zibal redirects the WebView
 * itself to our backend's callbackUrl once the payment finishes — by the
 * time that URL loads, the backend has already verified the payment
 * server-to-server and activated (or rejected) it (see subscriptions/
 * views.py's zibal_callback). This screen only watches for that URL to
 * know the flow is over; it never reads or trusts the outcome from the
 * URL itself — closing this screen always triggers a real
 * GET /api/subscriptions/status/ refetch, which is the only source of
 * truth for whether premium actually activated.
 */
import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@api/queryKeys';
import { useTheme } from '@hooks/useTheme';
import { track } from '@analytics';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'ZibalPayment'>;

// Registered in the Zibal merchant panel as the allowed mobile referrer.
// Zibal will not open the payment page at all for a request whose
// Referer doesn't match this exact value.
const ZIBAL_REFERER = 'android-app://com.rithmo';

// Path suffix of subscriptions/urls.py's zibal/callback/ route. Matched
// by suffix (not exact host) so this keeps working across dev/staging/
// prod API hosts without duplicating ZIBAL_CALLBACK_URL's value here.
const CALLBACK_PATH = '/api/subscriptions/zibal/callback/';

export default function ZibalPaymentScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { paymentUrl } = route.params;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) { return; }
    finished.current = true;
    track('zibal_payment_finished', {});
    // The only real signal of outcome: re-fetch status from the backend,
    // which by now has already run its own server-to-server verification.
    queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
    navigation.goBack();
  }, [navigation, queryClient]);

  // Cancel the actual navigation to the callback URL — its response body
  // is a small JSON object meant for a server, not a page to flash on
  // screen — and treat reaching it as "the flow is over."
  const handleShouldStartLoad = useCallback((request: WebViewNavigation) => {
    if (request.url.includes(CALLBACK_PATH)) {
      finish();
      return false;
    }
    return true;
  }, [finish]);

  const handleLoadEnd = useCallback(() => setLoading(false), []);
  const handleError = useCallback(() => {
    setLoading(false);
    setLoadError(true);
  }, []);

  if (loadError) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Icon name="wifi-off" size={32} color={colors.textTertiary} />
        <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 12 }}>
          صفحه‌ی پرداخت باز نشد
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6, textAlign: 'center' }}>
          اتصالت را بررسی کن و دوباره تلاش کن.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="بازگشت"
        >
          <Text style={{ color: colors.textOnPrimary, fontWeight: '700', fontSize: 14 }}>بازگشت</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WebView
        source={{ uri: paymentUrl, headers: { Referer: ZIBAL_REFERER } }}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        startInLoadingState={false}
      />
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.premium} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
