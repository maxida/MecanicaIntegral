import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const LoadingOverlay = ({ message }: { message?: string }) => {
  return (
    <View style={styles.overlay} pointerEvents="none">
      <View style={styles.box}>
        <ActivityIndicator size="large" color="#fff" />
        {message ? <Text style={styles.text}>{message}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  box: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  text: { color: '#fff', marginTop: 10 },
});

export default LoadingOverlay;
