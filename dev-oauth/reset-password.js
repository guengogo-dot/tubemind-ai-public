const AUTH = "https://ep-red-boat-b2at0ihs.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth";
const params = new URLSearchParams(location.search);
const token = params.get("token");
const error = params.get("error");
// Remove the recovery token from browser history before any network request.
// The token remains only in memory for this page session.
history.replaceState(null, "", location.pathname);
const form = document.getElementById("reset");
const status = document.getElementById("status");
if (!token || error) {
  form.hidden = true;
  status.textContent = "This recovery link is invalid or expired. Request a new link from TubeMind AI.";
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = form.elements.namedItem("password").value;
  const confirm = form.elements.namedItem("confirm").value;
  if (password.length < 8 || password !== confirm) {
    status.textContent = "Passwords must match and contain at least 8 characters.";
    return;
  }
  const button = document.getElementById("submit");
  button.disabled = true;
  status.textContent = "Updating password...";
  try {
    const response = await fetch(AUTH + "/reset-password", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }), credentials: "omit"
    });
    if (!response.ok) throw Error("The link may have expired. Request a new recovery email.");
    history.replaceState(null, "", location.pathname);
    form.reset(); form.hidden = true;
    status.textContent = "Password updated. Return to TubeMind AI and sign in with your email and new password.";
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : "Password reset failed.";
  } finally { button.disabled = false; }
});
