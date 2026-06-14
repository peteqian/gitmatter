import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

// Mirror of _auth: a guest-only layout. A logged-in visitor has no business on
// the marketing/login/signup pages, so bounce them to the app home. The session
// is server-resolved in the root beforeLoad (cookies available), so this runs
// correctly during SSR and renders the public content directly.
export const Route = createFileRoute("/_unauth")({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: "/assistant" });
    }
  },
  component: UnauthLayout,
});

function UnauthLayout() {
  return <Outlet />;
}
