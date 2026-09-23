import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { Body, Button, Logo, Screen } from '../components/ui';
import { useAuth } from '../lib/auth/AuthProvider';

export default function Welcome() {
  const router = useRouter();
  const { status } = useAuth();
  if (status === 'signedIn') return <Redirect href="/home" />;

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, marginBottom: 24 }}>
        <Logo />
        <Body muted>SHOW ME WHAT YOU CAN DO.</Body>
      </View>
      <Button label="Continue with phone" onPress={() => router.push('/phone')} />
      <Button
        label="Continue with email"
        variant="secondary"
        onPress={() => router.push('/email')}
      />
      <GoogleSignIn />
    </Screen>
  );
}
