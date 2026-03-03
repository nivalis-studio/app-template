export type SignUpFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export type SignInFieldErrors = {
  email?: string;
  password?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export const validateSignUpFields = (
  name: string,
  email: string,
  password: string,
): SignUpFieldErrors => {
  const errors: SignUpFieldErrors = {};

  if (!name.trim()) {
    errors.name = 'Name is required';
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'Password must be at least 8 characters';
  }

  return errors;
};

export const validateSignInFields = (
  email: string,
  password: string,
): SignInFieldErrors => {
  const errors: SignInFieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
};
