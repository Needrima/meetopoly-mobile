import { cssInterop } from 'nativewind';
import { SafeAreaView } from 'react-native-safe-area-context';

// Third-party components need an explicit className mapping for NativeWind v4.
cssInterop(SafeAreaView, { className: 'style' });
