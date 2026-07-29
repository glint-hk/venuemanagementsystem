**STAKEHOLDER DISCOVERY & ANALYSIS REPORT**

**Centralized Venue Booking & Event Approval Platform**

*Agile Product & Project Management*

Prepared by: **ASIM PRASAD BEHERA, Analyst**

Document Type: Stakeholder Discovery Knowledge Base Report

July 2026

*Confidential --- Prepared for Academic Submission*

# **Table of Contents**

1\. Executive Summary3

2\. Stakeholder Analysis3

3\. As-Is Process Analysis5

4\. Approval Workflow Diagrams6

5\. Coordination Process8

6\. Business Rules8

7\. Functional Requirements9

8\. Non-Functional Requirements11

9\. Pain Point Analysis11

10\. Process Improvement Opportunities12

11\. Assumptions13

12\. Limitations13

13\. Conclusion13

# **1. Executive Summary**

This report presents the findings of a stakeholder discovery exercise
conducted to understand how the institute currently manages venue
booking, event approvals, and inter-departmental coordination. The
exercise was undertaken as the diagnostic phase of an Agile product
initiative to design a centralized venue booking platform, and its
findings form the evidence base for the functional and non-functional
requirements presented in this document.

Three stakeholders were consulted: the Cultural Secretary, who provided
an end-to-end account of the approval workflow across all venue
categories; the Infrastructure Secretary, who confirmed ownership of
hostel-related spaces; and the Operations Coordinator of the Dance Club,
who independently validated the workflow from the perspective of an
active event-organizing team.

The consultations confirm that venue ownership at the institute is
decentralized across at least three distinct authorities --- the Estate
Office, the Infrastructure Secretary, and the PGP Office --- each
governing a different class of venue with its own approval chain.
Estate-managed venues, which host major institute events, follow the
longest and most sequential approval chain, requiring an Event Approval
Document (EAD) to be routed through the Student Affairs Office, the
Student Affairs Chair, the Dean (Infrastructure), the Director, and
finally the Estate Office itself, before a booking can be confirmed. All
current coordination is conducted manually over email, with no
centralized system for tracking venue availability, approval status, or
booking history.

These findings point to a clear opportunity: a configurable,
workflow-driven booking platform that formalizes existing ownership
boundaries and approval chains while replacing manual email routing with
automated, auditable, and transparent processes. The remainder of this
report documents the as-is process landscape, the business rules and
requirements derived from it, and the assumptions and limitations that
should inform the next phase of product design.

# **2. Stakeholder Analysis**

Three stakeholders were consulted during this discovery phase, selected
to provide both an administrative and an end-user perspective on the
venue booking and event approval landscape.

  ------------------------------------------------------------------------
  **Stakeholder**      **Role**           **Primary Area of Insight**
  -------------------- ------------------ --------------------------------
  Shivam Subhash       Cultural Secretary Complete workflow for organizing
  Paymode                                 campus events and obtaining
                                          venue approvals across all venue
                                          categories

  Nisarg               Infrastructure     Ownership and operational
                       Secretary          responsibility for hostel common
                                          rooms and common spaces

  Harshvardhan         Operations         Front-line validation of the
                       Coordinator, Dance Estate Office approval workflow
                       Club               from an active event-organizing
                                          team
  ------------------------------------------------------------------------

## **2.1 Shivam Subhash Paymode --- Cultural Secretary**

As Cultural Secretary, this stakeholder holds direct working knowledge
of the end-to-end approval chain for campus events. The discussion
objective was to understand the complete workflow followed for
organizing events and obtaining venue approvals, and this consultation
forms the primary source for the venue ownership map, the classroom and
hostel booking workflows, and the detailed Estate Office approval chain
documented in Section 3.

## **2.2 Nisarg --- Infrastructure Secretary**

This consultation confirmed that hostel common rooms and hostel common
spaces fall under the ownership of the Infrastructure Secretary. As the
stakeholder had only recently assumed office, detailed institutional
knowledge of legacy workflows, escalation procedures, and historical
coordination mechanisms was still being acquired at the time of
discussion. Accordingly, this discussion primarily served to validate
venue ownership rather than to add further workflow detail, which is
reflected in the medium-high (rather than high) confidence rating
assigned to the hostel booking workflow in Section 11.

## **2.3 Harshvardhan --- Operations Coordinator, Dance Club**

This stakeholder\'s experience closely aligned with the workflow
described by the Cultural Secretary, providing independent, front-line
confirmation of the Estate Office process. Additional operational detail
gathered from this discussion included the requirement that Event
Approval Documents (EADs) be submitted at least 15 days before an event,
and that the EAD is used to capture the logistical and infrastructure
requirements needed for administrative approval. Because this account
was obtained independently and corroborates the Cultural Secretary\'s
description, it substantially raises confidence in the overall Estate
Office workflow.

# **3. As-Is Process Analysis**

## **3.1 Venue Ownership**

Venue ownership at the institute is decentralized across three distinct
administrative authorities. There is no single office responsible for
all campus venues; instead, responsibility depends on the category of
venue being booked.

  -----------------------------------------------------------------------
  **Venue Category**                       **Responsible Authority**
  ---------------------------------------- ------------------------------
  Aryabhatta, GNB Circle, MV Circle,       Estate Office
  Samanjasya, Utsav, and other major event 
  venues                                   

  Hostel Common Rooms                      Infrastructure Secretary

  Hostel Common Spaces                     Infrastructure Secretary

  Academic Classrooms                      PGP Office
  -----------------------------------------------------------------------

This fragmentation means a requester must already know which office
controls a given venue before a booking process can even begin --- the
first of several pain points discussed in Section 8.

## **3.2 Classroom Booking Workflow**

Academic classrooms are booked through the PGP Office or the relevant
academic authority. Depending on the nature of the booking, approval may
involve the PGP Office, the Academic Secretary, or the Infrastructure
Secretary.

## **3.3 Hostel Common Space Booking Workflow**

Hostel common rooms and common spaces are booked directly through the
Infrastructure Secretary, who both receives the request and grants
approval.

## **3.4 Estate Office Approval Workflow**

Major event venues managed by the Estate Office require the most
elaborate approval chain of the three categories. The organizing club or
committee prepares an Event Approval Document (EAD), which is then
routed sequentially through five administrative layers --- Student
Affairs Office, Student Affairs Chair, Dean (Infrastructure), and
Director --- before being returned to the Student Affairs Office and
forwarded to the Estate Office for final confirmation via the
Administrative Officer and Chief Administrative Officer. This is
currently the longest approval chain among all venue categories, and the
Event Approval Document should be submitted at least 15 days before the
event.

## **3.5 Current Communication Channels**

Across all three workflows, coordination relies entirely on email,
manual document submission, and informal departmental coordination. No
centralized booking platform exists today, and there is no digital
system of record for tracking a request as it moves between offices.

# **4. Approval Workflow Diagrams**

The three diagrams below consolidate the as-is workflows described in
Section 3, reconstructed from the stakeholder consultations and
cross-validated between the Cultural Secretary and the Dance Club\'s
Operations Coordinator for the Estate Office chain.

## **4.1 Estate Office Venue Booking**

  -----------------------------------------------------------------------
  **Club / Committee**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Prepare Event Approval Document (EAD)**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Student Affairs Office**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Student Affairs Chair**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Dean (Infrastructure)**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Director**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Student Affairs Office (return)**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Estate Office**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Administrative Officer**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Chief Administrative Officer**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Venue Booking Confirmation**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*Figure 1 --- Estate Office approval chain (longest workflow; EAD
submitted ≥ 15 days in advance)*

## **4.2 Classroom Booking**

  -----------------------------------------------------------------------
  **Requester**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **PGP Office / Academic Authority**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Approval**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Booking Confirmation**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*Figure 2 --- Classroom booking workflow*

## **4.3 Hostel Common Space Booking**

  -----------------------------------------------------------------------
  **Requester**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Infrastructure Secretary**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Approval**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Booking Confirmation**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*Figure 3 --- Hostel common space booking workflow*

# **5. Coordination Process**

Coordination across all three workflows is presently manual and
email-driven. A requester must identify the correct authority, initiate
contact by email, and then wait for that authority --- or, in the case
of Estate Office venues, a sequence of five or more authorities --- to
review and respond. There is no shared system of record, so status
updates depend on the requester following up directly with whichever
office currently holds the request.

Three structural characteristics define the current coordination model:

-   Ownership-dependent entry point --- the correct starting office
    varies by venue category.

-   Sequential, not parallel, approval --- each authority in the Estate
    Office chain must act before the next is engaged.

-   No shared visibility --- neither the requester nor downstream
    approvers can see where a request currently sits without asking.

# **6. Business Rules**

  ---------------------------------------------------------------------------
  **\#**   **Business Rule**                             **Source**
  -------- --------------------------------------------- --------------------
  1        Venue ownership is category-dependent;        Cultural Secretary;
           different authorities manage different venue  Infrastructure
           types.                                        Secretary

  2        Major events require submission of an Event   Cultural Secretary;
           Approval Document (EAD).                      Dance Club
                                                         Coordinator

  3        The EAD should be submitted at least 15 days  Dance Club
           prior to the event.                           Coordinator

  4        Estate-managed venues require multiple        Cultural Secretary
           sequential administrative approvals before    
           booking confirmation.                         

  5        Current coordination relies primarily on      All stakeholders
           email and manual document handling.           
  ---------------------------------------------------------------------------

# **7. Functional Requirements**

The functional requirements below are organized by capability area and
are derived directly from the business rules, ownership boundaries, and
pain points identified during stakeholder discovery.

## **7.1 Venue Management**

-   Centralized venue catalogue

-   Venue categorization

-   Venue ownership mapping

-   Availability management

## **7.2 Booking Management**

-   Booking request creation

-   Booking modification

-   Booking cancellation

-   Booking history

## **7.3 Workflow Engine**

-   Configurable approval workflows

-   Multi-stage approvals

-   Automatic routing to the correct authority

-   Support for both parallel and sequential approvals

-   Escalation support

## **7.4 Notifications**

-   Email notifications

-   Approval notifications

-   Booking confirmation notifications

-   Rejection notifications

-   Reminder notifications

## **7.5 User Features**

-   Booking dashboard

-   Approval tracking

-   Calendar view

-   Venue search

-   Availability check

## **7.6 Administration**

-   Role management

-   Venue management

-   Black-out date configuration

-   Booking boundary configuration

-   Approval workflow configuration

# **8. Non-Functional Requirements**

  -----------------------------------------------------------------------
  **Category**          **Requirement**
  --------------------- -------------------------------------------------
  Access Control        Role-based access control aligned to existing
                        ownership boundaries

  Auditability          Full audit trail of requests, approvals, and
                        status changes

  Scalability           Ability to support growth in venues, users, and
                        concurrent bookings

  Availability          High availability of the booking platform

  Usability             Ease of use for both requesters and approvers

  Maintainability       Straightforward maintenance and configuration by
                        administrators

  Configurability       Configurable workflows, boundaries, and black-out
                        periods

  Transparency          Visibility into availability, approval status,
                        and booking history

  Data Integrity        Consistent and reliable booking and approval data
  -----------------------------------------------------------------------

# **9. Pain Point Analysis**

  -----------------------------------------------------------------------
  **Pain Point**        **Description / Impact**
  --------------------- -------------------------------------------------
  Fragmented Ownership  Requesters must already know which office
                        controls a given venue before starting a booking.

  Manual Routing        Booking requests are routed by hand over email
                        rather than automatically.

  Long Approval Chains  Estate-managed venues require multiple sequential
                        approvals, extending turnaround time.

  Heavy Reliance on     All coordination happens over email and manual
  Email                 document submission, with no system of record.

  Lack of Transparency  Requesters cannot easily determine venue
                        availability, approval status, current approver,
                        or booking history.

  No Real-Time Tracking There is no way to monitor where a request
                        currently sits in the approval chain.

  No Unified Booking    Each venue category requires a separate,
  Portal                manually-initiated process.
  -----------------------------------------------------------------------

# **10. Process Improvement Opportunities**

The following opportunities are derived directly from the pain points
and requirements above, and represent the core value proposition of a
centralized booking platform.

## **10.1 Replace Manual Routing with Automated Workflow**

A configurable workflow engine can encode each venue category\'s
existing approval chain --- including the sequential Estate Office chain
--- so that requests are automatically routed to the correct authority
without requiring the requester to identify it manually.

## **10.2 Establish a Single Source of Truth**

A centralized venue catalogue with ownership mapping addresses the
fragmented-ownership pain point directly, giving every requester a
single starting point regardless of venue category.

## **10.3 Introduce Real-Time Status Tracking**

A booking dashboard and approval-tracking feature would resolve the lack
of transparency identified across all three workflows, allowing
requesters and approvers alike to see where a request currently stands.

## **10.4 Formalize Informal Rules**

Configurable black-out dates and advance booking windows would formalize
rules --- such as the 15-day EAD submission requirement and likely
examination or convocation black-outs --- that today exist only
informally or by convention.

## **10.5 Reduce Email Dependency**

Structured, automated notifications for approvals, confirmations,
rejections, and reminders can progressively reduce reliance on ad hoc
email threads while preserving a clear audit trail.

# **11. Assumptions**

-   The Estate Office workflow has been reconstructed using inputs from
    stakeholders directly involved in event organization and
    coordination.

-   Black-out dates could not be officially verified during this
    discovery phase and should therefore remain
    administrator-configurable rather than hard-coded.

-   Exact approval timelines were not formally documented, with the
    exception of the requirement that Event Approval Documents be
    submitted at least 15 days before the event.

## **11.1 Confidence Assessment**

  -----------------------------------------------------------------------
  **Topic**                                      **Confidence**
  ---------------------------------------------- ------------------------
  Venue ownership                                High

  Estate approval workflow                       High

  Classroom booking workflow                     High

  Hostel booking workflow                        Medium-High

  Event Approval Document process                High

  Advance submission requirement                 High

  Black-out dates                                Low

  Booking priorities                             Low

  Cancellation rules                             Low
  -----------------------------------------------------------------------

# **12. Limitations**

-   The discovery sample was limited to three stakeholders; each venue
    category (other than Estate Office) was validated by only one
    respondent.

-   The Infrastructure Secretary had only recently assumed office at the
    time of consultation, limiting the depth of historical and
    escalation-procedure detail available for hostel-related workflows.

-   Findings are based entirely on stakeholder interviews; no formal
    policy documents, SOPs, or system logs were reviewed as part of this
    phase.

-   Black-out dates, booking priority rules, and cancellation rules
    remain low-confidence areas that require further validation before
    they are finalized in the platform design.

# **13. Conclusion**

This stakeholder discovery phase confirms that the institute\'s current
venue booking and event approval landscape is decentralized, manually
coordinated, and dependent on informal institutional knowledge of which
office to approach for a given venue. The Estate Office approval chain,
in particular, involves a long sequence of administrative sign-offs that
would benefit substantially from automated routing and status tracking.

The venue ownership map, workflow diagrams, business rules, and
functional and non-functional requirements documented in this report
provide a validated foundation for the design of a centralized booking
platform. Before that design proceeds, however, the low-confidence areas
identified in Section 11 --- black-out dates, booking priorities, and
cancellation rules --- should be validated with the relevant
administrative offices to ensure the platform reflects institute-wide
policy rather than assumption.


---

**STAKEHOLDER DISCOVERY --- SUPPLEMENTARY ADDENDUM**

**Booking Prioritization & Black-out Date Rules**

*Agile Product & Project Management*

Prepared by: **Asim Prasad Behera, Analyst**

Document Type: Supplementary Addendum to the Stakeholder Discovery &
Analysis Report

July 2026

*Confidential --- Prepared for Academic Submission*

# **Table of Contents**

1\. Purpose & Scope of This Addendum3

2\. New Stakeholder Consulted3

3\. Booking Prioritization & Overlap Resolution4

4\. Black-out Date Rules (Confirmed)5

5\. Consolidated Business Rules Update6

6\. Updated Confidence Assessment7

7\. Impact on Functional Requirements7

8\. Limitations8

9\. Conclusion9

# **1. Purpose & Scope of This Addendum**

This addendum supplements the Stakeholder Discovery & Analysis Report
previously prepared for the centralized venue booking platform
initiative. It documents new information obtained from an additional
stakeholder consultation and should be read alongside the primary report
rather than in place of it.

The primary report identified booking priorities and black-out dates as
low-confidence areas, since no stakeholder consulted at the time could
confirm institutional rules for either topic. The follow-up consultation
documented here directly addresses both gaps, and this addendum updates
the relevant sections of the primary report --- Section 6 (Business
Rules), Section 11 (Assumptions and Confidence Assessment), and Section
12 (Limitations) --- accordingly.

# **2. New Stakeholder Consulted**

  ------------------------------------------------------------------------
  **Stakeholder**      **Role**               **Primary Area of Insight**
  -------------------- ---------------------- ----------------------------
  Chaitanya            Former Infrastructure  Historical/legacy knowledge
                       Secretary              of overlap-resolution
                                              conventions and
                                              institutional black-out
                                              periods

  ------------------------------------------------------------------------

Chaitanya previously held the role of Infrastructure Secretary and was
consulted specifically to fill the legacy-knowledge gap left by the
current Infrastructure Secretary, Nisarg, who had only recently assumed
office at the time of the original discovery phase (see Section 2.2 of
the primary report). The discussion objective was to understand how
booking conflicts between overlapping event requests are resolved, and
what black-out periods, if any, apply across the institute\'s venue
categories.

# **3. Booking Prioritization & Overlap Resolution**

When two or more requests compete for the same venue, the default rule
is first-come, first-served (FCFS): the club or committee (referred to
by the stakeholder as the CCAS) that submits its request first is
granted the booking.

This default can be overridden in specific circumstances. Where one of
the competing events is a flagship institute event, or involves an
important guest, the approving authority may set aside the first-come,
first-served order in favor of the higher-profile event, even if that
request was submitted later. According to the stakeholder, this override
is applied only in select cases rather than routinely.

  -----------------------------------------------------------------------
  **Overlapping Booking Requests Received**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**↓**

  -----------------------------------------------------------------------
  **Default Rule Applied: First-Come, First-Served**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

***↓ exception --- applied only in select cases***

+-----------------------------------------------------------------------+
| **Flagship Event / Important Guest?**                                 |
|                                                                       |
| *Approving authority may override FCFS in favor of the higher-profile |
| event*                                                                |
+=======================================================================+
+-----------------------------------------------------------------------+

**↓**

  -----------------------------------------------------------------------
  **Final Priority Decision & Booking Confirmation**
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

*Figure 1 --- Booking prioritization and overlap-resolution logic*

The stakeholder did not specify which office formally holds override
authority. Given that Estate-managed venues already pass through a
multi-level approval chain (Student Affairs Office, Student Affairs
Chair, Dean (Infrastructure), Director), the override is provisionally
assumed to be exercised within that same chain.

# **4. Black-out Date Rules (Confirmed)**

Two institutional black-out rules were confirmed during this
consultation, both of which were previously unverified (low confidence)
in the primary report.

## **4.1 Examination Period Black-out**

Approximately one to two days before an examination period begins,
through to its conclusion, hostel venues --- including personal/hostel
common rooms and other common spaces --- are sealed for parties and
cannot be booked by students. PGP rooms and academic classrooms are
similarly closed to bookings for the same period. This rule exists
specifically to prevent disruption to exam preparation.

## **4.2 Placement Period Black-out**

A separate, stricter black-out applies around the institute\'s placement
season, with two overlapping but distinct windows:

  -------------------------------------------------------------------------
  **Black-out Window** **Approximate Duration**   **Venues / Scope
                                                  Affected**
  -------------------- -------------------------- -------------------------
  General event        4--5 days before           All event venues --- the
  booking ban          placements begin, through  CCS (clubs/committees)
                       to their conclusion        may not book any venue;
                                                  only
                                                  placement-committee-run
                                                  events are permitted

  Academic facility    2--3 days before           Classrooms, Library, and
  closure              placements begin, through  Computer Center (CC)
                       to their conclusion        
  -------------------------------------------------------------------------

In both placement-related windows, the restriction is absolute rather
than discretionary: no event bookings by clubs or committees are
permitted, regardless of an event\'s profile, unless the event is itself
run by a placement committee.

# **5. Consolidated Business Rules Update**

The following rules extend the business rules register presented in
Section 6 of the primary report (Rules 1--5) with three newly confirmed
rules.

  ----------------------------------------------------------------------------
  **\#**   **Business Rule**                                **Source**
  -------- ------------------------------------------------ ------------------
  6        Overlapping booking requests are resolved on a   Chaitanya, Former
           first-come, first-served basis by default.       Infrastructure
                                                            Secretary

  7        The approving authority may override first-come, Chaitanya, Former
           first-served priority in favor of a flagship     Infrastructure
           institute event or an event involving an         Secretary
           important guest, on a case-by-case basis.        

  8        Hostel common spaces, PGP rooms, and classrooms  Chaitanya, Former
           are black-out for booking 1--2 days before and   Infrastructure
           throughout examination periods; event venues are Secretary
           black-out for CCAS bookings 4--5 days before and 
           throughout placements, with classrooms, library, 
           and the Computer Center closed 2--3 days before  
           and throughout placements.                       
  ----------------------------------------------------------------------------

# **6. Updated Confidence Assessment**

This consultation directly raises confidence in the two lowest-rated
topics from the primary report.

  ------------------------------------------------------------------------
  **Topic**          **Previous       **Updated        **Basis for
                     Confidence**     Confidence**     Update**
  ------------------ ---------------- ---------------- -------------------
  Booking priorities Low              Medium           FCFS default and
                                                       override exception
                                                       confirmed by one
                                                       former
                                                       administrator;
                                                       override authority
                                                       not yet specified

  Black-out dates    Low              Medium-High      Exam-period and
                                                       placement-period
                                                       black-outs
                                                       confirmed with
                                                       approximate
                                                       durations by one
                                                       former
                                                       administrator
  ------------------------------------------------------------------------

# **7. Impact on Functional Requirements**

These findings confirm and refine two capability areas already
anticipated in the primary report\'s functional requirements (Section
7): black-out date configuration and booking boundary configuration.
They also surface one addition:

-   Black-out date configuration should support multiple named black-out
    types (examination, placement) with independent lead-in windows and
    independent venue scopes, rather than a single institute-wide
    black-out calendar.

-   Booking boundary configuration should support an absolute
    (non-overridable) black-out mode for placement-period restrictions,
    distinct from a discretionary priority mode for ordinary overlaps.

-   The workflow engine should support a manual priority-override
    action, restricted to authorized approvers, that lets a flagship or
    VIP-attendance event take precedence over an earlier-submitted
    request --- with the override reason captured for audit purposes.

# **8. Limitations**

-   This addendum is based on a single-source account from a former (not
    currently serving) office-holder; but has been cross-validated by a
    second stakeholder.

-   Durations were given as approximate ranges (\"one or two days,\"
    \"four to five days,\" \"two to three days\") rather than fixed
    values.

-   No formal policy documents, academic calendars, or placement-office
    schedules were reviewed to corroborate the stated black-out windows.

# **9. Conclusion**

This addendum resolves two of the three low-confidence areas flagged in
the primary report, confirming that overlap resolution follows a
first-come, first-served default with a discretionary override for
flagship or VIP-attendance events, and that examination and placement
periods each carry distinct, previously undocumented black-out rules.
