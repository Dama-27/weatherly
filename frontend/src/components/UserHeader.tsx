import { useAuth0 } from '@auth0/auth0-react';

function UserHeader() {
  const { user, logout } = useAuth0();

  return (
    <header className="app-header user-header">
      <div>
        <h1>Weatherly</h1>
        <span className="user-name">{user?.name ?? user?.email}</span>
      </div>

      <button
        className="btn btn-secondary"
        onClick={() =>
          logout({
            logoutParams: {
              returnTo: window.location.origin,
            },
          })
        }
      >
        Log out
      </button>
    </header>
  );
}

export default UserHeader;

