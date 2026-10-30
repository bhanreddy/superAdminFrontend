# Fingerprint unlock

On supported Android and iOS devices, sign in and tap the fingerprint icon in
the top bar to enable **Fingerprint unlock**. The same switch is in Founder
settings and My CA account. Enabling it requires a successful system fingerprint
verification. The preference applies to the current account and cluster on this
device, and is off by default. Web does not show the option.

When enabled, opening the app with a restored session or returning from the
background shows the lock screen. **Lock app now** locks immediately. Cancelling
or failing a scan keeps the app locked. **Use account password** signs out and
opens the existing sign-in flow. A successful password login permits access
without a second fingerprint prompt; future background resumes lock again.

Protected SecureStore proofs use a separate keychain service for each account.
No passwords or tokens are copied into fingerprint storage. Changed enrollment
or unreadable protection requires password sign-in; turn the option off and back
on after signing in to create a fresh proof. The OS selects the strong biometric
on phones with more than one strong biometric sensor.

This change adds `expo-local-authentication` and native biometric permissions.
Install a new native build before testing it; a JavaScript update alone cannot
add the native module. Verify enrollment, successful unlock, cancellation,
background resume, password fallback, and changed enrollment on a physical
fingerprint-capable phone. The automated suite mocks the native sensor.
