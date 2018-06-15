import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import LinearGradient  from 'react-native-linear-gradient'
import PropTypes from 'prop-types'
import { Colors, Spacing } from './DesignSystem'
import * as Utils from './Utils'

const ButtonGradient = ({ text, onPress, disabled, size }) => (
  <TouchableOpacity onPress={onPress} disabled={disabled}>
    <LinearGradient
      start={{x: 0, y: 1}}
      end={{x: 1, y: 0}}
      colors={[Colors.primaryGradient[0], Colors.primaryGradient[1]]}
      style={[styles.btnGradient, { padding: Spacing[size], opacity: disabled ? 0.4 : 1 }]}>
      <Utils.Text>{text}</Utils.Text>
    </LinearGradient>
  </TouchableOpacity>
);

ButtonGradient.defaultProps = {
  disabled: false,
  size: 'medium'
};

ButtonGradient.propTypes = {
  disabled: PropTypes.bool,
  size: PropTypes.oneOf(['xsmall', 'small', 'medium', 'big', 'large'])
};

const styles = StyleSheet.create({
  btnGradient: {
    alignItems: 'center',
    borderRadius: 4,
    width: '100%'
  }
});

export default ButtonGradient
