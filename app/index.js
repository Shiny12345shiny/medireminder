import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'Possible unhandled promise rejection',
]);

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);