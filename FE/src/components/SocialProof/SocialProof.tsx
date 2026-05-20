const PUBLISHERS = [
  'Kodansha Digital',
  'Shonen Creative',
  'Manga Universe',
  'Ink & Panel Co.',
];

const TESTIMONIALS = [
  {
    quote:
      "MangaFlow transformed how we manage our serialization. The collaboration tools are incredible and our team's productivity has doubled.",
    name: 'Yuki Tanaka',
    role: 'Lead Mangaka',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yuki',
  },
  {
    quote:
      'As an assistant, the task queue system is a game changer. I can manage multiple projects without losing track of deadlines.',
    name: 'Alex Chen',
    role: 'Senior Assistant',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex',
  },
  {
    quote:
      'The review workflow makes editorial oversight seamless. We can provide structured feedback directly on the canvas in real time.',
    name: 'Sarah Mitchell',
    role: 'Editorial Director',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
  },
];

function StarRating() {
  return (
    <div className="flex items-center gap-0.5 mb-4 text-neutral-900 text-sm">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className="fa-solid fa-star" />
      ))}
    </div>
  );
}

export default function SocialProof() {
  return (
    <section className="py-12 lg:py-20 bg-neutral-50 border-b border-neutral-200" id="social-proof">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-12">
          <h2 className="text-3xl lg:text-4xl mb-4">Trusted by Leading Publishers</h2>
          <p className="text-lg text-neutral-600">
            Join thousands of creators using MangaFlow
          </p>
        </div>

        {/* Publisher Logos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-8 mb-12 lg:mb-20">
          {PUBLISHERS.map((name) => (
            <div
              key={name}
              className="h-24 bg-white border border-neutral-200 flex items-center justify-center hover:border-neutral-300 hover:shadow-sm transition-all duration-200"
            >
              <div className="text-center">
                <i className="fa-solid fa-building text-3xl text-neutral-400 mb-2 block" />
                <span className="text-xs text-neutral-500">{name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-md md:max-w-none mx-auto">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-neutral-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <StarRating />
              <blockquote className="text-neutral-600 mb-6 leading-relaxed text-[0.9375rem]">
                "{t.quote}"
              </blockquote>
              <div className="flex items-center gap-3">
                <img
                  className="w-10 h-10 rounded-full object-cover bg-neutral-200"
                  src={t.avatar}
                  alt={t.name}
                  loading="lazy"
                />
                <div>
                  <div className="font-medium text-neutral-900 text-sm">
                    {t.name}
                  </div>
                  <div className="text-xs text-neutral-500">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
