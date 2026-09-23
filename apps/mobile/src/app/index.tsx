import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { LogoMark } from '../components/Logo';
import { useAuth } from '../lib/auth/AuthProvider';
import { c } from '../theme';

/** Decides where to go once the stored session has been checked. */
export default function Index() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          backgroundColor: c.surface,
        }}
      >
        <LogoMark size={64} />
        <ActivityIndicator color={c.primary} accessibilityLabel="Loading" />
      </View>
    );
  }
  return <Redirect href={status === 'signedIn' ? '/feed' : '/welcome'} />;
}
