/* The same training endpoints are used by Swagger Trainer and Login Sandbox. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.QAtoDevPetstore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const baseUrl = 'https://petstore.swagger.io/v2';

  function createUser(user) {
    return fetch(`${baseUrl}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(user)
    });
  }

  function loginUser(username, password) {
    const query = new URLSearchParams({ username, password });
    return fetch(`${baseUrl}/user/login?${query}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
  }

  function getUser(username) {
    return fetch(`${baseUrl}/user/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
  }

  function logout() {
    return fetch(`${baseUrl}/user/logout`, { method: 'GET', cache: 'no-store' });
  }

  return { baseUrl, createUser, loginUser, getUser, logout };
});
