const USER_ID_KEY = "godmode_user_id";

export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
}
