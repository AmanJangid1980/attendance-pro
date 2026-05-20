import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

type Props = {visible: boolean};

export function OfflineBanner({visible}: Props) {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        Offline — attendance will be saved on this device.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FBBF24',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
