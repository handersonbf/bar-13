import React from 'react';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from './AppButton';
import { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type ReturnToGuideParams = {
  returnToAjuda?: boolean;
};

function hasReturnToGuide(params: unknown): params is ReturnToGuideParams {
  return typeof params === 'object' && params !== null && 'returnToAjuda' in params;
}

export function ReturnToGuideButton() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute();
  const shouldShow = hasReturnToGuide(route.params) && route.params.returnToAjuda === true;

  if (!shouldShow) {
    return null;
  }

  function handlePress() {
    navigation.dispatch(CommonActions.setParams({ returnToAjuda: false }));
    navigation.navigate('Ajuda');
  }

  return <AppButton label="Voltar ao guia rápido" variant="outline" onPress={handlePress} />;
}
