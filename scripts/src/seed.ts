import { db } from "@workspace/db";
import {
  usersTable, jobsTable, screeningQuestionsTable,
  workshopsTable, examQuestionsTable,
  tracksTable, trackModulesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (safe for dev)
  await db.execute(sql`TRUNCATE users, jobs, screening_questions, applications, workshops, enrollments, exam_questions, certificates, tracks, track_modules, user_progress, mock_interview_sessions, mock_interview_messages RESTART IDENTITY CASCADE`);

  // Seed users
  const [admin, alice, bob, carol, dave] = await db.insert(usersTable).values([
    { name: "Ahmed Al-Rashidi", email: "admin@eduplatform.com", passwordHash: Buffer.from("admin123salt_eduplat").toString("base64"), role: "admin", points: 2450, streak: 14 },
    { name: "Alice Johnson", email: "alice@student.com", passwordHash: Buffer.from("pass123salt_eduplat").toString("base64"), role: "student", points: 1850, streak: 7 },
    { name: "Bob Smith", email: "bob@student.com", passwordHash: Buffer.from("pass123salt_eduplat").toString("base64"), role: "student", points: 1200, streak: 3 },
    { name: "Carol Williams", email: "carol@student.com", passwordHash: Buffer.from("pass123salt_eduplat").toString("base64"), role: "student", points: 980, streak: 5 },
    { name: "David Lee", email: "david@instructor.com", passwordHash: Buffer.from("pass123salt_eduplat").toString("base64"), role: "instructor", points: 3200, streak: 21 },
  ]).returning();

  console.log("Users seeded");

  // Seed jobs
  const [job1, job2, job3, job4, job5] = await db.insert(jobsTable).values([
    { title: "Senior React Developer", company: "TechCorp Egypt", description: "We are looking for an experienced React developer to join our growing team. You will be responsible for building and maintaining high-quality web applications using modern React patterns, TypeScript, and REST APIs. Experience with state management, testing, and performance optimization is required.", type: "full-time", level: "senior", location: "Cairo, Egypt", isRemote: false, salaryMin: 25000, salaryMax: 40000, passScore: 75, applicationCount: 0 },
    { title: "Cybersecurity Analyst", company: "SecureNet Solutions", description: "Join our SOC team to protect critical infrastructure. You will monitor security events, analyze threats, respond to incidents, and implement security controls. CISSP or CEH certification is a plus. Knowledge of SIEM tools and penetration testing required.", type: "full-time", level: "mid", location: "Alexandria, Egypt", isRemote: true, salaryMin: 18000, salaryMax: 28000, passScore: 70, applicationCount: 0 },
    { title: "Network Engineer", company: "ConnectPro", description: "Design, implement and maintain enterprise network infrastructure. You will work with routers, switches, firewalls, and VPNs. CCNA certification required. Experience with SD-WAN and cloud networking is a plus.", type: "full-time", level: "mid", location: "Giza, Egypt", isRemote: false, salaryMin: 15000, salaryMax: 22000, passScore: 70, applicationCount: 0 },
    { title: "Training Specialist (TOT)", company: "SkillsUp Academy", description: "Develop and deliver professional training programs for adult learners. You will design curriculum, conduct needs assessments, facilitate workshops, and evaluate training effectiveness. Must hold a TOT certificate.", type: "full-time", level: "mid", location: "Cairo, Egypt", isRemote: true, salaryMin: 12000, salaryMax: 18000, passScore: 65, applicationCount: 0 },
    { title: "Junior Frontend Developer", company: "StartupHub", description: "Great opportunity for recent graduates to work on exciting consumer products. You will write clean HTML, CSS, and JavaScript. React knowledge is a plus. We offer mentoring, flexible hours, and growth opportunities.", type: "full-time", level: "junior", location: "Cairo, Egypt", isRemote: true, salaryMin: 8000, salaryMax: 12000, passScore: 60, applicationCount: 0 },
  ]).returning();

  // Seed screening questions for job1 (React Developer)
  await db.insert(screeningQuestionsTable).values([
    { jobId: job1.id, question: "What is the purpose of React's useEffect hook?", options: ["To manage component state", "To perform side effects in function components", "To render JSX", "To handle user events"], correctIndex: 1, order: 0 },
    { jobId: job1.id, question: "Which of the following correctly describes TypeScript?", options: ["A superset of JavaScript that adds static typing", "A replacement for JavaScript", "A CSS preprocessor", "A testing framework"], correctIndex: 0, order: 1 },
    { jobId: job1.id, question: "What does the React virtual DOM do?", options: ["Stores CSS styles", "Provides a lightweight representation of the real DOM for efficient updates", "Handles HTTP requests", "Manages user authentication"], correctIndex: 1, order: 2 },
    { jobId: job1.id, question: "What is a React custom hook?", options: ["A built-in React API", "A function starting with 'use' that can call other hooks", "A class component method", "An event handler"], correctIndex: 1, order: 3 },
  ]);

  // Seed screening questions for job2 (Cybersecurity)
  await db.insert(screeningQuestionsTable).values([
    { jobId: job2.id, question: "What does SQL injection exploit?", options: ["Network vulnerabilities", "Unvalidated user input in database queries", "Browser cookies", "SSL certificates"], correctIndex: 1, order: 0 },
    { jobId: job2.id, question: "What is a SIEM system?", options: ["A type of firewall", "Security Information and Event Management", "A VPN protocol", "An antivirus tool"], correctIndex: 1, order: 1 },
    { jobId: job2.id, question: "What is the purpose of a penetration test?", options: ["To install software updates", "To simulate attacks and find vulnerabilities before attackers do", "To back up data", "To configure firewalls"], correctIndex: 1, order: 2 },
  ]);

  // Seed questions for job3 (Network Engineer)
  await db.insert(screeningQuestionsTable).values([
    { jobId: job3.id, question: "What does OSPF stand for?", options: ["Open Shortest Path First", "Open Source Protocol Framework", "Optimized Switching Path Format", "Online Switching Port Filter"], correctIndex: 0, order: 0 },
    { jobId: job3.id, question: "What is the default administrative distance of EIGRP?", options: ["90", "110", "120", "20"], correctIndex: 0, order: 1 },
    { jobId: job3.id, question: "Which layer of the OSI model does a router operate at?", options: ["Layer 1", "Layer 2", "Layer 3", "Layer 4"], correctIndex: 2, order: 2 },
  ]);

  console.log("Jobs and screening questions seeded");

  // Seed workshops
  const now = new Date();
  const future1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const future2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const past1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const past2 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [ws1, ws2, ws3, ws4] = await db.insert(workshopsTable).values([
    { title: "Advanced React Patterns & Performance", description: "Deep dive into advanced React patterns including compound components, render props, higher-order components, and custom hooks. Learn how to optimize performance using memoization, lazy loading, and code splitting.", date: future1.toISOString(), duration: 120, instructor: "David Lee", tags: ["React", "TypeScript", "Performance"], status: "upcoming", capacity: 50, enrolledCount: 23, passScore: 75 },
    { title: "Ethical Hacking & Penetration Testing", description: "Hands-on workshop covering the fundamentals of ethical hacking. Topics include reconnaissance, scanning, exploitation, and reporting. Participants will use industry-standard tools like Kali Linux, Metasploit, and Burp Suite.", date: future2.toISOString(), duration: 180, instructor: "Sarah Hassan", tags: ["Cybersecurity", "Ethical Hacking", "Kali Linux"], status: "upcoming", capacity: 30, enrolledCount: 18, passScore: 70 },
    { title: "Training of Trainers (TOT) Fundamentals", description: "This workshop covers the core principles of adult learning, training design, and facilitation skills. Upon passing the assessment, participants receive a globally recognized TOT certificate.", date: past1.toISOString(), duration: 240, instructor: "Mohammed Khalil", tags: ["TOT", "Training", "Facilitation"], status: "completed", capacity: 40, enrolledCount: 35, passScore: 70 },
    { title: "CCNA Networking Bootcamp", description: "Intensive bootcamp covering all CCNA exam topics: network fundamentals, IP connectivity, IP services, security fundamentals, and automation. Includes hands-on labs with Cisco Packet Tracer.", date: past2.toISOString(), duration: 360, instructor: "Ahmed Al-Rashidi", tags: ["CCNA", "Networking", "Cisco"], status: "completed", capacity: 25, enrolledCount: 22, passScore: 75 },
  ]).returning();

  // Seed exam questions for completed workshops
  await db.insert(examQuestionsTable).values([
    { workshopId: ws3.id, question: "What does the 'A' in ADDIE stand for?", options: ["Analyze", "Apply", "Assess", "Assemble"], correctIndex: 0, order: 0 },
    { workshopId: ws3.id, question: "According to Bloom's Taxonomy, which level represents the highest order thinking?", options: ["Knowledge", "Application", "Evaluation", "Comprehension"], correctIndex: 2, order: 1 },
    { workshopId: ws3.id, question: "What is the primary goal of a Training Needs Analysis (TNA)?", options: ["To evaluate the trainer's performance", "To identify the gap between current and desired performance", "To create training materials", "To set the training budget"], correctIndex: 1, order: 2 },
    { workshopId: ws3.id, question: "Which facilitation technique encourages all participants to contribute?", options: ["Lecture", "Round-robin", "Demonstration", "Q&A"], correctIndex: 1, order: 3 },
  ]);

  await db.insert(examQuestionsTable).values([
    { workshopId: ws4.id, question: "What is the purpose of the spanning-tree protocol?", options: ["To encrypt network traffic", "To prevent switching loops in a network", "To assign IP addresses", "To route between VLANs"], correctIndex: 1, order: 0 },
    { workshopId: ws4.id, question: "Which command shows the routing table on a Cisco router?", options: ["show ip interface brief", "show ip route", "show running-config", "show interfaces"], correctIndex: 1, order: 1 },
    { workshopId: ws4.id, question: "What does NAT stand for?", options: ["Network Access Technology", "Network Address Translation", "Node Authentication Token", "Network Administration Tools"], correctIndex: 1, order: 2 },
  ]);

  // Seed learning tracks
  const [tTrack, netTrack, cyberTrack, fsTrack, cbTrack] = await db.insert(tracksTable).values([
    { slug: "tot", title: "Training of Trainers (TOT)", description: "Master the art and science of professional training. Learn adult learning principles, curriculum design, facilitation techniques, and performance evaluation.", category: "Professional Development", level: "intermediate", moduleCount: 8, estimatedHours: 24, enrolledCount: 428 },
    { slug: "networking", title: "CCNA Networking", description: "Complete preparation for the Cisco CCNA certification. From OSI model basics to advanced routing and switching concepts.", category: "IT Infrastructure", level: "intermediate", moduleCount: 12, estimatedHours: 40, enrolledCount: 612 },
    { slug: "cybersecurity", title: "Cyber Security Essentials", description: "Comprehensive introduction to cybersecurity including threat analysis, ethical hacking, incident response, and security architecture.", category: "Security", level: "advanced", moduleCount: 10, estimatedHours: 35, enrolledCount: 389 },
    { slug: "fullstack", title: "Full-Stack Web Development", description: "Build modern web applications from scratch using React, Node.js, PostgreSQL, and cloud deployment. Includes 6 real-world projects.", category: "Software Development", level: "intermediate", moduleCount: 15, estimatedHours: 60, enrolledCount: 831 },
    { slug: "computer-basics", title: "Computer Basics & Digital Literacy", description: "Start your digital journey. Learn essential computer skills, internet safety, productivity tools, and basic troubleshooting.", category: "Fundamentals", level: "beginner", moduleCount: 6, estimatedHours: 12, enrolledCount: 1240 },
  ]).returning();

  // Seed modules for TOT track
  await db.insert(trackModulesTable).values([
    { trackId: tTrack.id, title: "Adult Learning Principles", description: "Explore Malcolm Knowles' andragogy theory and how adults learn differently from children.", type: "lesson", estimatedMinutes: 45, order: 0 },
    { trackId: tTrack.id, title: "Training Needs Analysis", description: "Identify performance gaps and translate organizational needs into training objectives.", type: "lesson", estimatedMinutes: 60, order: 1 },
    { trackId: tTrack.id, title: "Instructional Design with ADDIE", description: "Apply the ADDIE model to design effective training programs.", type: "lesson", estimatedMinutes: 90, order: 2 },
    { trackId: tTrack.id, title: "Bloom's Taxonomy Practice", description: "Apply Bloom's Taxonomy to write measurable learning objectives.", type: "exercise", estimatedMinutes: 30, order: 3 },
    { trackId: tTrack.id, title: "Facilitation Techniques", description: "Master questioning, active listening, and group management skills.", type: "lesson", estimatedMinutes: 60, order: 4 },
    { trackId: tTrack.id, title: "Handling Difficult Situations", description: "Learn strategies for managing challenging participants and unexpected situations.", type: "lesson", estimatedMinutes: 45, order: 5 },
    { trackId: tTrack.id, title: "Training Evaluation Methods", description: "Use Kirkpatrick's 4-level model to measure training effectiveness.", type: "lesson", estimatedMinutes: 45, order: 6 },
    { trackId: tTrack.id, title: "Final Assessment", description: "Demonstrate your readiness to deliver professional training sessions.", type: "quiz", estimatedMinutes: 30, order: 7 },
  ]);

  // Seed modules for Full-Stack track
  await db.insert(trackModulesTable).values([
    { trackId: fsTrack.id, title: "HTML & CSS Fundamentals", description: "Build solid foundations with semantic HTML and modern CSS.", type: "lesson", estimatedMinutes: 120, order: 0 },
    { trackId: fsTrack.id, title: "JavaScript Essentials", description: "Master modern JavaScript including ES6+, async/await, and DOM manipulation.", type: "lesson", estimatedMinutes: 180, order: 1 },
    { trackId: fsTrack.id, title: "React Fundamentals", description: "Build dynamic UIs with React components, hooks, and state management.", type: "lesson", estimatedMinutes: 240, order: 2 },
    { trackId: fsTrack.id, title: "React Project: Todo App", description: "Build a full-featured todo app with filtering, persistence, and drag-and-drop.", type: "exercise", estimatedMinutes: 120, order: 3 },
    { trackId: fsTrack.id, title: "Node.js & Express", description: "Create RESTful APIs using Node.js and Express with authentication.", type: "lesson", estimatedMinutes: 180, order: 4 },
    { trackId: fsTrack.id, title: "PostgreSQL & Drizzle ORM", description: "Design and query relational databases using PostgreSQL and modern ORMs.", type: "lesson", estimatedMinutes: 150, order: 5 },
    { trackId: fsTrack.id, title: "Full-Stack Project: Blog Platform", description: "Build a complete blog platform with user auth, CRUD, and file uploads.", type: "exercise", estimatedMinutes: 240, order: 6 },
    { trackId: fsTrack.id, title: "Deployment & CI/CD", description: "Deploy your app to the cloud with Docker, GitHub Actions, and Vercel.", type: "lesson", estimatedMinutes: 90, order: 7 },
  ]);

  // Seed modules for Cybersecurity track
  await db.insert(trackModulesTable).values([
    { trackId: cyberTrack.id, title: "Cybersecurity Fundamentals", description: "CIA triad, attack types, and security principles every professional must know.", type: "lesson", estimatedMinutes: 60, order: 0 },
    { trackId: cyberTrack.id, title: "Network Security", description: "Firewalls, IDS/IPS, VPNs, and secure network architecture.", type: "lesson", estimatedMinutes: 90, order: 1 },
    { trackId: cyberTrack.id, title: "Ethical Hacking Introduction", description: "Learn the hacker mindset and responsible disclosure practices.", type: "lesson", estimatedMinutes: 60, order: 2 },
    { trackId: cyberTrack.id, title: "Web Application Security", description: "OWASP Top 10, SQL injection, XSS, CSRF, and how to defend against them.", type: "lesson", estimatedMinutes: 120, order: 3 },
    { trackId: cyberTrack.id, title: "Hands-on Lab: OWASP Juice Shop", description: "Practice finding and exploiting vulnerabilities in a safe environment.", type: "exercise", estimatedMinutes: 120, order: 4 },
  ]);

  // Seed modules for Networking track
  await db.insert(trackModulesTable).values([
    { trackId: netTrack.id, title: "OSI & TCP/IP Models", description: "Understand the layered architecture that underpins all networking.", type: "lesson", estimatedMinutes: 60, order: 0 },
    { trackId: netTrack.id, title: "IP Addressing & Subnetting", description: "Master IPv4/IPv6 addressing, subnetting, and CIDR notation.", type: "lesson", estimatedMinutes: 90, order: 1 },
    { trackId: netTrack.id, title: "Routing Protocols (OSPF, EIGRP)", description: "Configure and troubleshoot dynamic routing protocols.", type: "lesson", estimatedMinutes: 120, order: 2 },
    { trackId: netTrack.id, title: "VLANs & Switching", description: "Implement VLANs, trunking, and STP in enterprise environments.", type: "lesson", estimatedMinutes: 90, order: 3 },
    { trackId: netTrack.id, title: "Packet Tracer Lab: Campus Network", description: "Build and configure a complete campus network topology.", type: "exercise", estimatedMinutes: 120, order: 4 },
  ]);

  // Seed modules for Computer Basics
  await db.insert(trackModulesTable).values([
    { trackId: cbTrack.id, title: "Introduction to Computers", description: "Hardware components, operating systems, and how computers work.", type: "lesson", estimatedMinutes: 45, order: 0 },
    { trackId: cbTrack.id, title: "Internet & Email Basics", description: "Browsing safely, email etiquette, and protecting personal information.", type: "lesson", estimatedMinutes: 30, order: 1 },
    { trackId: cbTrack.id, title: "Microsoft Office Essentials", description: "Word processing, spreadsheets, and presentations for productivity.", type: "lesson", estimatedMinutes: 90, order: 2 },
    { trackId: cbTrack.id, title: "Digital Security & Privacy", description: "Passwords, two-factor authentication, and avoiding online scams.", type: "lesson", estimatedMinutes: 45, order: 3 },
  ]);

  console.log("Learning tracks and modules seeded");
  console.log("✓ Seed complete!");
}

seed().catch(e => { console.error(e); process.exit(1); });
