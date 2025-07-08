// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import PaymentGateway from './screens/PaymentGateway';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Payment" screenOptions={{ headerShown: true }}>
      
        <Stack.Screen name="Payment" component={PaymentGateway} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
