const LOGGED_IN_KEY = 'admin_logged_in';
const ROLE_KEY = 'admin_role';

export function setLoggedIn(role: string): void {
  localStorage.setItem(LOGGED_IN_KEY, '1');
  localStorage.setItem(ROLE_KEY, role);
}

export function clearLoggedIn(): void {
  localStorage.removeItem(LOGGED_IN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(LOGGED_IN_KEY) === '1';
}

export function getRole(): string | null {
  return localStorage.getItem(ROLE_KEY);
}

export function isAdmin(): boolean {
  return localStorage.getItem(ROLE_KEY) === 'admin';
}
