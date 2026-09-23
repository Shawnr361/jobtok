import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { NavDock } from '../../components/NavDock';
import { useAuth } from '../../lib/auth/AuthProvider';
import { c } from '../../theme';

/** Signed-in app shell: the design's bottom dock with Feed, Explore, Create, Inbox and Profile. */
export default function TabsLayout() {
  const { status } = useAuth();
  if (status === 'signedOut') return <Redirect href="/welcome" />;

  return (
    <Tabs
      tabBar={(props) => <NavDock {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.surface } }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="inbox" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
