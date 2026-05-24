# Database Schema

This document provides a visualization of the LivestockPass database structure using DBML (Database Markup Language).

```dbml
// Use Table definitions to define tables
// Use Ref to define relationships

Table User {
  id integer [primary key]
  username varchar
  role varchar [note: "Choices: Admin, Farmer, Inspector, Opv, Agri"]
  phone_no varchar
  address varchar
  barangay_id integer
  receive_sms boolean
  is_staff boolean
  is_active boolean
  date_joined datetime
}

Table Notification {
  id integer [primary key]
  recipient_id integer
  type varchar [note: "Choices: WARNING, INFO, SUCCESS"]
  title varchar
  message text
  is_read boolean
  sent_at datetime
}

Table AuditTrail {
  id integer [primary key]
  who_performed_id integer
  what_performed text
  when_performed datetime
}

Table Barangay {
  id integer [primary key]
  name varchar [unique]
  latitude decimal
  longitude decimal
  geojson json
}

Table HogSurvey {
  id integer [primary key]
  barangay_id integer
  inahin integer
  barako integer
  fattener integer
  grower integer
  bulaw integer
  starter integer
  total_pigs integer
  survey_date date
  uploaded_at datetime
}

Table InspectorLogs {
  id integer [primary key]
  inspector_id integer
  application_id integer [unique]
  notes text
  scanned_at datetime
  lat float
  longi float
}

Table PaymentHistory {
  id integer [primary key]
  issued_permit_id integer [unique]
  method varchar [note: "Choices: paymaya, gcash, card"]
  status varchar [note: "Choices: PENDING, CONFIRMED, SUCCESS, FAILED"]
  amount integer
  paymongo_payment_id varchar
  paymongo_session_id varchar
  confirmed_by_id integer
  confirmed_at datetime
  created_at datetime
}

Table PermitApplication {
  id integer [primary key]
  application_id varchar [unique]
  farmer_id integer
  status varchar [note: "Choices: DRAFT, SUBMITTED, RESUBMISSION, OCR_VALIDATED, MANUAL, FORWARDED_TO_OPV, OPV_VALIDATED, OPV_REJECTED, PERMIT_ISSUED, PAYMENT_PENDING, RELEASED"]
  destination varchar
  transport_date date
  purpose text
  is_issued boolean
  issued_at datetime
  created_at datetime
  updated_at datetime
  submitted_at datetime
}

Table TransportOrigin {
  id integer [primary key]
  application_id integer
  barangay_id integer
  number_of_pigs integer
}

Table SubmittedDocument {
  id integer [primary key]
  origin_id integer
  document_type varchar [note: "Choices: traders_pass, handlers_license, transport_carrier_reg, cis, endorsement_cert"]
  file varchar
  uploaded_at datetime
}

Table OPVValidation {
  id integer [primary key]
  application_id integer [unique]
  opv_staff_id integer
  status varchar [note: "Choices: PENDING, VALIDATED, REJECTED"]
  remarks text
  validated_at datetime
  veterinary_health_certificate varchar
  transportation_pass varchar
}

Table OCRValidationResult {
  id integer [primary key]
  document_id integer [unique]
  status varchar [note: "Choices: PASSED, MANUAL, OVERRIDDEN"]
  extracted_field json
  remarks json
  validated_at datetime
  manually_overridden boolean
  overridden_by_id integer
  overridden_at datetime
  overridden_fields json
}

Table IssuedPermit {
  id integer [primary key]
  permit_number varchar [unique]
  application_id integer [unique]
  issued_by_id integer
  qr_token varchar [unique]
  is_paid boolean
  payment_method varchar [note: "Choices: ONLINE, OFFLINE"]
  permit_pdf varchar
  date_issued date
  valid_until date
}

Table SMSLog {
  id integer [primary key]
  phone_number varchar
  send_at datetime
  message_type varchar [note: "Choices: OTP, NOTIFICATION"]
  status_captured varchar
}

// Relationships
Ref: User.barangay_id > Barangay.id
Ref: Notification.recipient_id > User.id
Ref: AuditTrail.who_performed_id > User.id
Ref: HogSurvey.barangay_id > Barangay.id
Ref: InspectorLogs.inspector_id > User.id
Ref: InspectorLogs.application_id - PermitApplication.id
Ref: PaymentHistory.issued_permit_id - IssuedPermit.id
Ref: PaymentHistory.confirmed_by_id > User.id
Ref: PermitApplication.farmer_id > User.id
Ref: TransportOrigin.application_id > PermitApplication.id
Ref: TransportOrigin.barangay_id > Barangay.id
Ref: SubmittedDocument.origin_id > TransportOrigin.id
Ref: OPVValidation.application_id - PermitApplication.id
Ref: OPVValidation.opv_staff_id > User.id
Ref: OCRValidationResult.document_id - SubmittedDocument.id
Ref: OCRValidationResult.overridden_by_id > User.id
Ref: IssuedPermit.application_id - PermitApplication.id
Ref: IssuedPermit.issued_by_id > User.id
```
