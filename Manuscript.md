**CHAPTER I**

**INTRODUCTION**

This chapter provides an overview of the project and presents the necessary context for understanding its objectives, scope, and limitations. It outlines the specific goals and expected outcomes of the study while clearly defining its boundaries. The purpose of the research is also discussed, highlighting its significance and potential contributions to the field. Furthermore, the chapter establishes the contextual background of the study by examining the factors that shape the research problem. It also introduces the theoretical framework that serves as the conceptual foundation for the analysis.

**Project Context**

	The livestock industry plays a vital role in supporting food security and economic development in the Philippines.  Pig production, in particular, contributes significantly to the agricultural sector by providing income opportunities for farmers and ensuring a stable supply of pork products for consumers (Colorado C. et al., 2024\) . However, the transportation of livestock requires strict regulation to prevent the spread of animal diseases such as African Swine Fever (ASF), which has caused major disruptions in the swine industry across the country. According to the Food and Agriculture Organization (2021), effective monitoring and regulation of livestock movement are critical measures in preventing the spread of transboundary animal diseases and protecting the agricultural economy. Similarly, the Philippine Department of Agriculture emphasizes that proper documentation and monitoring of livestock transport are essential in maintaining animal health standards and ensuring food safety across supply chains (Department of Agriculture, 2022).

With the increasing demand for efficient and transparent public services, government institutions are encouraged to modernize administrative operations through digital technologies. The concept of digital cities highlights the use of information and communication technologies (ICT) to enhance governance, improve service delivery, and enable data-driven decision-making within local government units. Digital transformation in public administration has been recognized as an important strategy in improving operational efficiency, transparency, and accessibility of government services (United Nations, 2022). In the agricultural sector, digital systems can support regulatory processes, strengthen monitoring capabilities, and streamline service delivery to farmers and agricultural stakeholders (World Bank, 2021).

The Municipal Agriculture Office (MAO) of Sariaya plays a crucial role in implementing agricultural policies and regulating livestock transport within the municipality. One of its primary responsibilities is the issuance of pig transportation permits to ensure that animals transported from farms comply with veterinary health regulations and local government policies. As municipalities gradually move toward digital governance and smart city initiatives, the integration of digital platforms in agricultural services becomes an important step in improving operational efficiency, strengthening transparency, and supporting sustainable agricultural management within the local government unit.

However, despite the importance of livestock regulation, the current pig transport permit process in the Sariaya Municipal Agriculture Office remains largely manual and paper-based. Applicants are required to physically visit the office to submit documents, while staff manually verify, record, and approve applications. This process often results in delays, inefficiencies, and difficulties in tracking permit records and monitoring swine movement across barangays. The absence of a centralized digital system also increases the risk of document misplacement and data redundancy, while limiting the office’s ability to generate accurate reports and support data-driven decision-making. These operational challenges highlight the need for a modern digital solution that can streamline permit processing, improve monitoring capabilities, and enhance transparency in the management of livestock transport within the municipality (AMCS Group Blog, 2024).

**Statement of Objectives**

The main objective of this study is to  design and develop a Smart Swine Transport Permit Management System with Geospatial Mapping, Secure Document Verification, and Automated Notification for the Sariaya Municipal Agriculture Office to improve the service delivery, data accuracy and accessibility of permit processing and livestock monitoring services.

Specifically, this study aims to:

1. Develop a web-based swine transport permit management system that will streamline the permit application, verification, payment, and monitoring processes within the Municipal Agriculture Office by providing:  
   1. Geospatial mapping to visualize barangay-level swine density and livestock distribution.  
   2. Secure document verification for uploaded veterinary certificates and transport requirements.  
   3. Automated SMS notification services for application updates, approvals, and payment confirmations.  
2. Integrate complementary system features that enhance monitoring, coordination, and decision-making within the Municipal Agriculture Office, including:  
   1. QR-coded digital permits to enable fast verification during inspections and checkpoints.   
   2. Integrated online payment processing for permit fees with digital receipt generation.  
   3. Monitoring dashboards that support planning and livestock movement tracking.  
   4. System alerts for missing, incomplete, or invalid documents submitted by applicants.  
3. Evaluate the proposed system based on the quality characteristics and attributes formulated in the standards of ISO/IEC 25010 in terms of the following:  
   1. Functional suitability  
   2. Performance efficiency  
   3. Compatibility  
   4. Usability  
   5. Reliability  
   6. Security  
   7. Maintainability  
   8. Portability

**Scope and Limitations**

	This study focuses on the design and development of a web-based platform intended to assist the pig transport permit management process of the Sariaya Municipal Agriculture Office. The system will make it easier for the municipality to apply for, verify, approve, and monitor pig transport permits. To ensure safety and effective system operations, the system will support three main user roles: Applicants (farmers or handlers), employees of the Municipal Agricultural Office (MAO), and the Office of the Provincial Veterinary. Each user position will be given a role-based access. In addition to creating accounts and managing profiles, applicants will be able to submit applications for shipping permits, upload necessary documents, and receive notifications about approvals or new requirements. The technical architecture of the system is built on a modern web stack to ensure scalability and security. The backend will be developed using Django, a high-level Python framework, while the frontend will utilize React to provide a responsive and dynamic user experience. To automate data handling, the system will integrate the OCR.space API to automatically extract and validate data from uploaded documents, reducing manual encoding errors and streamlining the verification process. In order to enable fast verification and tracking during inspections or checkpoints, the system will also produce QR codes for permits that have been issued. Meanwhile, veterinary officers and employees of the Sariaya Municipal Agriculture Office will review applications, validate documents, and approve or reject permit requests. The system will include geospatial mapping powered by Leaflet.js to visualize barangay-level swine density. To ensure accountability and transparency in the permit issuance process, the platform will also support online payment processing through PayMongo integration, automated receipt generation, and SMS API services for real-time notifications, all while maintaining secure document storage within a centralized database featuring detailed audit trails.

However, while the study aims to deliver a comprehensive permit management solution, the system will operate within a number of limitations. The system focuses only on the management of swine transport permits and will not include permit processing of other livestock. In certain cases, manual verification by authorized employees will still be necessary because the quality, format and clarity of uploaded documents can affect the OCR component’s accuracy. Furthermore, the geospatial mapping feature will rely on livestock data entered or updated by system administrators. Inaccurate data entry, delayed updates, or incomplete records may affect the accuracy of the generated maps and livestock distribution reports. Despite these limitations, the system is expected to significantly improve the Sariaya Municipal Agriculture Office’s swine transport permit management’s effectiveness, transparency and traceability.

**Purpose and Description**

	The goal of this study is to design and develop a Smart Swine Transport Permit Management System with Geospatial Mapping, Secure Document Verification, and Automated Notification for the Sariaya Municipal Agriculture Office to improve the efficiency, transparency, and accuracy of permit processing and livestock monitoring. The proposed system aims to address the limitations of the current manual and paper-based process by providing a centralized digital platform that streamlines application submission, document verification, approval workflows, and permit tracking. Through the integration of modern technologies such as geospatial mapping, optical character recognition (OCR), QR-coded permits, automated SMS notifications, and online payment processing, the system is expected to enhance service delivery, reduce processing time, and support data-driven decision-making within the municipal agricultural sector.

Once the proposed system is implemented, it will provide the following significance particularly to the following:

* **Municipal Agriculture Office (MAO)** \- The system will improve operational efficiency by automating the permit application, verification, approval, and payment processes that are traditionally handled manually. Through the use of secure document verification, QR-coded permits, and centralized digital records, the office will be able to process applications more efficiently while minimizing paperwork and reducing administrative delays. The integration of geospatial mapping will allow the office to visualize swine populations across barangays, enabling better monitoring of livestock distribution and supporting preventive measures against livestock diseases such as African Swine Fever. Additionally, reporting and analytics tools will provide valuable data that can support data-driven planning and decision-making within the municipal agricultural sector.  
* **Veterinary Officers** \- Veterinary officers will benefit from improved document verification and monitoring capabilities provided by the system. Through the use of QR-coded digital permits and secure document validation, officers will be able to quickly confirm the legitimacy of permits during inspections and checkpoints. This helps ensure that transported livestock comply with veterinary health standards and reduces the risk of disease transmission caused by unregulated livestock movement.  
* **Farmers and Handlers** \- Applicants will experience a more convenient and accessible permit application process through the system’s online platform. Farmers and handlers will be able to submit applications, upload required documents, pay permit fees, and track the status of their requests without repeatedly visiting the Municipal Agriculture Office. Automated SMS notifications will keep applicants informed about application updates, missing requirements, and permit approvals. This streamlined process will save time and resources while encouraging compliance with livestock transport regulations.  
* **Local Government Units (LGUs)** \- The proposed system will support improved governance by promoting transparency, accountability, and traceability in the issuance of swine transport permits. By maintaining secure and centralized digital records of applications, approvals, payments, and permit issuance, the system allows local government officials to monitor livestock transport activities more effectively.  
* **Researchers** \- The researchers will benefit from the study by gaining practical experience in designing and developing a smart web-based information system for agricultural management. The project will enhance their technical competencies in areas such as web application development, secure document verification, geospatial mapping integration, QR code implementation, automated notification systems, and digital payment integration. This experience will also strengthen their ability to apply information technology solutions to real-world governance and agricultural management challenges.  
* **Future Researchers** \- The study may serve as a valuable reference for future researchers interested in agricultural information systems, digital governance platforms, and smart permit management solutions. The design, implementation approach, and system architecture developed in this project may guide similar initiatives aimed at modernizing agricultural services in other municipalities or government agencies. Future researchers may also build upon the system by expanding its functionality to support additional livestock permit types, advanced data analytics, or broader regional monitoring systems.

**Theoretical Framework**

	This study is grounded on the Technology Acceptance Model (TAM), initially developed by Fred Davis in 1989, which explains how and why users adopt new technologies. TAM identifies two key factors that influence user acceptance: perceived usefulness and perceived ease-of-use (Davis, 1989; Venkatesh & Davis, 2000). Perceived usefulness refers to the belief that using a system enhances performance, while perceived ease-of-use refers to the degree to which a system is perceived as free of effort. In the context of a smart swine transport permit management system, TAM suggests that municipal staff, veterinary officers, and applicants are likely to adopt the system if it improves work efficiency, reduces administrative burden, and is intuitive to use. 

Features such as online application submission, integrated document validation, QR code verification, geospatial visualization, and automated notifications are expected to enhance transparency, streamline processes, and improve regulatory compliance. Systems that automate manual tasks, increase accuracy, and reduce processing time are typically viewed as more useful and are therefore more readily accepted by users (Alharbi & Drew, 2014). At the same time, user-friendly interfaces, guided workflows, and straightforward processes help minimize learning challenges and increase confidence, which is particularly important for stakeholders with varying levels of technical expertise (Davis, 1989; Rana et al., 2019).

**Figure 1\.** *Technology Acceptance Model (TAM)*

This study also draws from Technological Determinism, which posits that technological innovations influence and shape organizational processes, structures, and outcomes (Smith & Marx, 1994). This perspective asserts that the introduction of modern digital tools can transform traditional workflows and improve operational capabilities. In addition, the Theory of Technological Innovation suggests that the adoption of advanced technologies leads to greater productivity, efficiency, and competitive advantage within organizations (Coccia, 2018). Together, these theories support the idea that integrating digital solutions into municipal processes can modernize traditional practices and improve service delivery.

This study is further supported by Information Systems Theory, which emphasizes the role of structured systems in collecting, storing, processing, and managing data to support decision-making (Laudon & Laudon, 2019). By centralizing and organizing permit application information, livestock data, geospatial mapping, and notifications, the system enables stakeholders to access accurate information, generate reports, and make informed decisions efficiently. This theoretical perspective underpins the design of a digital platform that enhances operational efficiency, transparency, and regulatory compliance in livestock transport management.

By applying TAM alongside Technological Determinism, Technological Innovation, and Information Systems Theory, this study provides a comprehensive foundation for designing a smart swine transport permit management system that is functionally effective, user-friendly, and capable of improving operational efficiency, transparency, and decision-making for its intended users.

**Conceptual Framework**

**Figure 2***. The Conceptual Framework of the Proposed System.*	

	Figure 2 illustrates the stages of input, process and output for the Design and Development of a Smart Swine Transport Permit Management System with Geospatial Mapping, Secure Document Verification, and Automated Notification for the Sariaya Municipal Agriculture Office. The input stage consists of the data provided to the system for processing swine transport permits, including applicant information (name, contact details, farm or handler details), uploaded application requirements (veterinary certificates, identification documents), payment information (permit fees and transaction details), farm or barangay location data (for geospatial mapping), livestock information (number, type, and health status of swine), and system user information (municipal staff and veterinary officer IDs, roles, and permissions). These inputs reflect the current operational challenges faced by the Municipal Agriculture Office, such as manual document verification, inefficient permit tracking, and limited monitoring of swine movement, highlighting the need for a digital solution. 

The process stage represents the deployment of the fully integrated system itself: the Smart Web-Based Swine Transport Permit Management System with Geospatial Mapping, Secure Document Verification, and Automated Notification, which generates digitally issued permits with QR codes, validated document records, geospatial livestock monitoring maps, automated notifications, and administrative reports that support data-driven decision-making within the Municipal Agriculture Office. Finally, the output stage represents the results generated by the system, including digital permit issuance with QR code verification, geospatial livestock monitoring maps, automated notifications with payment confirmation, and comprehensive reports with audit trail logs. These outputs support improved speed, transparency, and data-driven decision-making within the Municipal Agriculture Office.

**Definition of Terms**

The following terms are defined operationally to provide clarity and context for the study:

*Technical Terms*

**Automated SMS Notification:** A system-generated short message service used to provide real-time updates to applicants regarding their permit status, approval, or deficiencies.

**Geospatial Mapping:** The visual representation of livestock data (such as swine density) on a digital map, used to track geographical distribution across various barangays in Sariaya.

**Optical Character Recognition (OCR):** A technology used by the system to convert text from uploaded images or PDF documents (like veterinary certificates) into machine-readable data to reduce manual entry errors.

**QR Code (Quick Response Code):** A two-dimensional barcode generated for every approved permit, allowing inspectors to verify the authenticity of the document instantly using a mobile scanner.

**Role-Based Access Control (RBAC):** A security method that restricts system access to authorized users (Applicants, MAO Staff, Veterinary Officers) based on their specific professional responsibilities.

**Web-Based System:** An application platform hosted on a server that users access via a web browser over the internet, eliminating the need for local software installation.

**Application Programming Interface (API):** it is the system integration used to connect external services such as SMS notifications, OCR processing, and online payment systems.

**Django:** The backend framework used in the system to manage data processing, business logic and server-side operations.

**React.js:** The frontend technology used to create an interactive and responsive user interface for applicants and administrators.

**Leaflet.js:** The mapping library used in the system to display geospatial data and visualize livestock distribution.

**Payment Gateway:** The system component that processes online payments for permit fees securely.

**Paymongo:** The online payment service used in the system to securely process swine transport permit fees, generate digital receipts, and automatically update the application status upon successful payment.

*Operational Terms*

**Applicant:** Refers to the farmers or livestock handlers who use the system to apply for transport permits and upload required documentation.

**Audit Trail:** A digital chronological record within the system that tracks all actions taken by users, such as who approved a permit and when, ensuring accountability.

**Centralized Database:** The system’s unified storage where all records, documents, and transactions are maintained.

**Digital Receipt:** The system-generated proof of payment issued after successful online transactions.

**Livestock Density:** The calculated concentration of swine within a specific barangay, derived from the number of permits issued and farm data stored in the system.

**Municipal Agriculture Office (MAO):** The primary regulatory body in Sariaya responsible for overseeing the permit issuance process and monitoring livestock movement.

**Permit Management:** The end-to-end digital process encompassing the submission, verification, payment, approval, and archiving of swine transport documents.

**Swine Transport Permit:** The official digital authorization issued by the MAO that allows the legal movement of pigs from one location to another, ensuring they meet health standards.

**System Administrator:** Refers to the authorized user responsible for managing system operations, users, and data.

**Veterinary Health Certificate:** A mandatory document issued by a licensed veterinarian that must be uploaded to the system to prove the animals are free from diseases like ASF.

