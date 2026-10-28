import { View, StyleSheet, Pressable, Linking, Platform, BackHandler, PermissionsAndroid, ActivityIndicator } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { WebView } from 'react-native-webview'
import AppText from '../../components/AppText/AppText'
import { colors } from '../../utils/Colors'

const LocatorWebView = ({ navigation, route }: any) => {
  const webViewRef = useRef<any>(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    navigation.setOptions({ title: route?.params?.title || 'Locator' })
  }, [navigation, route])

  // The locator pages use navigator.geolocation for "Nearby Search"; on Android the
  // WebView only gets a fix once the app holds the runtime location permission.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]).catch(() => { });
  }, [])

  // Hardware back walks the web history first, then leaves the screen
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack])

  const handleShouldStartLoadWithRequest = (request: any) => {
    const url: string = request.url;
    if (url.startsWith('tel:') || url.startsWith('mailto:') || url.startsWith('whatsapp:') || url.startsWith('geo:') || url.startsWith('intent:')) {
      Linking.openURL(url).catch(() => { });
      return false;
    }
    return true;
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: route?.params?.url }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        mixedContentMode="always"
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onNavigationStateChange={(navState: any) => setCanGoBack(navState.canGoBack)}
        onLoadStart={() => setHasError(false)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        onHttpError={() => setHasError(true)}
        // iOS kills the web content process under memory pressure, leaving a white page
        onContentProcessDidTerminate={() => webViewRef.current?.reload()}
      />

      {hasError && (
        <View style={styles.overlay}>
          <AppText size={15} color={colors.blue} family='InterMedium'>Unable to load the page</AppText>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <AppText size={15} color={colors.blue} family='InterSemiBold'>Retry</AppText>
          </Pressable>
        </View>
      )}

      {isLoading && !hasError && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.goldLight,
  },
})

export default LocatorWebView
