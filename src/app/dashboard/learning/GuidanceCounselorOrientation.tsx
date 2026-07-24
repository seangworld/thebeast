type GuidanceCounselorOrientationProps = {
  memberName: string;
  memberFocus: string;
  direction: string;
  nextStep: string;
};

export default function GuidanceCounselorOrientation({
  memberName,
  memberFocus,
  direction,
  nextStep,
}: GuidanceCounselorOrientationProps) {
  const items = [
    {
      eyebrow: "I know you",
      title: memberName,
      detail: memberFocus,
      accent: "border-violet-300/25 bg-violet-300/[0.07]",
      marker: "bg-violet-300",
    },
    {
      eyebrow: "Where we’re going",
      title: direction,
      detail: "Your current direction stays connected to the roadmap.",
      accent: "border-cyan-300/25 bg-cyan-300/[0.07]",
      marker: "bg-cyan-300",
    },
    {
      eyebrow: "What we should do next",
      title: nextStep,
      detail: "Your Guidance Counselor will adapt after the next saved result.",
      accent: "border-indigo-300/30 bg-indigo-300/[0.09]",
      marker: "bg-indigo-300",
    },
  ];

  return (
    <section
      aria-label="Guidance Counselor orientation"
      className="grid overflow-hidden rounded-2xl border border-white/10 bg-[#111722] shadow-[0_16px_45px_rgba(0,0,0,0.18)] sm:grid-cols-3"
      data-guidance-orientation="true"
    >
      {items.map((item, index) => (
        <article
          key={item.eyebrow}
          className={`relative min-w-0 border-b p-4 transition-colors duration-300 last:border-b-0 sm:border-b-0 sm:border-r sm:p-5 sm:last:border-r-0 ${item.accent}`}
        >
          <span
            className={`absolute left-0 top-0 h-full w-1 ${item.marker}`}
            aria-hidden="true"
          />
          <p className="text-[0.6875rem] font-black uppercase tracking-[0.16em] text-[#aeb8c7]">
            {item.eyebrow}
          </p>
          <h2 className="mt-2 break-words text-base font-black leading-snug text-white sm:text-lg">
            {item.title}
          </h2>
          <p className="mt-2 text-xs leading-5 text-[#aeb8c7] sm:text-sm">
            {item.detail}
          </p>
          <span className="sr-only">Position {index + 1} of 3</span>
        </article>
      ))}
    </section>
  );
}
