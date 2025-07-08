import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  TouchableOpacity,
  Text,
  Alert,
  ActivityIndicator,
  StyleSheet,
  View,
  Pressable,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [paymentHtml, setPaymentHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const webviewRef = useRef();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const backendUrl = 'http://192.168.178.240:5000';

  const createOrderAndLoadCheckout = async () => {
    try {
      setLoading(true);

      const { data: order } = await axios.post(
        `${backendUrl}/createOrder`,
        { amount: 499, currency: 'INR' },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!order.id || !order.key_id) {
        Alert.alert('Error', 'Order creation failed');
        setLoading(false);
        return;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
            <style>
              body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              button { font-size: 18px; padding: 10px 25px; }
            </style>
          </head>
          <body>
            <button id="payBtn">Pay ₹${(order.amount / 100).toFixed(2)}</button>

            <script>
              window.onload = function () {
                var options = {
                  key: "${order.key_id}",
                  amount: "${order.amount}",
                  currency: "${order.currency}",
                  name: "Demo Shop",
                  description: "Test Transaction",
                  order_id: "${order.id}",
                  handler: function (response) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      event: "payment_success",
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_signature: response.razorpay_signature
                    }));
                  },
                  modal: {
                    ondismiss: function () {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ event: "payment_dismiss" }));
                    }
                  },
                  prefill: {
                    name: "Test User",
                    email: "test.user@example.com",
                    contact: "9999999999"
                  },
                  theme: {
                    color: "#3399cc"
                  }
                };

                document.getElementById("payBtn").addEventListener("click", function (e) {
                  e.preventDefault();
                  var rzp1 = new Razorpay(options);
                  rzp1.open();
                });
              };
            </script>
          </body>
        </html>
      `;

      setPaymentHtml(htmlContent);
    } catch (err) {
      Alert.alert('Error', 'Order creation failed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onMessage = async event => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    console.log('📩 WebView Message:', data);

    if (data.event === 'payment_success') {
      // ✅ Send payment verification to backend
      const response = await axios.post(`${backendUrl}/verifyPayment`, {
        razorpay_order_id: data.razorpay_order_id,
        razorpay_payment_id: data.razorpay_payment_id,
        razorpay_signature: data.razorpay_signature,
      });

      if (response.data.success) {
        Alert.alert('✅ Payment Verified', 'Your payment was verified and updated.');
      } else {
        Alert.alert('⚠️ Payment Failed', 'Invalid signature. Please contact support.');
      }
    } else if (data.event === 'payment_dismiss') {
      Alert.alert('⚠️ Payment Cancelled', 'You closed the payment window.');
    }
  } catch (err) {
    console.error('❌ WebView message error:', err);
    Alert.alert('Error', 'Something went wrong during payment verification.');
  }
};


  if (paymentHtml) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: paymentHtml }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          allowFileAccessFromFileURLs={true}
          allowUniversalAccessFromFileURLs={true}
          onMessage={onMessage}
          startInLoadingState={true}
          ref={webviewRef}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    );
  }

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <LinearGradient colors={['#a1c4fd', '#c2e9fb']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Ionicons name="card-outline" size={48} color="#3399cc" />
          <Text style={styles.title}>Pay with Razorpay</Text>
          <Text style={styles.amount}>Total: ₹499</Text>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={createOrderAndLoadCheckout}
              style={styles.payButton}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.payButtonText}>Pay Now</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    width: '85%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  amount: {
    fontSize: 20,
    marginVertical: 20,
    color: '#555',
  },
  payButton: {
    backgroundColor: '#3399cc',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
