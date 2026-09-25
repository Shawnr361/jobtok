import { AuthFlow } from '../features/auth/AuthFlow';

/** Email sign-in, inside the sign-in card. */
export default function Route() {
  return <AuthFlow initial="email" />;
}
