import { AuthFlow } from '../features/auth/AuthFlow';

/** Phone sign-in (and ?purpose=verify_phone to add a phone), inside the sign-in card. */
export default function Route() {
  return <AuthFlow initial="phone" />;
}
