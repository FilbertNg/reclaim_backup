## **SYSTEM ANALYSIS DOCUMENTATION (SAD)** 

**Reclaim - AI-assisted expense reimbursement with** 

**intelligent decision support.** 

## _**1. Introduction:**_ 

_[Here, you can tell that this SAD for “Reclaim” acts as a strategic solution to the problem statement highlighted in the Product Review Documentation, explaining how Reclaim solves and streamlines the common issue of manual work between HR and employees.]_ 

_Note: In a brief 1-2 paragraphs_ 

## _**1.1. Purpose:**_ 

_[Here, you can tell tell that this SAD outlines the technical scope, agentic workflows, and foundational design decisions driving Reclaim's key components.  ]_ 

_Note : In a brief 1-2 paragraphs_ 

## _**1. Architecture** :_ 

_[Scan the entire related architecture across the repository, starting from the root directory, and explain it here]_ 

_Note: This can be written as a paragraph or as a list (a, b, c...), depending on what you think works best.  1-2 paragraphs_ 

## _**2. Data Flows:**_ 

_[Scan the entire related data flows  from the whole repository starting from root and explain here]_ 

_Note: Describe how data flows from user input to user output for every portal (Employee Portal and HR Portal). 1-2 paragraphs_ 

_You can structure it like this:_ 

_a. Employee Portal_ 

_b. HR Portal_ 

_Then, define and describe the complete process for each portal._ 

## _**3. Model Process:**_ 

_[Scan all related model processes across the repository, starting from the root directory, and explain them here]  1-2 paragraphs_ 

_Note: Describe the workflow for each core feature, from input through to output._ 

## _**4. Role of Reference:**_ 

_[State the purpose of this document, which serves as an architectural blueprint for the developer_ 

_and QA teams. Explain how the entire process handles real-world ambiguities and can be utilized by a wide audience (elaborate more here)]_ 

_Note :  1-2 paragraphs. Focus on the brief explanation but still containing the important message._ 

## _**1.2. Background** :_ 

_[Describe the overall background where most organizations and companies regularly submit diverse expense claims through manual and bottlenecked processes._ 

_State that we are using a real-world example from a multinational (MNC) PT company in Indonesia that focuses on insurance. We extracted the following documents from that company:_ 

- _a. Policy Document for Reimbursement_ 

- _b. Appendix of the Policy Document_ 

- _c. Business Travel Settlement for Employee Submission Claim Form]_ 

## _1. Previous Version:_ 

_[Explain how the company handled this in the previous version, where employees had to collect receipts, manually type forms in Word/Google Docs, submit them to HR, wait for HR reviews, etc.]_ 

_→ Explain the standard workflow, but ensure it is presented as the antithesis of Reclaim. This will demonstrate how our system solves this manual, real-world problem in today's era._ 

_Note : Around 2 paragraphs_ 

_2. Changes in Major Architectural Components and New Capabilities Introduced in This Version: [Scan the entire repository and explain how our system technically streamlines that process from beginning to end. Describe the transition from the legacy system to an AI agentic system._ 

_Explain how Reclaim fixes this issue.]_ 

_Note: Around 2 - 4 paragraphs (You can also use bullet points to explain each system/technical component or new capability)._ 

## _**1.3. Target Stakeholder**_ 

|**_Target Stakeholder_**|||
|---|---|---|
|**_Stakeholders_**|**_Roles_**|**_Expectations_**|
|_Employee_|_[Explain the roles of_<br>_employee from using Reclaim_<br>_Program]_<br>_From my perspective is like_<br>_this :_<br>_Choose a category, upload_<br>_receipts (image/pdf), provide_<br>_clarifications , review input_<br>_(verification of scanned_<br>_receipts) if needed, and_<br>_review results of the_<br>_reimbursement including the_<br>_reasoning (why if it’s rejected_<br>_or partially approved)._<br>_HOWEVER double check_<br>_again with the real whole_<br>_workflow_|_[Explain the expectations of_<br>_the employee from using_<br>_Reclaim Program]_<br>_From my perspective is like_<br>_this :_<br>_Streamlining and ease the_<br>_process for reimbursement_<br>_processing while also_<br>_accessing clear results._<br>_HOWEVER double check_<br>_again with the real whole_<br>_workflow_|
|_HR Only / Finance Only / HR_<br>_and Finance / Or Others ???_<br>_Please think about it_<br>_regarding our whole program_<br>_workflow, since i also_<br>_confused in the real world it’s_<br>_useful for who._|_[Explain the roles of_<br>_HR/FINANCE/? from using_<br>_Reclaim Program]_<br>_From my perspective is like_<br>_this :_<br>_Upload policy PDFs, Review_<br>_and Edit policy PDFs based on_<br>_mandatory guardrails (SOP_<br>_checklist), and reviews, edit_<br>_and make final decisions_<br>_based on the post AI result_<br>_from the employee_<br>_submission claim form._<br>_HOWEVER double check_<br>_again with the real whole_<br>_workflow_|_[Explain the expectations of_<br>_HR/FINANCE/? from using_<br>_Reclaim Program]_<br>_From my perspective is like_<br>_this :_<br>_High quality results from AI_<br>_Decision that less of_<br>_hallucinations, fit the policy_<br>_adherence, and clear_<br>_reasoning and explanations,_<br>_and are easy to use and_<br>_review._<br>_HOWEVER double check_<br>_again with the real whole_<br>_workflow_|



|_Development Team_<br>_(SHOULD WE INCLUDE THIS?_<br>_Since i don’t know target_<br>_stakeholder is for user or_<br>_what, but in the example_<br>_there is development team)_|_[Explain the roles of Future_<br>_Development team from_<br>_using or upgrading Reclaim_<br>_Program?]_|_[Explain the expectations of_<br>_the Future Development team_<br>_from using or upgrading the_<br>_Reclaim Program?]_|
|---|---|---|
|_QA Team_<br>_(SHOULD WE INCLUDE THIS?_<br>_Since i don’t know target_<br>_stakeholder is for user or_<br>_what, but in the example_<br>_there is QA team))_|_[Explain the roles of Future_<br>_QA Team from using or_<br>_upgrading Reclaim_<br>_Program?]_|_[Explain the expectations of_<br>_the Future QA Team from_<br>_using or upgrading Reclaim_<br>_Program?]_|



## _**2. System Architecture & Design**_ 

_Note : DO DEEP ANALYSIS IN THIS SECTION. MAKE SURE IT’S SAME WITH ALL OF THE OVERALL REPO. IF THERE IS SOMETHING THAT ARE NOT ALIGNED WITH THE OVERALL REPO, PLEASE MAKE A CHANGE._ 

## _**2.1. High Level Architecture**_ 

## **2.1.1. Overview:** 

|**Type**|**Details**|
|---|---|
|_System_|_Explain our system [Scan our system first from the repository,_<br>_but I think it is more of a responsive client-server website_<br>_(mobile or dashboard).]  1-2 sentences only_|
|_Architecture_|_Explain our architecture [Scan our architecture first from the_<br>_repository, but I think it is more of a cloud server with_<br>_microservices.]  1-2 sentences only_|



_[Explain about the overview architecture of our programme, including its system]_ 

_Note : 1 Paragraph only (3-5 sentences only)_ 

## **2.1.2 LLM as Service Layer** 

[Explain about how the architecture of reclaim use GLM as the main and core brain / orchestrator / central reasoning, while using another LLM as a supporting embedding and vision models] 

## **2.1.3 Dependency Diagram** 

- _a. How the prompts are being constructed and sent to the GLM API_ 

- _b. What goes into the context window?_ 

- _c. How is your system receiving, parsing the responses and passing to the next system component?_ 

- _d. Where the limitation of token are enforced or input are chunked before it actually reaches to GLM_ 

- _e. Also, do outline all the major API calls between the system components_ 

- _f. Do show how frontend, backend, services, database and external API interacts with each other_ 

- _g. Must highlights the distributed components if the system is planning to be deployed across multiple services_ 

## **2.1.4.     Sequence Diagram** 

- _a. Here, do walk through one user interaction flow or customer journey with the stakeholders._ 

- _b. Show the interactions step by step._ 

- _c. Do demonstration of each key system features does operate from start to finish_ 

## _**2.2. Technological Stack**_ 

- _**2.2.1.** UI/UX (?)_ 

Google Stitch (?), Figma (?) 

- _**2.2.2.** Frontend_ 

Next.js, React, TailwindCSS 

- _**2.2.3.** Backend_ 

_FastAPI (Python) – RESTful APIs for …_ 

_Langgraph & Langchain_ 

_UV_ 

- _**2.2.4.** Database_ 

   - _PostgreSQL_ 

- _**2.2.5.** Cloud/Deployment_ 

_Planning to deploy via VPS docker droplet for MVP._ 

## _**2.3. Key Data Flows 2.3.1. Overview**_ 

_[Explain in a brief of the how data are moving through the system and how its structure and stored]_ 

## _**2.3.1.1. Data Flow Diagram (DFD)**_ 

- _a. Illustrate the data movement across the entire system that includes external entities (users), processes, external service and databases_ 

- _b. Show how proper laws are met (e.g. Black Hole)_ 

## **2.3.2. Normalized Database Schema** 

[Show the logical data model (ERD) with Database designed to 3NF form to ensure data integrity and relationships. ] 

## _**3. Functional Requirements & Scope**_ 

_This section highlights the core boundaries of the projects. That enables them to focus on a high-impact MVP to showcase the technical feasibility of the project._ 

## _**3.1. Minimum Viable Product:**_ 

- _**3.1.1.** Do list down 3-5 core features that the team is going to build and do a demo by the end of the UMHackathon 2026._ _**[e.g. in Table]**_ 

## _**AI PROMPT : you can add or delete the feature base on the code given**_ 

|**_#_**|**_Features_**|**_Description_**|
|---|---|---|
|**_1_**|**_Receipt Submission_**|_[Refer to code]_|
|**_2_**|_Policy Studio_|_[Refer to code]_|
|**_3_**|**_AI-Driven Claim Evaluation_**|_[Refer to code]_|
||**_HR Decision Dashboard_**||



## _**3.2. Non-Functional Requirements (NFRs)**_ 

_Here, highlights the system qualities that are not features but are crucial for reliability and improve the system. [e.g. table in below]_ 

_**Quality (e.g.) Requirements (e.g.) Implementation (e.g)**_ 

|_Scalability_|_Reclaim must handle multiple simultaneous_<br>_claim_<br>_submissions_<br>_without_<br>_performance_<br>_degradation_|_[VERIFY WITH SOURCE CODE]_|
|---|---|---|
|_Reliability_|_AI evaluation must not produce orphaned or_<br>_incomplete claim records if a step fails_|_Fallback mechanism — escalate_<br>_to HR if ReAct loop fails within 5_<br>_iterations_|
|_Maintainability_|_Employee, HR and AI services should be_<br>_independently manageable_|_[VERIFY WITH SOURCE CODE]_|
|_Token Latency_|_GLM-5.1 API must return evaluation response_<br>_within acceptable time under normal load_|_Asynchronous processing — HR_<br>_can process next claim while_<br>_current one is being evaluated_|
|_Cost Efficiency_|_Token usage per claim must stay within_<br>_budget threshold_|_RAG injects only relevant policy_<br>_chunks — not full document —_<br>_to minimize context window size_|
|_Security_|_Employee data must be strictly isolated —_<br>_employees can only access their own claims_|_JWT_<br>_Row-Level_<br>_Security_<br>_at_<br>_database level[VERIFY WITH_<br>_SOURCE CODE]_|



## _**3.3. Out of Scope / Future Enhancements**_ 

- _a. Admin role for company onboarding and user account management_ 

- _b. Direct banking or payroll API integration for auto-disbursement_ 

- _c. Visual drag-and-drop policy workflow builder for HR_ 

- _d. Third-party messaging bot notifications (Slack, Teams, WhatsApp)_ 

- _e. Multi-agent orchestration for parallel claim processing_ 

- _f. Behavioral pattern analysis across employee submission history_ 

## _**4. Monitor, Evaluation, Assumptions & Dependencies**_ 

## _**4.1. Technical Evaluation:**_ 

## _**Note : Focus on future works, since it serves as a proof of concept and MVP. We’ll do this every technical evaluation and some of the required testing in the production deployment.**_ 

- _**4.1.1. Grayscale Rollout:** A strategy where_ _**Reclaim** 's AI auditing features are released to a small control group of HR users first. This allows for monitoring the AI's "Policy vs. Receipt" accuracy before a full-scale release._ 

- _**4.1.2. A/B Testing (Strategy Optimization):** Comparing two versions of the_ _**ReAct reasoning loop** (e.g., one focusing on speed vs. one focusing on high-detail audit logs) to determine which helps HR process claims faster._ 

- _**4.1.3. Emergency Rollback (ER) & Golden Release:** If the AI agent begins hallucinating or the vision model fails at scale, an ER is triggered to revert the system to the_ _**"Golden Version"** —a stable, baseline version of the app where manual review is prioritized and AI features are temporarily bypassed to maintain system uptime._ 

## _**4.1.4. Priority Matrix:**_ 

## _**Note : Don’t be biased, must check the whole repository also, make sure it is aligned.**_ 

- _**P1 - Critical (System-Wide Failure):** * Trigger: If the AI reasoning engine fails or OCR returns null results for >5% of uploads._ 

- _Action: Trigger Emergency Rollback and notify HR to switch to manual processing mode._ 

## _**P2 - High (Data Integrity):**_ 

- _Trigger: If the duplication check tool fails to query the database._ 

- _Action: Temporarily disable auto-recommending and flag all incoming claims as "Requires Human Verification."_ 

## _**P3 - Medium (UI/UX Lag):**_ 

- _Trigger: If the RAG retrieval time exceeds 10 seconds._ 

- _Action: Optimize vector search indexing or implement a "Processing" state in the UI._ 

## _**4.2. Monitoring** :_ 

   - _[Show the planning for the monitoring plan of the_ _**Reclaim’s** system and how it will trigger if any damage is detected to the health of the system. E.g.:_ 

- _**4.2.1. Agreement Rate:** A dashboard tracking how often the AI recommendation aligns with the HR decision—used purely for_ _**user experience insights** , acknowledging that HR has the absolute final authority._ 

   - _**4.2.2. Flagging Employee’s Changes of the Amount Scanned:** Whenever the employee changes the amount to a different amount compared to what the AI scanned, it will flag the receipt, adding context to the AI’s final advice]_ 

- _**4.3. Assumptions:** State key operational & environmental conditions that you assumed to be valid while development of system and deployment. [e.g._ 

      - _a. Users have stable internet connections on their devices during the request submission_ 

      - _b. Employees have their own unique login ID to get into the Employee view and dashboard and to be able to submit claim request_ 

      - _c. Employees have their own “rank” within the company’s operational workplace for different amount of reimbursements allowed depending on such “ranks”_ 

      - _d. Employees submit unstructured inputs (e.g.: receipts in forms of .jpg, .pdf, etc) that may be blurry/unclear yet readable_ 

      - _e. HR have their own unique login ID to get into the HR view or dashboard_ 

      - _f. HR have the authority to approve/reject reimbursement claims_ 

      - _g. Policy Accessibility: Assumes HR provides enough policy context in the "Policy Studio" for the AI to generate a useful summary.]_ 

- _**4.4. External Dependencies:** Do list all the external tools that are applied to your system to_ 

_function. Please also do check the source code what are the tools being used, if there is any unexisting tools stated below, please inform and request to add, or any conflict such as the tools stated but in the source code is not being used._ 

|_Tools_|_Purpose_|_Risks_|
|---|---|---|
|_GLM-5.1 API_|_Summarization & Reasoning engine._|**_Risk:_**_Slow response times._<br>_Mitigation:_<br>_Asynchronous_<br>_processing so HR can move to_<br>_the next receipt while one is_<br>_being "thought" about._|
|_Llama (Vision)_|_OCR extraction from receipts._|**_Risk:_**_Interpretation errors._<br>_Mitigation:_<br>**_Mandatory_**<br>**_Human Review_**_—HR must see_<br>_and confirm the extracted_<br>_data before finalization._|



## _**5. Project Management & Team Contributions**_ 

_The duration of the Preliminary round is approximately 10 days considering the two-week sprint._ 

- _**5.1. Project Timeline:** Show the timeline of development and justify accordingly_ 

   - _Day 1-2, Project Planning, Conceptualization, Formulating Core problem statement, deciding AI agent workflow solution, etc,etc_ 

_Note :_ 

   - _DO UNTIL Day 10. Day 10 is tomorrow. Now is Day 9. But make sure everything is a proper workflow. For example, a professional will do PRD first then coding, IF SO write  that. Explain project timeline in a professional way_ 

   - _We have 6 Submissions : PRD, System Analysis Documentation (SAD) , Quality Assurance (QA), Pitch deck, Code Repository, and Video Demonstration._ 

- _**5.2. Team Members Role:** Highlight the role of team members_ 

_Filbert → Backend + AI + Architecture_ 

_Chingiz → DB + Backend + Connecting Endpoints API_ 

_Darrell → Frontend & UI/UX + Document (PRD, SAD, QA) + Pitch Deck + Product Test Stress + QA Mike → Frontend & UI/UX + Document (PRD, SAD, QA) + Pitch Deck + Product Test Stress + QA Christian → Frontend & UI/UX + Document (PRD, SAD, QA) + Pitch Deck + Product Test Stress + QA_ 

- _**5.3. Recommendations:** If any recommendation is applicable in terms of scalability, performance and reliability [e.g. using Redis Cache for caching, or anything else that we can improve from nowadays system]_ 

