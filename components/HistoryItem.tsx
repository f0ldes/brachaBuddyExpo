import { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Text,
  Modal, 
  Pressable,
  Dimensions
} from "react-native";

interface HistoryItemProps {
  img: string | any; 
  text: string;
  brachaDescription: string;
}

export function HistoryItem({ img, text, brachaDescription }: HistoryItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handleLongPress = () => {
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => {
          setIsOpen(!isOpen);
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {typeof img === 'string' ? (
          <Image style={styles.thumbnail} source={{ uri: img }} />
        ) : (
          <Image style={styles.thumbnail} source={img} />
        )}

        <View style={styles.textContainer}>
          <Text style={styles.text}>{text}</Text>
        </View>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={closeModal}
        >
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <View style={styles.modalContent}>
              <Pressable style={styles.modalInner}>
                {typeof img === 'string' ? (
                  <Image style={styles.enlargedImage} source={{ uri: img }} />
                ) : (
                  <Image style={styles.enlargedImage} source={img} />
                )}
                
                <View style={styles.modalTextContainer}>
                  <Text style={styles.modalTitle}>{text || 'No Bracha'}</Text>
                </View>

                <View style={styles.modalTextContainer}>
                  <Text style={styles.modalBracha}>{brachaDescription || 'No Description'}</Text>
                </View>
                
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      </TouchableOpacity>
    </View>
  );
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: "#FFF8E6",
    height: 70,
    borderRadius: 15,
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingLeft: 15,
    flexDirection: "row",
    gap: 15,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10
  },
  textContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  text: {
    fontWeight: "bold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth * 0.8,
    maxHeight: screenHeight * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
    opacity: 1,
    borderWidth: 2,
    borderColor: '#D4A017',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalInner: {
    padding: 20,
    alignItems: 'center',
  },
  enlargedImage: {
    width: screenWidth * 0.7,
    height: screenWidth * 0.7,
    borderRadius: 15,
    marginBottom: 20,
  },
  modalTextContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalBracha: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
});