# Security Specifications & Data Invariants

## Data Invariants
1. **User Ownership**: A user profile path must correspond exactly to the user's `uid`. No user can modify other users' profiles.
2. **Category Structure**: Categories are global lookups, accessible for reading by authenticated users, but writable by any authenticated team member.
3. **Demand Access**: All validated team members can view, create, or update a demand to enable collaborative triage and status movement.
4. **Movement Logs Integrity**: Every transition creates an immutable log document under the demand. Users cannot modify or delete logs once written.

## The "Dirty Dozen" Payloads (Exploit Scenarios)
1. **Identity Theft (User Profile)**: Attempting to create a user profile with ID `user_a` while authenticated as `user_b`.
2. **Privilege Escalation**: Attempting to set an admin role on a user profile without validation.
3. **Category Poisoning**: Attempting to create a category with a huge string description (over 300 characters).
4. **ID Injection Attack**: Attempting to create a demand with a junk character/Denial of Wallet ID.
5. **Demand Title Spoofing**: Creating a demand without a title.
6. **Description Overbloat**: Attempting to write a 10MB demand description (denial of wallet).
7. **Status Hijacking**: Writing an unauthorized status string not supported by the system.
8. **Malicious Log Overwrite**: Attempting to delete a status change history log.
9. **Log Identity Spoofing**: Logging a status change on behalf of another user ID.
10. **Immutable Field Alteration**: Modifying `id` or `openedAt` fields of a demand.
11. **Blanket Read Request**: Trying to read all users without authentication.
12. **Subcollection Bypass**: Attempting to create a log entry with a parent demand ID that doesn't exist.

## Rules Verification
The security rules will enforce structure verification (`isValidDemand`, `isValidUser`, `isValidCategory`, `isValidMovementLog`) and restrict access to authenticated members only, with strict state rules.
