// The whole sign-in journey lives in ONE glass card: welcome → phone or email → code.
// Every move between them (Start exploring, Show your skills, Sign in with email, Phone,
// Use email instead, Back) plays the same card morph as Sign in ↔ Create account, instead of
// jumping to a new page. /welcome, /phone and /email all open this flow at their panel.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { MorphCard, useMorph, type Morph } from '../../components/auth/MorphCard';
import { Screen } from '../../components/ui';
import { useAuth } from '../../lib/auth/AuthProvider';
import { EmailPanel } from './EmailPanel';
import { PhonePanel } from './PhonePanel';
import { WelcomePanel } from './WelcomePanel';

export type AuthStep = 'welcome' | 'phone' | 'email';

export interface AuthNav {
  morph: Morph;
  /** Morph the card to another panel. `next: 'create'` opens the studio after sign-in. */
  go: (step: AuthStep, opts?: { next?: 'create' }) => void;
  /** Where to land after signing in. */
  next?: 'create';
  /** Adding a phone to an already signed-in account (not a sign-in). */
  verifyOnly: boolean;
}

export function AuthFlow({ initial }: { initial: AuthStep }) {
  const { status } = useAuth();
  const params = useLocalSearchParams<{ purpose?: string; next?: string }>();
  const verifyOnly = params.purpose === 'verify_phone';
  const morph = useMorph();
  const [step, setStep] = useState<AuthStep>(initial);
  const [next, setNext] = useState<'create' | undefined>(
    params.next === 'create' ? 'create' : undefined,
  );

  if (status === 'signedIn' && !verifyOnly) return <Redirect href="/feed" />;

  const nav: AuthNav = {
    morph,
    next,
    verifyOnly,
    go: (to, opts) =>
      morph.run(() => {
        setStep(to);
        if (opts) setNext(opts.next);
      }),
  };

  // Back from phone or email morphs back to the welcome panel; verifying a phone from inside
  // the app goes back to where you came from.
  const back = step === 'welcome' ? undefined : verifyOnly ? true : () => nav.go('welcome');

  return (
    <Screen back={back} backdrop="silk">
      <View style={{ flexGrow: 1, justifyContent: 'center' }}>
        <MorphCard morph={morph}>
          {step === 'welcome' ? (
            <WelcomePanel nav={nav} />
          ) : step === 'phone' ? (
            <PhonePanel nav={nav} />
          ) : (
            <EmailPanel nav={nav} />
          )}
        </MorphCard>
      </View>
    </Screen>
  );
}
