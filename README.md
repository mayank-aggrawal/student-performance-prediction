# EduPredict — Student Performance Prediction System

BCA Web Technology project built with HTML, CSS, JavaScript, Firebase Authentication, and Cloud Firestore.

## Features
- Email/password registration and sign-in using Firebase Authentication
- Dark responsive dashboard with summary statistics
- Add, search, edit, and delete student records
- Cloud Firestore storage, separated by signed-in account
- Transparent weighted performance estimate
- Reports overview and performance distribution
- Mobile-friendly navigation

## 1. Install the tools
1. Install Google Chrome.
2. Install Visual Studio Code.
3. Install Node.js from https://nodejs.org/ if you do not already have it.
4. In VS Code, install the **Live Server** extension (Ritwick Dey).

## 2. Create a Firebase project
1. Open https://console.firebase.google.com/ and sign in with your Google account.
2. Click **Create a project** and choose a project name, e.g. `edupredict-bca`.
3. In Project Overview, click **Add app** and choose the Web app (`</>`).
4. Give the app a nickname and register it. You do not need to enable Firebase Hosting for local testing.
5. Firebase will show a `firebaseConfig` object. Copy its values.

## 3. Configure the Firebase web app
1. Open `js/firebase-config.js` in VS Code.
2. Replace each `PASTE_...` placeholder with the matching value from your Firebase web configuration.
3. Keep the quotation marks and commas. Do not paste a service-account private key into this file.
4. Save the file.

Example format (use your own values; these are not real credentials):
```js
export const firebaseConfig = {
  apiKey: "your-web-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

## 4. Enable email/password authentication
1. In Firebase Console, open **Build → Authentication**.
2. Click **Get started** if prompted.
3. Open **Sign-in method** (or Providers).
4. Select **Email/Password**, enable it, and save.

## 5. Create the cloud database
1. In Firebase Console, open **Build → Firestore Database**.
2. Click **Create database**.
3. Choose a nearby region. The region may be difficult to change later.
4. Start in **production mode** if that option is offered.
5. Open the **Rules** tab.
6. Replace the rules with the contents of this project's `firestore.rules` file.
7. Click **Publish**.

Do not use public test rules such as `allow read, write: if true;`. They expose your database.

## 6. Run the project
1. Open the project folder in VS Code.
2. In the Explorer, right-click `index.html`.
3. Choose **Open with Live Server**.
4. Your browser should open a local address similar to `http://127.0.0.1:5500`.
5. Create an account with an email address you can access and a new project-only password.
6. Add a sample student. Refresh the page; the record should still be there.
7. Open Firebase Console → Firestore Database → Data to see the saved record.

If you see a configuration warning, finish Step 3. If you see `permission-denied`, confirm that you published `firestore.rules` and that the signed-in account owns the record.

## Prediction formula
Estimated score = (Previous exam × 0.40) + (Attendance × 0.20) + (Test marks × 0.25) + (Assignment × 0.15)

Categories:
- 85–100: Excellent
- 70–84.9: Good
- 50–69.9: Average
- Below 50: Needs support

These categories and weights are illustrative and should be confirmed with your teacher. This is a rule-based estimate, not machine learning and not a guaranteed result.

## Important limitations and safety
- Firebase Authentication handles account passwords; this app does not store passwords in Firestore.
- The browser Firebase configuration is intended for client-side use. Security depends on correctly published Firestore Security Rules.
- The provided rules restrict student records to the account that created them. This is an individual-user demo, not a shared teacher/admin portal.
- Before real-world use, add stricter field validation, account/email verification, abuse protection, backups, and review the rules with an experienced developer.
- Use invented sample records for the college demonstration. Avoid storing real students' sensitive or identifying academic data without permission.
- The prediction formula is educational only and should not be used alone to make consequential decisions about students.

## Viva preparation
**Q. Which technologies are used?** HTML5, CSS3, JavaScript, Firebase Authentication, and Cloud Firestore.

**Q. Is this machine learning?** No. The current version uses a transparent weighted formula. A genuine ML model would need suitable historical data, model training, and evaluation.

**Q. Where is data stored?** Student records are stored in Cloud Firestore and scoped to the authenticated user's UID.

**Q. Why use Firebase?** It provides hosted authentication and a cloud database, so this frontend project does not need its own custom backend for the demo.
