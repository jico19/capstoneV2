# TODO

# BUGS / FIXES

## 🔴 High Priority

### Request / Application Form

* [x] Fix duplicated **required documents**.
* [x] Fix **Starter and Bulaw** having the same options/behavior.
* [x] If **Bulaw** is selected, remove/disable **For Slaughter** since it is not usually slaughtered.
* [x] Fix **Download Permit** functionality.

  * [x] Permit must not be downloadable if payment has not been completed.
  * [x] Disable Download while payment is pending.
  * [x] Enable Download only after payment is confirmed.

### Edit / Fix Changes

* [x] Fix **Save Changes** button behavior.

  * [x] Save Changes should be disabled if there are no changes.
  * [x] Enable only when actual changes have been made.
* [x] Fix **Cancel Changes** behavior.

  * [x] Don't show/enable it unnecessarily when nothing was changed.
  * [x] Allow users to discard changes when modifications exist.

### OPV / Finalized Documents

* [x] Fix document editing after OPV approval.

  * [x] Once OPV approves, MAO should no longer be able to edit the documents.
  * [x] Lock approved/finalized documents.

---

## 🟠 Medium Priority

### Terminology

* [x] Replace/review the current **"Sari-Sari Store"** term.
* [x] Check the system for other inconsistent/outdated terminology.
* [x] Standardize terminology across forms, dashboard, statuses, documents, and reports.

### Status Information

* [x] Improve status descriptions so they clearly explain what is happening.
* [x] Change OPV terminology to **"For Review"**.
* [x] Example:

  **Forwarded to OPV**

  > Forwarded to OPV for creation of the Shipping Permit.

---

## 🟡 Low Priority

### CIS

* [x] Fix/improve manual number-to-words input.
* [x] Verify Philippine Peso formatting.

---

# NEW FEATURES / ENHANCEMENTS

## 🔴 High Priority

### Request / Application

* [x] Add **"Other"** option under reasons for transporting.
* [x] Add option to **remove/delete an uploaded image/document** before submission.
* [x] Add **Cancel Request** option.

  * [x] Available until the request has been checked/processed by MAO.
  * [x] Hide/disable cancellation after MAO has processed the request.

### MAO Notifications

* [x] Add notification when there is a **new request**.
* [x] Make new requests clearly visible to MAO.

### MAO Document Verification

* [x] Add a **document verification checklist/validator**.
* [x] Require MAO staff to view/review documents before verification.
* [x] Disable **Verify Document** until the document has been reviewed.
* [x] Prevent verification if documents:

  * [x] Have not been reviewed.
  * [x] Need to be fixed.
  * [x] Are missing.
* [x] Prevent the request from proceeding until required documents are completely verified.

---

## 🟠 Medium Priority

### MAO Dashboard

* [x] Add reminder/indicator for **overdue requests**.
* [x] Add reminder/indicator for **unprocessed requests**.
* [x] Add reminder/indicator for requests waiting for MAO action.
* [x] Make KPI cards clickable.

  * [x] Clicking **Needs Attention** should open the relevant requests.
* [x] Add KPI card for **OPV Approved** requests.

### Application Tracking

* [x] Add an **application progress tracker**.

### Suggested Flow

`Submitted → MAO Review → OPV Review → OPV Approved → Permit Creation → Payment → Completed`

* [x] Show completed stages.
* [x] Highlight the current stage.
* [x] Show upcoming stages.
* [x] Update the tracker automatically as the application progresses.

### CIS

* [x] Add automatic **number-to-words conversion**.

  Example:

  `₱1,500.00` → `One Thousand Five Hundred Pesos Only`

### OPV

* [x] Add KPI card showing **OPV Approved** requests.
* [x] Clearly indicate when an application has been approved by OPV.
* [x] Lock documents once OPV approval is completed.

---

## 🟡 Low Priority / Future Enhancement

### Automatic Document Validation

* [x] Investigate automatic detection of unreadable documents.
* [x] Detect whether uploaded documents can be properly read/detected.
* [x] Automatically flag documents that cannot be detected.
* [x] If technically feasible, automatically reject/return documents that fail validation.
* [x] Add a confidence threshold to reduce incorrect automatic rejection.

### Payment

* [x] Add **payment countdown timer**, similar to the concept discussed with Sir Alvin.
* [x] Display remaining payment time.
* [x] Define behavior when the countdown expires.
* [x] Automatically update the payment/request status when the deadline expires.

---

# QA / TESTING

## 🔴 High Priority

* [x] Test duplicate required documents.
* [x] Test Starter vs. Bulaw behavior.
* [x] Test Bulaw → For Slaughter option.
* [x] Test image/document removal.
* [x] Test request cancellation before MAO review.
* [x] Test cancellation after MAO processing.
* [x] Test document verification blocking.
* [x] Test OPV approval → document locking.
* [x] Test permit download before payment.
* [x] Test permit download after payment.

## 🟠 Medium Priority

* [x] Test MAO new-request notifications.
* [x] Test overdue request reminders.
* [x] Test clickable KPI cards.
* [x] Test application tracker.
* [x] Test status descriptions.
* [x] Test Save Changes with no modifications.
* [x] Test Save Changes after modifications.
* [x] Test number-to-words conversion.

## 🟡 Future Enhancement Testing

* [x] Test automatic document detection.
* [x] Test unreadable document handling.
* [x] Test payment countdown.
* [x] Test payment expiration.
* [x] Verify terminology changes across the system.
