import { colors } from '@jobtok/tokens';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth/AuthProvider';

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
          backgroundColor: colors.dark.background,
        }}
      >
        <ActivityIndicator color={colors.dark.primaryHover} accessibilityLabel="Loading" />
      </View>
    );
  }
  return <Redirect href={status === 'signedIn' ? '/home' : '/welcome'} />;
}
