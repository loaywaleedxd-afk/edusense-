import React, { useState, useEffect } from 'react';
import { Image, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Shows the student's real photo from the backend /photos/ endpoint.
 * Falls back to initials if the image fails to load or is not available.
 */
export default function StudentAvatar({ studentId, name, size = 40, bgColor = '#3b82f6', style }) {
  const [failed,  setFailed]  = useState(false);
  const [baseUrl, setBaseUrl] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('backend_url').then(url => {
      setBaseUrl(url || 'http://192.168.1.1:8000');
    });
  }, []);

  const initial  = (name || studentId || 'S')[0].toUpperCase();
  const photoUrl = baseUrl && studentId ? `${baseUrl}/photos/${studentId}.jpg` : null;

  if (!failed && photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onError={() => setFailed(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: `${bgColor}33`,
      justifyContent: 'center', alignItems: 'center',
    }, style]}>
      <Text style={{ color: bgColor, fontWeight: '800', fontSize: size * 0.4 }}>{initial}</Text>
    </View>
  );
}
