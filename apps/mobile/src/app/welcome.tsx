import { AuthFlow } from '../features/auth/AuthFlow';

/** First screen: the sign-in card on its welcome panel. */
export default function Route() {
  return <AuthFlow initial="welcome" />;
}
