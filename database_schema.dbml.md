# Database Schema

```dbml
Table users {
  id integer [primary key]
  username varchar
  email varchar
  role varchar [note: "Choices: Admin, Farmer, Inspector, Opv, Agri"]
  phone_no varchar [unique]
  address varchar
  barangay_id integer
  receive_sms boolean
  is_staff boolean
  is_active boolean
  date_joined datetime
}

Table notifications {
  id integer [primary key]
  recipient_id integer
  type varchar [note: "Choices: WARNING, INFO, SUCCESS"]
  title varchar
  message text
  is_read boolean
  sent_at datetime
}

Table audit_trails {
  id integer [primary key]
  who_performed_id integer
  what_performed text
  when_performed datetime
}

Table permit_applications {
  id integer [primary key]
  application_id varchar [unique]
  farmer_id integer
  status varchar [note: "Choices: DRAFT, SUBMITTED, RESUBMISSION, OCR_VALIDATED, MANUAL, FORWARDED_TO_OPV, OPV_VALIDATED, OPV_REJECTED, PERMIT_ISSUED, PAYMENT_PENDING, RELEASED"]
  destination varchar
  transport_date date
  purpose text
  is_issued boolean
  issued_at datetime
  is_checked boolean
  created_at datetime
  updated_at datetime
  submitted_at datetime
}

Table transport_origins {
  id integer [primary key]
  application_id integer
  barangay_id integer
  number_of_pigs integer
}

Table submitted_documents {
  id integer [primary key]
  origin_id integer
  document_type varchar [note: "Choices: traders_pass, handlers_license, transport_carrier_reg, cis, endorsement_cert"]
  file varchar
  uploaded_at datetime
}

Table opv_validations {
  id integer [primary key]
  application_id integer [unique]
  opv_staff_id integer
  status varchar [note: "Choices: PENDING, VALIDATED, REJECTED"]
  remarks text
  validated_at datetime
  veterinary_health_certificate varchar
  transportation_pass varchar
}

Table ocr_validation_results {
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

Table issued_permits {
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

Table inspector_logs {
  id integer [primary key]
  inspector_id integer
  application_id integer [unique]
  notes text
  scanned_at datetime
  lat float
  longi float
}

Table barangays {
  id integer [primary key]
  name varchar [unique]
  latitude decimal
  longitude decimal
  geojson json
}

Table hog_surveys {
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

Table payment_histories {
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

Table sms_logs {
  id integer [primary key]
  phone_number varchar
  send_at datetime
  message_type varchar [note: "Choices: OTP, NOTIFICATION"]
  status_captured varchar
}

// Relationships
Ref: notifications.recipient_id > users.id
Ref: audit_trails.who_performed_id > users.id
Ref: users.barangay_id > barangays.id

Ref: permit_applications.farmer_id > users.id
Ref: transport_origins.application_id > permit_applications.id
Ref: transport_origins.barangay_id > barangays.id
Ref: submitted_documents.origin_id > transport_origins.id

Ref: opv_validations.application_id - permit_applications.id
Ref: opv_validations.opv_staff_id > users.id

Ref: ocr_validation_results.document_id - submitted_documents.id
Ref: ocr_validation_results.overridden_by_id > users.id

Ref: issued_permits.application_id - permit_applications.id
Ref: issued_permits.issued_by_id > users.id

Ref: inspector_logs.inspector_id > users.id
Ref: inspector_logs.application_id - permit_applications.id

Ref: hog_surveys.barangay_id > barangays.id

Ref: payment_histories.issued_permit_id - issued_permits.id
Ref: payment_histories.confirmed_by_id > users.id
```
