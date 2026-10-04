# TODO

# BUGS / FIXES

## 🔴 High Priority

### Request / Application Form

* [ ] Fix duplicated **required documents**.
* [ ] Fix **Starter and Bulaw** having the same options/behavior.
* [ ] If **Bulaw** is selected, remove/disable **For Slaughter** since it is not usually slaughtered.
* [ ] Fix **Download Permit** functionality.

  * [ ] Permit must not be downloadable if payment has not been completed.
  * [ ] Disable Download while payment is pending.
  * [ ] Enable Download only after payment is confirmed.

### Edit / Fix Changes

* [ ] Fix **Save Changes** button behavior.

  * [ ] Save Changes should be disabled if there are no changes.
  * [ ] Enable only when actual changes have been made.
* [ ] Fix **Cancel Changes** behavior.

  * [ ] Don't show/enable it unnecessarily when nothing was changed.
  * [ ] Allow users to discard changes when modifications exist.

### OPV / Finalized Documents

* [ ] Fix document editing after OPV approval.

  * [ ] Once OPV approves, MAO should no longer be able to edit the documents.
  * [ ] Lock approved/finalized documents.

---

## 🟠 Medium Priority

### Terminology

* [ ] Replace/review the current **"Sari-Sari Store"** term.
* [ ] Check the system for other inconsistent/outdated terminology.
* [ ] Standardize terminology across forms, dashboard, statuses, documents, and reports.

### Status Information

* [ ] Improve status descriptions so they clearly explain what is happening.
* [ ] Change OPV terminology to **"For Review"**.
* [ ] Example:

  **Forwarded to OPV**

  > Forwarded to OPV for creation of the Shipping Permit.

---

## 🟡 Low Priority

### CIS

* [ ] Fix/improve manual number-to-words input.
* [ ] Verify Philippine Peso formatting.

---

# NEW FEATURES / ENHANCEMENTS

## 🔴 High Priority

### Request / Application

* [ ] Add **"Other"** option under reasons for transporting.
* [ ] Add option to **remove/delete an uploaded image/document** before submission.
* [ ] Add **Cancel Request** option.

  * [ ] Available until the request has been checked/processed by MAO.
  * [ ] Hide/disable cancellation after MAO has processed the request.

### MAO Notifications

* [ ] Add notification when there is a **new request**.
* [ ] Make new requests clearly visible to MAO.

### MAO Document Verification

* [ ] Add a **document verification checklist/validator**.
* [ ] Require MAO staff to view/review documents before verification.
* [ ] Disable **Verify Document** until the document has been reviewed.
* [ ] Prevent verification if documents:

  * [ ] Have not been reviewed.
  * [ ] Need to be fixed.
  * [ ] Are missing.
* [ ] Prevent the request from proceeding until required documents are completely verified.

---

## 🟠 Medium Priority

### MAO Dashboard

* [ ] Add reminder/indicator for **overdue requests**.
* [ ] Add reminder/indicator for **unprocessed requests**.
* [ ] Add reminder/indicator for requests waiting for MAO action.
* [ ] Make KPI cards clickable.

  * [ ] Clicking **Needs Attention** should open the relevant requests.
* [ ] Add KPI card for **OPV Approved** requests.

### Application Tracking

* [ ] Add an **application progress tracker**.

### Suggested Flow

`Submitted → MAO Review → OPV Review → OPV Approved → Permit Creation → Payment → Completed`

* [ ] Show completed stages.
* [ ] Highlight the current stage.
* [ ] Show upcoming stages.
* [ ] Update the tracker automatically as the application progresses.

### CIS

* [ ] Add automatic **number-to-words conversion**.

  Example:

  `₱1,500.00` → `One Thousand Five Hundred Pesos Only`

### OPV

* [ ] Add KPI card showing **OPV Approved** requests.
* [ ] Clearly indicate when an application has been approved by OPV.
* [ ] Lock documents once OPV approval is completed.

---

## 🟡 Low Priority / Future Enhancement

### Automatic Document Validation

* [ ] Investigate automatic detection of unreadable documents.
* [ ] Detect whether uploaded documents can be properly read/detected.
* [ ] Automatically flag documents that cannot be detected.
* [ ] If technically feasible, automatically reject/return documents that fail validation.
* [ ] Add a confidence threshold to reduce incorrect automatic rejection.

### Payment

* [ ] Add **payment countdown timer**, similar to the concept discussed with Sir Alvin.
* [ ] Display remaining payment time.
* [ ] Define behavior when the countdown expires.
* [ ] Automatically update the payment/request status when the deadline expires.

---

# QA / TESTING

## 🔴 High Priority

* [ ] Test duplicate required documents.
* [ ] Test Starter vs. Bulaw behavior.
* [ ] Test Bulaw → For Slaughter option.
* [ ] Test image/document removal.
* [ ] Test request cancellation before MAO review.
* [ ] Test cancellation after MAO processing.
* [ ] Test document verification blocking.
* [ ] Test OPV approval → document locking.
* [ ] Test permit download before payment.
* [ ] Test permit download after payment.

## 🟠 Medium Priority

* [ ] Test MAO new-request notifications.
* [ ] Test overdue request reminders.
* [ ] Test clickable KPI cards.
* [ ] Test application tracker.
* [ ] Test status descriptions.
* [ ] Test Save Changes with no modifications.
* [ ] Test Save Changes after modifications.
* [ ] Test number-to-words conversion.

## 🟡 Future Enhancement Testing

* [ ] Test automatic document detection.
* [ ] Test unreadable document handling.
* [ ] Test payment countdown.
* [ ] Test payment expiration.
* [ ] Verify terminology changes across the system.
