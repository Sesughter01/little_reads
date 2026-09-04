/**
 * Options used for customer email-OTP login.
 *
 * shouldCreateUser: false guarantees that requesting an OTP for an unknown
 * email NEVER silently creates a new account.
 */
export const OTP_LOGIN_OPTIONS = {
  shouldCreateUser: false,
} as const;