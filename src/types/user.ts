/**
 * User related types
 */

export interface CreateUserInput {
  email: string;
  name?: string;
  password: string;
  role?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

