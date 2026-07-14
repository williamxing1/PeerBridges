import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  GraduationCap,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Video,
} from "lucide-react";
import styles from "./page.module.css";

const navigation = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "Schedule", icon: CalendarDays },
  { label: "Materials", icon: BookOpen },
  { label: "Messages", icon: MessageSquare },
];

const upcomingClasses = [
  {
    day: "18",
    month: "JUL",
    weekday: "SATURDAY",
    time: "10:00 - 11:00 AM",
    title: "Algebra II",
    topic: "Quadratic Functions",
    tutor: "Maya Patel",
    platform: "Tencent Meeting",
    note: "Bring last week's graphing worksheet.",
    tone: "blue",
  },
  {
    day: "19",
    month: "JUL",
    weekday: "SUNDAY",
    time: "2:30 - 3:30 PM",
    title: "English Writing",
    topic: "Essay Structure",
    tutor: "Daniel Kim",
    platform: "Zoom",
    note: "Draft your introduction paragraph before class.",
    tone: "coral",
  },
];

const assignments = [
  {
    number: "01",
    title: "Quadratics Practice Set",
    description: "Complete problems 1-18 and mark three questions to review.",
    tutor: "Maya Patel",
    assigned: "Jul 12",
    due: "Jul 17, 11:59 PM",
    status: "Due soon",
    progress: 72,
  },
  {
    number: "02",
    title: "Essay Outline Revision",
    description: "Revise the thesis and add two pieces of supporting evidence.",
    tutor: "Daniel Kim",
    assigned: "Jul 10",
    due: "Jul 21, 11:59 PM",
    status: "Assigned",
    progress: 35,
  },
];

const recurringClasses = [
  {
    subject: "Algebra II tutoring",
    tutor: "Maya Patel",
    cadence: "Every Saturday",
    time: "10:00 - 11:00 AM",
    skipped: "No skipped dates",
    days: [false, false, false, false, false, true, false],
  },
  {
    subject: "English writing coaching",
    tutor: "Daniel Kim",
    cadence: "Every Sunday",
    time: "2:30 - 3:30 PM",
    skipped: "Skipped July 26",
    days: [false, false, false, false, false, false, true],
  },
];

const completedClasses = [
  { date: "JUL 11", title: "Geometry", topic: "Similar Triangles", tutor: "Maya Patel" },
  { date: "JUL 06", title: "English Reading", topic: "Theme Analysis", tutor: "Daniel Kim" },
  { date: "JUN 28", title: "Algebra II", topic: "Factoring Review", tutor: "Maya Patel" },
];

function NavItem({ label, icon: Icon, active }: { label: string; icon: LucideIcon; active?: boolean }) {
  return (
    <button className={`${styles.navItem} ${active ? styles.navItemActive : ""}`} type="button">
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

function Eyebrow({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div className={styles.eyebrow}>
      <span>{index}</span>
      <p>{children}</p>
    </div>
  );
}

export default function TestPage() {
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="#" aria-label="PeerBridges home">
          <span className={styles.brandMark}>
            <GraduationCap aria-hidden="true" />
          </span>
          <span>PEER<br />BRIDGES</span>
        </a>

        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {navigation.map((item) => <NavItem key={item.label} {...item} />)}
        </nav>

        <div className={styles.topActions}>
          <button className={styles.iconButton} type="button" aria-label="Search">
            <Search aria-hidden="true" />
          </button>
          <button className={styles.iconButton} type="button" aria-label="Notifications">
            <Bell aria-hidden="true" />
            <span className={styles.notificationDot} />
          </button>
          <button className={styles.profileButton} type="button" aria-label="Open Sophie Chen's profile">
            <span>SC</span>
            <span className={styles.profileText}>Sophie Chen<small>Student</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        {navigation.map((item) => <NavItem key={item.label} {...item} />)}
      </nav>

      <div className={styles.shell}>
        <section className={styles.intro}>
          <div>
            <p className={styles.dateline}>THURSDAY / JULY 16 / 2026</p>
            <h1>Good afternoon,<br /><em>Sophie.</em></h1>
          </div>
          <div className={styles.introAside}>
            <div className={styles.standing}>
              <ShieldCheck aria-hidden="true" />
              <div>
                <span>Account standing</span>
                <strong>0 strikes</strong>
              </div>
            </div>
            <p>Your week is in good shape. One assignment is due before your next class.</p>
          </div>
        </section>

        <section className={styles.commandGrid}>
          <article className={styles.nextSession}>
            <div className={styles.sessionTopline}>
              <span className={styles.livePulse}><i /> NEXT UP</span>
              <span>IN 2 DAYS</span>
            </div>
            <div className={styles.sessionBody}>
              <div className={styles.datePoster}>
                <span>JUL</span>
                <strong>18</strong>
                <small>SATURDAY</small>
              </div>
              <div className={styles.sessionDetails}>
                <p>10:00 - 11:00 AM</p>
                <h2>Quadratic<br />Functions</h2>
                <div className={styles.tutorLine}>
                  <span className={styles.avatarMaya}>MP</span>
                  <div><small>WITH YOUR TUTOR</small><strong>Maya Patel</strong></div>
                </div>
              </div>
            </div>
            <div className={styles.sessionFooter}>
              <div><Video aria-hidden="true" /><span>Tencent Meeting<small>Password: ALG218</small></span></div>
              <button type="button">Open classroom <ArrowRight aria-hidden="true" /></button>
            </div>
          </article>

          <article className={styles.weekPanel}>
            <Eyebrow index="W.29">This week</Eyebrow>
            <div className={styles.weekStats}>
              <div><strong>02</strong><span>Classes<br />scheduled</span></div>
              <div><strong>02</strong><span>Open<br />assignments</span></div>
            </div>
            <div className={styles.weekStrip}>
              {[
                ["M", "13", ""], ["T", "14", ""], ["W", "15", ""], ["T", "16", "today"],
                ["F", "17", "due"], ["S", "18", "class"], ["S", "19", "classCoral"],
              ].map(([day, date, marker]) => (
                <div key={`${day}-${date}`} className={marker ? styles[marker] : ""}>
                  <span>{day}</span><strong>{date}</strong><i />
                </div>
              ))}
            </div>
            <p className={styles.weekNote}><Sparkles aria-hidden="true" /> 4 week learning streak</p>
          </article>

          <article className={styles.feedbackPanel}>
            <div className={styles.feedbackHeader}>
              <Eyebrow index="01">Latest feedback</Eyebrow>
              <div className={styles.stars} aria-label="5 out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden="true" />)}
              </div>
            </div>
            <blockquote>“You’re explaining each step much more clearly. Keep checking the direction of the parabola before choosing your answer.”</blockquote>
            <div className={styles.feedbackMeta}>
              <span className={styles.avatarMaya}>MP</span>
              <p><strong>Maya Patel</strong><small>Geometry · July 11</small></p>
              <button type="button" aria-label="Read full feedback"><ArrowRight aria-hidden="true" /></button>
            </div>
          </article>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <Eyebrow index="02">Upcoming classes</Eyebrow>
            <button type="button">Full schedule <ArrowRight aria-hidden="true" /></button>
          </div>
          <div className={styles.classLedger}>
            {upcomingClasses.map((session) => (
              <article className={styles.classRow} key={session.title}>
                <div className={`${styles.ledgerDate} ${styles[session.tone]}`}>
                  <span>{session.month}</span><strong>{session.day}</strong><small>{session.weekday}</small>
                </div>
                <div className={styles.classSubject}>
                  <span>{session.title}</span>
                  <h3>{session.topic}</h3>
                </div>
                <div className={styles.classInfo}>
                  <span><Clock3 aria-hidden="true" />{session.time}</span>
                  <span><Video aria-hidden="true" />{session.platform}</span>
                </div>
                <div className={styles.classTutor}>
                  <span className={session.tone === "blue" ? styles.avatarMaya : styles.avatarDaniel}>
                    {session.tutor.split(" ").map((name) => name[0]).join("")}
                  </span>
                  <p><small>TUTOR</small>{session.tutor}</p>
                </div>
                <p className={styles.classNote}>{session.note}</p>
                <button className={styles.rowAction} type="button" aria-label={`Open ${session.title}`}><ChevronRight aria-hidden="true" /></button>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.assignmentsSection}`}>
          <div className={styles.sectionHeading}>
            <Eyebrow index="03">Assignments</Eyebrow>
            <p>2 OPEN TASKS / 1 DUE SOON</p>
          </div>
          <div className={styles.assignmentGrid}>
            {assignments.map((assignment) => (
              <article className={styles.assignment} key={assignment.number}>
                <div className={styles.assignmentNumber}>{assignment.number}</div>
                <div className={styles.assignmentMain}>
                  <div className={styles.assignmentTitleLine}>
                    <div><span>{assignment.status}</span><h3>{assignment.title}</h3></div>
                    <button type="button" aria-label="More assignment options"><MoreHorizontal aria-hidden="true" /></button>
                  </div>
                  <p>{assignment.description}</p>
                  <div className={styles.assignmentMeta}>
                    <span>ASSIGNED BY <strong>{assignment.tutor}</strong></span>
                    <span>ASSIGNED <strong>{assignment.assigned}</strong></span>
                    <span>DUE <strong>{assignment.due}</strong></span>
                  </div>
                  <div className={styles.progressLine}>
                    <div><i style={{ width: `${assignment.progress}%` }} /></div>
                    <strong>{assignment.progress}%</strong>
                  </div>
                </div>
                <button className={styles.completeButton} type="button"><Circle aria-hidden="true" /> Mark complete</button>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.rhythmSection}>
          <div className={styles.rhythmIntro}>
            <Eyebrow index="04">Recurring classes</Eyebrow>
            <h2>Your learning<br /><em>rhythm.</em></h2>
            <p>Two weekly sessions keep your learning moving. Changes to repeating classes can be managed from your schedule.</p>
            <button type="button">Manage schedule <ArrowRight aria-hidden="true" /></button>
          </div>
          <div className={styles.rhythmList}>
            <div className={styles.dayLabels}>{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
            {recurringClasses.map((item, index) => (
              <article className={styles.rhythmRow} key={item.subject}>
                <span className={styles.rhythmIndex}>0{index + 1}</span>
                <div className={styles.rhythmTitle}><h3>{item.subject}</h3><p>{item.tutor}</p></div>
                <div className={styles.rhythmDays}>
                  {item.days.map((active, day) => <span key={day} className={active ? styles.rhythmActive : ""}>{active && <Check aria-hidden="true" />}</span>)}
                </div>
                <div className={styles.rhythmTime}><strong>{item.cadence}</strong><span>{item.time}</span></div>
                <span className={styles.skipLabel}>{item.skipped}</span>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.historySection}>
          <div className={styles.historyHeader}>
            <div>
              <Eyebrow index="05">Completed classes</Eyebrow>
              <h2>Recent progress</h2>
            </div>
            <div className={styles.completedTotal}><strong>12</strong><span>CLASSES<br />COMPLETED</span></div>
          </div>
          <div className={styles.historyList}>
            {completedClasses.map((item, index) => (
              <article key={`${item.date}-${item.title}`}>
                <span>{item.date}</span>
                <strong>0{index + 1}</strong>
                <div><h3>{item.title}</h3><p>{item.topic}</p></div>
                <p>{item.tutor}</p>
                <span className={styles.evaluated}><CheckCircle2 aria-hidden="true" /> Evaluation completed</span>
                <button type="button" aria-label={`Open completed class ${item.title}`}><ArrowRight aria-hidden="true" /></button>
              </article>
            ))}
          </div>
        </section>

        <footer className={styles.reminder}>
          <div className={styles.reminderIcon}><Clock3 aria-hidden="true" /></div>
          <div><span>Cancellation reminder</span><p>Cancel before the deadline shown in your schedule to avoid a strike.</p></div>
          <button type="button">View policy <ArrowRight aria-hidden="true" /></button>
        </footer>
      </div>
    </main>
  );
}
