import {
  // ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// import Logo from '../assets/images/bracha.svg';
// import CameraVinyl from '../assets/images/fi-br-record-vinyl.svg';
// import Spinner from '../assets/images/spinner.svg';
// import {HistoryItem} from '../components/HistoryItem';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
// import { Pulse } from 'react-native-animated-spinkit';
// import transformLogsIntoHistoryItems from '../utils/transformLogHistoryItems';

if (__DEV__) {
  const originalFetch = global.fetch;
  global.fetch = (...args) => {
    console.log(
      '🌐 FETCH REQUEST:',
      JSON.stringify(
        {
          url: args[0],
          method: args[1]?.method || 'GET',
          headers: args[1]?.headers || {},
        },
        null,
        2,
      ),
    );

    return originalFetch(...args)
      .then(response => {
        console.log(
          `🌐 FETCH RESPONSE: ${response.status} ${response.statusText} for ${
            typeof args[0] === 'string' ? args[0] : 'unknown URL'
          }`,
        );

        const clone = response.clone();

        clone
          .text()
          .then(text => {
            try {
              const json = JSON.parse(text);
              console.log('🌐 RESPONSE BODY:', JSON.stringify(json, null, 2));
            } catch (e) {
              console.log(
                '🌐 RESPONSE BODY (not JSON):',
                text.substring(0, 500) + (text.length > 500 ? '...' : ''),
              );
            }
          })
          .catch(err => {
            console.log('🌐 Failed to read response body:', err);
          });

        return response;
      })
      .catch(error => {
        console.error('🚨 FETCH ERROR:', error);
        throw error;
      });
  };

  console.log('📱 Network logging enabled');
}

interface ImageData {
  type: string;
  size: number;
  sample: string;
}

interface UserInfo {
  ip: string;
  userAgent: string;
  country: string;
  city: string;
  timezone: string;
  referer: string;
}

interface Timestamp {
  _seconds: number;
  _nanoseconds: number;
}

export interface LogEntry {
  id: string;
  image: ImageData;
  imageUrl?: string;
  timestamp: string;
  content?: string;
  description?: string;
  originalFileName: string | null;
  mimeType: string | null;
  userInfo: UserInfo;
  success: boolean;
  processingTimeMs: number;
  error: string | null;
  createdAt: Timestamp;
  bracha?: string;
}

export default function HomeScreen() {
  // const [historyItems, setHistoryItems] = useState([
  //   {
  //     id: '1',
  //     text: 'text',
  //     img: require('../assets/images/bracha.svg'),
  //     description: 'bracha'
  //   },
  // ]);

  const [permission, requestPermission] = useCameraPermissions();

  const [cameraOpened, setCameraOpened] = useState(false);

  const [hasPressedOpenCamButton, setHasPressedOpenCamButton] = useState(false);

  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);

  const [apiMessage, setApiMessage] = useState<any>('');

  const [isLoading, setIsLoading] = useState(false);

  // const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [isLoading, spinValue]);

  useEffect(() => {
    if (hasPressedOpenCamButton && permission?.granted) {
      setCameraOpened(true);
    }
  }, [permission?.granted]);

  // useEffect(() => {
  //   fetchHistoryItems();
  // }, []);

  const cameraRef = useRef<CameraView>(null);

  const takePhoto = async () => {
    if (permission?.granted && cameraRef?.current) {
      try {
        console.log('📸 Taking photo...');

        setIsLoading(true);
        setError(null);

        const photo = await cameraRef.current.takePictureAsync();

        console.log('📸 Photo taken successfully:', photo.uri);

        setCapturedPhoto({uri: photo.uri});
        setCameraOpened(false);

        console.log('📸 Loading photo data from, using multipart form data.');

        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          console.log('📤 Sending image to API using multipart/form-data...');
          const response = await fetch(
            'https://nestjs-app-749460609316.us-central1.run.app/upload',
            {
              method: 'POST',
              headers: {
                accept: 'application/json',
              },
              body: formData,
              signal: controller.signal,
            },
          );

          clearTimeout(timeoutId);

          console.log(`📥 API response received: ${response.status}`);

          if (response.ok) {
            const res = await response.json();
            console.log('📥 API response data:', JSON.stringify(res, null, 2));
            setApiMessage(res);
            // fetchHistoryItems();
          } else {
            const errorText = await response.text();
            console.error(
              `📥 API error response: ${response.status}`,
              errorText,
            );
            setError(
              `API error: ${response.status} - ${errorText || 'Unknown error'}`,
            );
          }
        } catch (uploadError: any) {
          clearTimeout(timeoutId);

          if (uploadError.name === 'AbortError') {
            console.error('⏱️ API request timed out');
            setError('Request timed out. Please try again.');
          } else {
            console.error('🚨 API upload error:', uploadError);
            setError(
              `Upload failed: ${uploadError.message || 'Unknown error'}`,
            );
          }
        } finally {
          setIsLoading(false);
        }
      } catch (cameraError: any) {
        console.error('🚨 Camera error:', cameraError);
        setError(`Camera error: ${cameraError.message || 'Unknown error'}`);
        setIsLoading(false);
      }
    } else {
      console.error('📸 Camera not ready');
      setError('Camera not ready');
    }
  };

  // const fetchHistoryItems = async () => {
  //   setIsHistoryLoading(true);
  //   try {
  //     const numberOfRecords = 10;

  //     const response = await fetch(
  //       `https://nestjs-app-749460609316.us-central1.run.app/logs?limit=${numberOfRecords}&all=false`,
  //       {
  //         method: 'GET',
  //       },

  //     );

  //     if (!response.ok) {
  //       throw new Error('Failed to get bracha logs.');
  //     }

  //     const logData = await response.json();
  //     const structuredLogData =
  //       transformLogsIntoHistoryItems(logData?.logs) || [];
  //     //@ts-ignore
  //     setHistoryItems(structuredLogData);
  //     console.log('Fetched log data:', structuredLogData);
  //   } catch (error: any) {
  //     console.error('Failed to fetch logs:', error);
  //   } finally {
  //     setIsHistoryLoading(false);
  //   }
  // };

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  const animatedThumbnailBorderStyle = {
    borderWidth: borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
    borderColor: borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', '#FFFFFF'],
    }),
  };

  useEffect(() => {
    if (isLoading || cameraOpened) {
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 20,
        useNativeDriver: false,
      }).start();
    } else if (apiMessage?.description?.message?.content) {
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();
      Animated.sequence([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [apiMessage?.description?.message?.content, isLoading, cameraOpened]);

  return (
    <SafeAreaView style={styles.pageContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>BrachaBuddy</Text>
      </View>

      <View>
        <View style={styles.topSectionContainer}>
          <Animated.View
            style={[styles.thumbnailContainer, animatedThumbnailBorderStyle]}>
            {cameraOpened ? (
              <View style={styles.camera}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  ref={cameraRef}
                />
              </View>
            ) : (
              <Image
                style={styles.thumbnail}
                source={
                  capturedPhoto ?? require('../assets/images/thumbnail.png')
                }
              />
            )}
          </Animated.View>

          {apiMessage && !isLoading && !cameraOpened && (
            <Animated.View
              style={[
                styles.resultContainer,
                {transform: [{translateY: slideAnim}]},
              ]}>
              <Animated.Text style={[styles.resultTitle, {opacity: fadeAnim}]}>
                {(() => {
                  try {
                    if (apiMessage?.description?.message?.content) {
                      const content = JSON.parse(
                        apiMessage.description.message.content,
                      );
                      return (
                        content.foodName ||
                        apiMessage.description.recognized_item ||
                        'Item'
                      );
                    }
                    return apiMessage.description.recognized_item || 'Item';
                  } catch (e) {
                    return apiMessage.description.recognized_item || 'Item';
                  }
                })()}
              </Animated.Text>

              {(() => {
                try {
                  if (apiMessage?.description?.message?.content) {
                    const content = JSON.parse(
                      apiMessage.description.message.content,
                    );
                    return (
                      <Animated.View style={[styles.blessingContainer]}>
                        <Animated.Text
                          style={[styles.blessingTitle, {opacity: fadeAnim}]}>
                          Blessing:
                        </Animated.Text>
                        <Animated.Text
                          style={[styles.blessingText, {opacity: fadeAnim}]}>
                          {content.bracha}
                        </Animated.Text>
                        <Animated.Text
                          style={[
                            styles.blessingDescription,
                            {opacity: fadeAnim},
                          ]}>
                          {content.description}
                        </Animated.Text>
                      </Animated.View>
                    );
                  }
                  return (
                    <Animated.Text
                      style={[styles.noRecognitionText, {opacity: fadeAnim}]}>
                      Could not determine the blessing for this item.
                    </Animated.Text>
                  );
                } catch (e) {
                  return (
                    <Animated.Text
                      style={[styles.noRecognitionText, {opacity: fadeAnim}]}>
                      Could not determine the blessing for this item.
                    </Animated.Text>
                  );
                }
              })()}
            </Animated.View>
          )}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.spinner,
                {
                  transform: [
                    {
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={styles.spinnerText}>⭮</Text>
            </Animated.View>
            <Text style={styles.statusText}>Analyzing image...</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* <View style={styles.historyContainer}>
          <View style={styles.titleWrapper}>
            <Text style={styles.title}>History</Text>
          </View>

          <View style={styles.historyContentContainer}>
            {isHistoryLoading && (
              <View style={styles.historyLoadingContainer}>
                <Pulse size={78} color="#D4A017" />
              </View>
            )}
            {!isHistoryLoading && historyItems.length > 0 &&
              historyItems?.map(item => (
                <HistoryItem key={item?.id} text={item?.text || 'No Title'} brachaDescription={item?.description || 'No Description'} img={item.img} />
              ))}
          </View>
        </View> */}
      </View>

      <View style={styles.buttonContainer}>
        {cameraOpened ? (
          <View>
            <TouchableOpacity
              onPress={takePhoto}
              disabled={isLoading}
              style={[styles.button, isLoading && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>
                {isLoading ? 'Processing...' : '📸 Take Photo'}
              </Text>
            </TouchableOpacity>
                        
            {!isLoading && 
              <TouchableOpacity
                onPress={() => setCameraOpened(false)}
                disabled={isLoading}
                style={[styles.button, isLoading && styles.buttonDisabled]}>
                <Text style={styles.buttonText}>
                  {'❌ Close'}
                </Text>
              </TouchableOpacity>
            }

          </View>
        ) : (
          <TouchableOpacity
            disabled={isLoading}
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={() => {
              setHasPressedOpenCamButton(true);
              if (!permission?.granted) {
                console.log('🔒 Requesting camera permission');
                requestPermission();
              } else {
                console.log('📸 Opening camera');
                setCameraOpened(true);
              }
            }}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : '📷 Open Camera'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    backgroundColor: '#FFEEBF',
    height: '100%',
    padding: 10,
    gap: 20,
    paddingLeft: 20,
    paddingRight: 20,
    //margin: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  topSectionContainer: {
    flexDirection: 'column',
    width: '100%',
    marginBottom: 25,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: 1,
    objectFit: 'contain',
    width: '100%',
    borderRadius: 38,
    zIndex: 50,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 30,
  },
  camera: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 30,
  },
  historyContainer: {
    gap: 20,
    paddingBottom: 30,
  },
  titleWrapper: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  title: {
    fontSize: 30,
    color: '#373329',
    fontFamily: 'ShipporiMincho-Regular',
    textAlign: 'center',
  },
  historyContentContainer: {
    gap: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#D4A017',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 'auto',
    marginVertical: 8,
    flexDirection: 'row',
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: '#D4A01777',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  spinner: {
    marginBottom: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#373329',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  resultContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 16,
    marginBottom: 15,
    marginTop: -15,
    paddingTop: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    width: '93%',
    marginLeft: 'auto',
    marginRight: 'auto',
    zIndex: 10,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#373329',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'ShipporiMincho-Regular',
  },
  blessingContainer: {
    marginTop: 8,
  },
  blessingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#373329',
    marginBottom: 4,
  },
  blessingText: {
    fontSize: 22,
    color: '#D4A017',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'ShipporiMincho-Regular',
  },
  blessingDescription: {
    fontSize: 16,
    color: '#373329',
    lineHeight: 22,
  },
  noRecognitionText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  historyLoadingContainer: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#373329',
    fontFamily: 'ShipporiMincho-Bold',
  },
  spinnerText: {
    fontSize: 40,
    color: '#D4A017',
  },
});