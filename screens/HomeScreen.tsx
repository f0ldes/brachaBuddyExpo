import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  TextInput,
  Alert,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// import Logo from '../assets/images/bracha.svg';
// import CameraVinyl from '../assets/images/fi-br-record-vinyl.svg';
// import Spinner from '../assets/images/spinner.svg';
import {HistoryItem} from '../components/HistoryItem';
import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Pulse } from 'react-native-animated-spinkit';
import transformLogsIntoHistoryItems from '../utils/transformLogHistoryItems';
import { authenticatedFetch } from '../utils/apiClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

if (__DEV__) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (...args) => {
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
  const { user, isGuest } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [showTutorial, setShowTutorial] = useState(false);
  const tutorialFadeAnim = useRef(new Animated.Value(0)).current;

  // Welcome modal — shown once per user. Bump the version suffix to re-show it
  // to everyone (including returning users) after a meaningful update.
  const WELCOME_KEY = 'hasSeenWelcome_v2';
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Clean up the legacy key from before the versioned-welcome scheme.
    AsyncStorage.removeItem('hasSeenWelcome');
    AsyncStorage.getItem(WELCOME_KEY).then(value => {
      if (!value) setShowWelcome(true);
    });
  }, []);

  const dismissWelcome = () => {
    AsyncStorage.setItem(WELCOME_KEY, 'true');
    setShowWelcome(false);
  };

  useEffect(() => {
    if (route.params?.openFeedback) {
      setFeedbackModalVisible(true);
      navigation.setParams({ openFeedback: undefined });
    }
  }, [route.params?.openFeedback]);

  useEffect(() => {
    if (isGuest) {
      AsyncStorage.getItem('tutorialLastDismissed').then(value => {
        const shouldShow = !value || (Date.now() - parseInt(value, 10)) > 30 * 24 * 60 * 60 * 1000;
        if (shouldShow) {
          setShowTutorial(true);
          Animated.timing(tutorialFadeAnim, {
            toValue: 1,
            duration: 600,
            delay: 500,
            useNativeDriver: true,
          }).start();
        }
      });
    } else {
      setShowTutorial(false);
    }
  }, [isGuest]);

  const dismissTutorial = () => {
    AsyncStorage.setItem('tutorialLastDismissed', Date.now().toString());
    Animated.timing(tutorialFadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowTutorial(false));
  };

  const [historyItems, setHistoryItems] = useState([
    {
      id: '1',
      bracha: '',
      brachaHebrew: '',
      foodName: '',
      img: require('../assets/images/bracha.svg'),
      description: 'bracha'
    },
  ]);

  const [permission, requestPermission] = useCameraPermissions();

  const [cameraOpened, setCameraOpened] = useState(false);

  const [hasPressedOpenCamButton, setHasPressedOpenCamButton] = useState(false);

  const [capturedPhoto, setCapturedPhoto] = useState<any>(null);

  const [apiMessage, setApiMessage] = useState<any>('');

  const [isLoading, setIsLoading] = useState(false);

  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    setError(null);

    const hasResult = !!apiMessage;

    if (hasResult) {
      // Step 1: Fade out result card text + slide it down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        setApiMessage('');
        slideAnim.setValue(-100);

        // Step 2: Crossfade captured photo to placeholder
        Animated.timing(photoOpacityAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setCapturedPhoto(null);
          Animated.timing(photoOpacityAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }).start();
        });
      });
    }

    await fetchHistoryItems(false);
    setIsRefreshing(false);
  };

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const submitFeedback = async () => {
    if (feedbackRating === 0) {
      Alert.alert('Please select a rating');
      return;
    }
    setIsSendingFeedback(true);
    try {
      const response = await authenticatedFetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: feedbackRating, feedback: feedbackText }),
      });
      if (response.ok) {
        Alert.alert('Thank you!', 'Your feedback has been submitted.');
        setFeedbackModalVisible(false);
        setFeedbackRating(0);
        setFeedbackText('');
      } else {
        Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

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

  // Fetch history on mount and when user logs in/out
  useEffect(() => {
    fetchHistoryItems();
  }, [user?.uid]);

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
          const response = await authenticatedFetch('/upload', {
            method: 'POST',
            headers: {
              accept: 'application/json',
            },
            body: formData,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log(`📥 API response received: ${response.status}`);

          if (response.ok) {
            const res = await response.json();
            console.log('📥 API response data:', JSON.stringify(res, null, 2));
            setApiMessage(res);
            fetchHistoryItems();
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

  const fetchHistoryItems = async (showSpinner = true) => {
    if (showSpinner) setIsHistoryLoading(true);
    try {
      const numberOfRecords = 10;

      const response = await authenticatedFetch(
        `/logs?limit=${numberOfRecords}&all=false`,
        { method: 'GET' },
      );

      if (!response.ok) {
        throw new Error('Failed to get bracha logs.');
      }

      const logData = await response.json();
      const structuredLogData =
        transformLogsIntoHistoryItems(logData?.logs) || [];
      //@ts-ignore
      setHistoryItems(structuredLogData);
      console.log('Fetched log data:', structuredLogData);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const photoOpacityAnim = useRef(new Animated.Value(1)).current;

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
      <Modal
        visible={showWelcome}
        transparent
        animationType="fade"
        onRequestClose={dismissWelcome}>
        <View style={styles.welcomeOverlay}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Thank you for using Bracha Buddy! 🙏</Text>
            <Text style={styles.welcomeBody}>
              We've updated our image recognition and eliminated some rookie
              mistakes. Wishing you all the best — enjoy using Bracha Buddy!
            </Text>
            <TouchableOpacity style={styles.welcomeButton} onPress={dismissWelcome}>
              <Text style={styles.welcomeButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={styles.logoContainer}>
        <TouchableOpacity
          onPress={() => setFeedbackModalVisible(true)}
          style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={40} color="#D4A017" />
        </TouchableOpacity>
        <Text style={styles.logoText}>BrachaBuddy</Text>
        <TouchableOpacity
          onPress={() => {
            setShowTutorial(false);
            AsyncStorage.setItem('tutorialLastDismissed', Date.now().toString());
            navigation.navigate('Login');
          }}
          style={styles.accountButton}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.profilePhoto} />
          ) : (
            <Ionicons name={isGuest ? "person-circle-outline" : "person-circle"} size={40} color="#D4A017" />
          )}
        </TouchableOpacity>
        {showTutorial && isGuest && (
          <Animated.View style={[styles.tutorialBubble, { opacity: tutorialFadeAnim }]}>
            <View style={styles.tutorialArrow} />
            <TouchableOpacity onPress={dismissTutorial} activeOpacity={0.7}>
              <Text style={styles.tutorialText}>Login and keep you history private!</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#D4A017"
            colors={['#D4A017']}
          />
        }>
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
              <Animated.Image
                style={[styles.thumbnail, { opacity: photoOpacityAnim }]}
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
                        (content.recognizedFoods?.length
                          ? content.recognizedFoods.join(', ')
                          : content.foodName) ||
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

                    // Non-food: show the (funny) remark, no blessing.
                    if (content.isFood === false) {
                      return (
                        <Animated.Text
                          style={[styles.blessingDescription, {opacity: fadeAnim}]}>
                          {content.description ||
                            'No blessing needed'}
                        </Animated.Text>
                      );
                    }

                    // New shape: an ordered array of blessings.
                    // Legacy fallback: a single top-level blessing.
                    const blessings =
                      content.blessings?.length
                        ? content.blessings
                        : content.brachaEnglish
                          ? [
                              {
                                brachaHebrew: content.brachaHebrew,
                                brachaEnglish: content.brachaEnglish,
                                description: content.description,
                                coversFoods: content.foodName
                                  ? [content.foodName]
                                  : [],
                              },
                            ]
                          : [];

                    if (!blessings.length) {
                      return (
                        <Animated.Text
                          style={[styles.noRecognitionText, {opacity: fadeAnim}]}>
                          Could not determine the blessing for this item.
                        </Animated.Text>
                      );
                    }

                    return (
                      <Animated.View style={[styles.blessingContainer]}>
                        {blessings.map((blessing: any, index: number) => (
                          <View
                            key={index}
                            style={[
                              styles.blessingItem,
                              index > 0 && styles.blessingItemDivider,
                            ]}>
                            {blessings.length > 1 &&
                            blessing.coversFoods?.length ? (
                              <Animated.Text
                                style={[styles.blessingCovers, {opacity: fadeAnim}]}>
                                {blessing.coversFoods.join(', ')}
                              </Animated.Text>
                            ) : null}
                            {blessing.brachaHebrew ? (
                              <Animated.Text
                                style={[styles.blessingHebrew, {opacity: fadeAnim}]}>
                                {blessing.brachaHebrew}
                              </Animated.Text>
                            ) : null}
                            <Animated.Text
                              style={[styles.blessingEnglish, {opacity: fadeAnim}]}>
                              {blessing.brachaEnglish}
                            </Animated.Text>
                            {blessing.description ? (
                              <Animated.Text
                                style={[styles.blessingDescription, {opacity: fadeAnim}]}>
                                {blessing.description}
                              </Animated.Text>
                            ) : null}
                          </View>
                        ))}
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

        <View style={styles.historyContainer}>
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
                <HistoryItem key={item?.id} bracha={item?.bracha || ''} brachaHebrew={item?.brachaHebrew || ''} foodName={item?.foodName || ''} brachaDescription={item?.description || 'No Description'} img={item.img} />
              ))}
          </View>
        </View>
      </ScrollView>

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

      <Modal
        visible={feedbackModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setFeedbackModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFeedbackModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Send us feedback!</Text>

            <Text style={styles.modalLabel}>How would you rate BrachaBuddy?</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Ionicons
                    name={star <= feedbackRating ? 'star' : 'star-outline'}
                    size={36}
                    color="#D4A017"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Any additional feedback?</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Tell us what you think..."
              placeholderTextColor="#A0977D"
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
            />

            <TouchableOpacity
              style={[styles.submitButton, isSendingFeedback && styles.buttonDisabled]}
              disabled={isSendingFeedback}
              onPress={submitFeedback}>
              <Text style={styles.buttonText}>
                {isSendingFeedback ? 'Sending...' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  infoButton: {
    position: 'absolute',
    left: 0,
    padding: 4,
  },
  accountButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D4A017',
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
    alignItems: 'center',
  },
  blessingItem: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  blessingItemDivider: {
    borderTopWidth: 1,
    borderTopColor: '#F0E6C8',
    paddingTop: 14,
    marginTop: 6,
  },
  blessingCovers: {
    fontSize: 14,
    color: '#A0977D',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  blessingHebrew: {
    fontSize: 24,
    color: '#D4A017',
    marginBottom: 6,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  blessingEnglish: {
    fontSize: 17,
    color: '#373329',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'ShipporiMincho-Regular',
  },
  blessingDescription: {
    fontSize: 15,
    color: '#373329',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 10,
  },
  blessingExamples: {
    fontSize: 12,
    color: '#A0977D',
    lineHeight: 18,
    textAlign: 'center',
    fontStyle: 'italic',
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
  tutorialBubble: {
    position: 'absolute',
    top: 42,
    right: -2,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 100,
  },
  tutorialArrow: {
    position: 'absolute',
    top: -5,
    right: 12,
    width: 10,
    height: 10,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  tutorialText: {
    fontSize: 13,
    color: '#373329',
    fontFamily: 'ShipporiMincho-Regular',
  },
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  welcomeContent: {
    backgroundColor: '#FFEEBF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#D4A017',
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#373329',
    fontFamily: 'ShipporiMincho-Bold',
    marginBottom: 12,
  },
  welcomeBody: {
    fontSize: 16,
    color: '#373329',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'ShipporiMincho-Regular',
    marginBottom: 24,
  },
  welcomeButton: {
    backgroundColor: '#D4A017',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 40,
  },
  welcomeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFEEBF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 2,
    borderColor: '#D4A017',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'ShipporiMincho-Bold',
    color: '#373329',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 15,
    fontFamily: 'ShipporiMincho-Regular',
    color: '#373329',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  feedbackInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4A017',
    padding: 12,
    fontSize: 15,
    fontFamily: 'ShipporiMincho-Regular',
    color: '#373329',
    textAlignVertical: 'top',
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#D4A017',
    paddingVertical: 12,
    borderRadius: 40,
    alignItems: 'center',
  },
});