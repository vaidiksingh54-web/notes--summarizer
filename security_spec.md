# Firestore Security Specification

## 1. Data Invariants
1. **User Identity Boundary**: A user document at `/users/{userId}` can only be accessed or modified by authenticated users whose `request.auth.uid == userId`.
2. **User Sub-collection Ownership**: Any document under `/users/{userId}/...` (items, activities, notifications) can only be accessed or modified by `request.auth.uid == userId`.
3. **Payload Identity Consistency**: Any payload written to `/users/{userId}/items/{itemId}` must have `incoming().userId == request.auth.uid`.
4. **Valid Identifier Restraint**: All document IDs and user IDs must conform to alphanumeric characters and dashes (`^[a-zA-Z0-9_\-]+$`) with a maximum length of 128 characters.
5. **No Blanket Reads**: Global listing of users, study items, or activities across all users is forbidden. Every list operation evaluates ownership directly.
6. **Immutable Fields**: `userId`, `id`, and creation timestamps cannot be altered on update.

## 2. The "Dirty Dozen" Threat Payloads (Must be Denied)
1. **Unauthenticated Read**: Attempting to read `/users/user123` with `request.auth == null`.
2. **Cross-Tenant Profile Read**: User `alice` attempting to `get` `/users/bob`.
3. **Cross-Tenant Item Insertion**: User `alice` creating `/users/bob/items/item1`.
4. **Identity Spoofing**: User `alice` writing to `/users/alice/items/item1` with `userId: "bob"`.
5. **ID Poisoning Attack**: Writing with document ID containing illegal characters like `../` or exceeding 128 bytes.
6. **Shadow Field Injection**: Writing an item with unauthorized root privileges (`role: "admin"`, `isSuperUser: true`).
7. **Type Inversion**: Passing a boolean or array where a string title is expected.
8. **Denial-of-Wallet Payload**: Injecting a 2MB string into `title` or `text`.
9. **Unauthenticated List Query**: Attempting collection group query on `items` without auth.
10. **Cross-Tenant Item Deletion**: User `bob` trying to delete `/users/alice/items/item1`.
11. **Immutable Key Mutation**: Updating an item and altering the original `userId`.
12. **Malicious Activity Tampering**: Writing an activity with fake `userId` to pollute another user's activity log.

## 3. Rules Implementation
Rules enforce strict ABAC ownership, document schema validation, length boundaries, and rejection of all unauthenticated or cross-tenant access.
