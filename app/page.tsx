import { Edit3, Search, X } from "lucide-react";

const lessons = [
  {
    title: "Level 5 Unit 7 Lesson 2",
    chineseTitle: "伏羲结网",
    date: "Sat, Nov 9 at 07:30pm",
    teacher: "Ivy Wong",
    status: "Teacher has submitted comments"
  },
  {
    title: "Level 5 Unit 7 Lesson 1",
    chineseTitle: "女娲补天",
    date: "Sat, Nov 2 at 05:30pm",
    teacher: "Ivy Wong",
    status: "Teacher has submitted comments"
  }
];

const feedback =
  "今天课前跟乐乐讨论了纪录片里新西兰的教育模式，乐乐说新西兰的教育倡导人与自然和谐相处，任何的教育和活动基本都在户外，在大自然中，自己虽然喜欢但更喜欢美国的环境，因为乐乐觉得未来的机会更多，虽然会有更多竞争。在讨论到德国的高等教育学生可以选择去大学，也可以选择去职业技术学院较学更实践的内容时，乐乐觉得在美国似乎大家更喜欢嘴用大学文凭好的，尤其是好大学的，所以我们由此展开了今天的课堂。";

function Avatar() {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f2d6b5]">
      <div className="relative h-full w-full bg-[radial-gradient(circle_at_50%_34%,#f7d3b7_0_19%,transparent_20%),radial-gradient(circle_at_48%_70%,#272027_0_39%,transparent_40%),linear-gradient(135deg,#f6c646,#f97316)]">
        <div className="absolute left-[14px] top-[17px] h-1.5 w-1.5 rounded-full bg-zinc-900" />
        <div className="absolute right-[14px] top-[17px] h-1.5 w-1.5 rounded-full bg-zinc-900" />
        <div className="absolute left-[17px] top-[25px] h-1 w-3 rounded-full bg-rose-500" />
      </div>
    </div>
  );
}

function Rating({ muted = false }: { muted?: boolean }) {
  return (
    <div className="flex gap-1.5" aria-label="5 star rating">
      {["#ff5447", "#ff7a45", "#ff9f43", "#ffc83d", "#f6df4f"].map((color, index) => (
        <span
          key={color}
          className="text-[22px] leading-none"
          style={{ color: muted ? "#a6a6a6" : color }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function RecentEvaluationCard() {
  return (
    <section className="overflow-hidden rounded-[8px] border border-zinc-100 bg-white shadow-card">
      <div className="flex items-center gap-5 bg-[#f2efff] px-8 py-5">
        <Avatar />
        <div>
          <p className="text-[20px] font-bold text-zinc-800">Sat, Nov 9 at 07:30pm</p>
          <p className="mt-1 text-[16px] text-zinc-600">Unit 7 Lesson 2&nbsp; 伏羲结网</p>
        </div>
      </div>

      <div className="grid gap-7 px-8 py-6 md:grid-cols-[1fr_1.18fr]">
        <div>
          <h2 className="text-[20px] font-bold text-black">Teacher&apos;s Feedback</h2>
          <div className="mt-4">
            <Rating />
          </div>
          <h3 className="mt-7 text-[17px] font-bold text-black">Student&apos;s Performance:</h3>
          <p className="mt-3 max-w-[34rem] text-[15px] leading-5 text-zinc-700">{feedback}</p>
        </div>

        <div className="border-t border-zinc-200 pt-6 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-black">Leave a Comment</h2>
              <p className="mt-2 text-[13px] text-zinc-400">Please give your teacher a 1-5 star rating</p>
            </div>
            <X className="h-4 w-4 text-[#b8addc]" aria-hidden />
          </div>
          <div className="mt-3">
            <Rating muted />
          </div>
          <textarea
            className="mt-2 h-[126px] w-full resize-none rounded-[5px] border border-zinc-300 px-4 py-3 text-[14px] text-zinc-500 outline-none"
            placeholder="What would you like to tell your teacher?"
          />
          <p className="mt-3 text-[12px] text-zinc-400">Rate the difficulty of this lesson:</p>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#2f2c46]">
            {["Easy", "Moderate", "Hard", "Too hard"].map((label) => (
              <label key={label} className="flex items-center gap-1">
                <span className="h-3.5 w-3.5 rounded-full border border-[#b8addc]" />
                {label}
              </label>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-end gap-6">
            <button className="text-[14px] text-[#8c6af7]">Don&apos;t save</button>
            <button className="rounded-full bg-zinc-200 px-9 py-2.5 text-[14px] font-medium text-zinc-400">
              Save Feedback
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SupplementaryCourseCard() {
  return (
    <section className="relative overflow-hidden rounded-[8px] border border-zinc-100 bg-white shadow-card">
      <div className="absolute left-0 top-0 h-full w-2 bg-[#ffd932]" />
      <div className="flex items-center justify-between border-b border-zinc-100 py-3 pl-8 pr-6">
        <h2 className="font-bold text-zinc-700">Supplementary Course</h2>
        <span className="text-[13px] font-bold text-[#f2b400]">PINYIN</span>
      </div>
      <div className="grid grid-cols-2 px-10 py-5 text-center">
        <div>
          <p className="text-[16px] text-zinc-500">Lesson</p>
          <p className="mt-4 text-[48px] font-bold leading-none text-zinc-700">
            0<span className="ml-1 text-[20px] font-normal">/ 8</span>
          </p>
        </div>
        <div>
          <p className="mx-auto max-w-[7rem] text-[16px] leading-4 text-zinc-500">The remaining classes</p>
          <p className="mt-4 text-[48px] font-bold leading-none text-zinc-700">0</p>
        </div>
      </div>
    </section>
  );
}

function LessonCard({ lesson }: { lesson: (typeof lessons)[number] }) {
  return (
    <article className="rounded-[14px] border border-zinc-200 bg-white px-7 py-8 shadow-card md:px-14 md:py-12">
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <h3 className="font-serif text-[29px] font-bold leading-tight text-zinc-700">{lesson.title}</h3>
          <p className="mt-1 font-serif text-[29px] leading-tight text-zinc-700">{lesson.chineseTitle}</p>
          <span className="mt-3 inline-flex rounded-[3px] bg-[#eee9ff] px-3 py-1 font-serif text-[14px] font-bold text-zinc-600">
            Regular Class · 50 Min Session
          </span>
        </div>
        <p className="font-serif text-[16px] text-zinc-500">{lesson.date}</p>
      </div>

      <div className="mt-4 flex flex-col gap-5">
        <div className="flex flex-col justify-between gap-4 rounded-[3px] bg-zinc-100 px-5 py-2.5 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <Avatar />
            <span className="font-serif text-[14px] text-zinc-700">{lesson.teacher}</span>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <p className="font-serif text-[14px] text-zinc-600">{lesson.status}</p>
            <button className="h-10 rounded-full border border-zinc-400 px-11 text-[14px] font-bold text-zinc-700">
              View
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-end gap-5 sm:flex-row">
          <button className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-zinc-400 px-9 text-[14px] font-bold text-zinc-700">
            <Edit3 className="h-5 w-5 text-[#8172b7]" />
            Comment
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-3 rounded-full border border-zinc-400 px-9 text-[14px] font-bold text-zinc-700">
            <Search className="h-5 w-5 text-[#8172b7]" />
            Review
          </button>
        </div>
      </div>
    </article>
  );
}

function PhoneNotice() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 border-t border-zinc-200 py-5 text-center md:flex-row">
      <p className="text-[14px] text-zinc-700">
        In case we need to contact you with updates/class reminders, please add your phone number here!
      </p>
      <button className="rounded-full border border-[#c9c0ec] px-5 py-2 text-[14px] text-zinc-700">
        Add phone number
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <main className="min-h-screen bg-white px-5 py-6 md:px-10 lg:px-14">
      <div className="mx-auto max-w-[1080px]">
        <div className="grid gap-7 lg:grid-cols-[1fr_355px]">
          <RecentEvaluationCard />
          <SupplementaryCourseCard />
        </div>

        <nav className="mt-16 grid grid-cols-3 border-b border-zinc-300 text-center text-[20px]">
          {["Scheduled", "Completed", "Others"].map((tab) => (
            <button
              key={tab}
              className={`relative pb-4 ${tab === "Completed" ? "font-bold text-zinc-700" : "text-zinc-400"}`}
            >
              {tab}
              {tab === "Completed" ? (
                <span className="absolute bottom-0 left-1/2 h-1 w-[145px] -translate-x-1/2 bg-zinc-700" />
              ) : null}
            </button>
          ))}
        </nav>

        <PhoneNotice />

        <section className="space-y-8 pt-7">
          {lessons.map((lesson) => (
            <LessonCard key={lesson.title} lesson={lesson} />
          ))}
        </section>
      </div>
    </main>
  );
}
