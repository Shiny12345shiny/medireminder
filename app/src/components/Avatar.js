import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getInitials } from '../utils/helpers';

const Avatar = ({
  source,
  name,
  size = 50,
  rounded = true,
  onPress,
  showBadge = false,
  badgeColor = '#4caf50',
  style
}) => {
  const avatarSize = {
    width: size,
    height: size,
    borderRadius: rounded ? size / 2 : 8
  };

  const initialsSize = size / 2.5;
  const badgeSize = size / 4;

  const AvatarContent = () => (
    <View style={[styles.container, avatarSize, style]}>
      {source ? (
        <Image source={source} style={[styles.image, avatarSize]} />
      ) : (
        <View style={[styles.placeholder, avatarSize]}>
          <Text style={[styles.initials, { fontSize: initialsSize }]}>
            {getInitials(name || '?')}
          </Text>
        </View>
      )}

      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: badgeColor,
              bottom: size * 0.05,
              right: size * 0.05
            }
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <AvatarContent />
      </TouchableOpacity>
    );
  }

  return <AvatarContent />;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  placeholder: {
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  initials: {
    color: '#fff',
    fontWeight: 'bold'
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff'
  }
});

export default Avatar;