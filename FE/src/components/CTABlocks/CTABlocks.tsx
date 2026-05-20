export default function CTABlocks() {
  return (
    <section className="py-12 lg:py-20 border-b border-neutral-200" id="cta-blocks">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 lg:mb-16">
          <h2 className="text-3xl lg:text-4xl mb-4">Choose Your Path</h2>
          <p className="text-lg text-neutral-600">
            Get started with the role that fits you best
          </p>
        </div>

        {/* CTA Cards */}
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 max-w-md lg:max-w-none mx-auto">
          {/* Creator — Dark */}
          <div className="bg-neutral-900 text-white p-8 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white text-neutral-900 flex items-center justify-center mb-6 text-xl">
                <i className="fa-solid fa-crown" />
              </div>
              <h3 className="text-2xl text-white mb-3">I'm a Creator</h3>
              <p className="text-neutral-400 mb-6">
                Start your manga series and build your team
              </p>
              <ul className="flex flex-col gap-2 mb-8">
                {['Unlimited projects', 'Team collaboration', 'Revenue sharing'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-neutral-200">
                    <i className="fa-solid fa-check" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full px-6 py-3 bg-white text-neutral-900 hover:bg-neutral-100 transition-colors font-medium inline-flex items-center justify-center gap-2 text-sm">
                Sign Up as Creator
                <i className="fa-solid fa-arrow-right" />
              </button>
            </div>
          </div>

          {/* Assistant — Outlined + Popular */}
          <div className="border-2 border-neutral-900 bg-white p-8 relative hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="absolute top-4 right-4 px-3 py-1 bg-neutral-900 text-white text-[0.6875rem] font-semibold tracking-wide">
              POPULAR
            </div>
            <div className="w-12 h-12 bg-neutral-900 text-white flex items-center justify-center mb-6 text-xl">
              <i className="fa-solid fa-palette" />
            </div>
            <h3 className="text-2xl mb-3">I'm an Assistant</h3>
            <p className="text-neutral-600 mb-6">
              Find work and grow your portfolio
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {['Browse opportunities', 'Flexible scheduling', 'Skill development'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-neutral-900">
                  <i className="fa-solid fa-check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button className="w-full px-6 py-3 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors font-medium inline-flex items-center justify-center gap-2 text-sm">
              Sign Up as Assistant
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>

          {/* Reader — Light */}
          <div className="bg-white border border-neutral-200 p-8 hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
            <div className="w-12 h-12 bg-neutral-900 text-white flex items-center justify-center mb-6 text-xl">
              <i className="fa-solid fa-book" />
            </div>
            <h3 className="text-2xl mb-3">I'm a Reader</h3>
            <p className="text-neutral-600 mb-6">
              Discover and support amazing manga
            </p>
            <ul className="flex flex-col gap-2 mb-8">
              {['Free to start', 'Early access content', 'Support creators'].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-neutral-900">
                  <i className="fa-solid fa-check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button className="w-full px-6 py-3 border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-50 transition-colors font-medium inline-flex items-center justify-center gap-2 text-sm">
              Start Reading Free
              <i className="fa-solid fa-arrow-right" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
